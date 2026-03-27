const ClassSection = require("../../models/classSection.model");
const ClassEnrollment = require("../../models/classEnrollment.model");
const Waitlist = require("../../models/waitlist.model");
const Subject = require("../../models/subject.model");
const mongoose = require("mongoose");
const curriculumService = require("../../services/curriculum.service");
const paymentValidationService = require("../../services/paymentValidation.service");
const repo = require("./autoEnrollment.repository");
const classSectionService = require("../classSection/classSection.service");

// DEBUG: bật=true để trace, tắt=false khi hoàn thiện
const _DEBUG_SVC = false;
function _svc(...a) { if (_DEBUG_SVC) console.log('[Service]', ...a); }

// Service này là "bộ não" của chức năng auto-enrollment.
// Nhiệm vụ chính:
// 1. Tìm sinh viên đủ điều kiện trong học kỳ
// 2. Xác định curriculum và curriculum semester tương ứng của từng sinh viên
// 3. Lấy danh sách môn cần học ở kỳ đó
// 4. Chọn class section còn chỗ
// 5. Tạo enrollment hoặc đưa vào waitlist nếu hết chỗ
//
// Cách đọc file:
// - Nhóm helper đầu file: chuẩn hóa dữ liệu, cache, tạo key, gom state trong RAM
// - Các hàm giữa file: thao tác enrollment/waitlist cho từng trường hợp nhỏ
// - triggerAutoEnrollment: luồng batch chính cho admin chạy cả đợt
//
// Mặc định chỉ lớp đã công bố / đã xếp lịch — lớp Nháp (draft) không vào pool nên SV sẽ bị đẩy waitlist.
// Bật AUTO_ENROLLMENT_INCLUDE_DRAFT=true nếu cần xếp thử vào lớp nháp (dev / quy trình nội bộ).
const OPEN_CLASS_STATUSES =
  process.env.AUTO_ENROLLMENT_INCLUDE_DRAFT === "true"
    ? ["published", "scheduled", "draft"]
    : ["published", "scheduled"];
/** Trạng thái được phép làm «lớp mẫu» copy môn/GV (khác pool chỉ published/scheduled). */
const TEMPLATE_SOURCE_CLASS_STATUSES = new Set([
  "draft",
  "scheduled",
  "published",
  "locked",
]);
const ACTIVE_ENROLLMENT_STATUSES = new Set(repo.ACTIVE_ENROLLMENT_STATUSES);
const LEGACY_WAITLIST_INDEX_NAME = "student_1_subject_1_status_1";

// Khóa tổng hợp student + subject để kiểm tra nhanh:
// - sinh viên đã có waitlist cho môn này chưa
// - tránh tạo trùng trong cùng một batch xử lý
function buildStudentSubjectKey(studentId, subjectId) {
  return `${String(studentId)}:${String(subjectId)}`;
}

// Khóa cache curriculum + semesterOrder để tái sử dụng kết quả lấy môn theo kỳ.
function buildCurriculumSemesterKey(curriculumId, semesterOrder) {
  return `${String(curriculumId)}:${semesterOrder}`;
}

// Cùng một major có thể được lưu dưới nhiều dạng như:
// - majorCode: SE
// - majorName: Software Engineering
// Hàm này gom alias để tăng khả năng match curriculum đúng theo major.
function buildMajorAliasesByCode(majorCodes = [], majors = []) {
  const aliasesByCode = new Map();

  for (const majorCode of majorCodes) {
    const normalizedMajorCode = String(majorCode || "")
      .trim()
      .toUpperCase();
    if (!normalizedMajorCode) continue;
    aliasesByCode.set(normalizedMajorCode, [normalizedMajorCode]);
  }

  for (const major of majors) {
    const majorCode = String(major.majorCode || "")
      .trim()
      .toUpperCase();
    if (!majorCode) continue;

    const aliases = new Set(aliasesByCode.get(majorCode) || [majorCode]);
    if (major.majorName) {
      aliases.add(String(major.majorName).trim().toUpperCase());
    }

    aliasesByCode.set(majorCode, Array.from(aliases));
  }

  return aliasesByCode;
}

// Dựng "trạng thái tạm" của từng sinh viên trong bộ nhớ từ enrollment đã có sẵn.
// activeSubjectIds:
// - các môn sinh viên đang học / đã hoàn tất trong tập lớp đang xét
// occupiedClassSectionIds:
// - các class section sinh viên đã chiếm chỗ, dùng để tránh gán trùng lớp
/**
 * Dựng trạng thái tạm của từng sinh viên từ enrollment đã có sẵn.
 *
 * Ý tưởng:
 * - activeSubjectIds: tập các môn mà sinh viên đã có trong kỳ này
 * - occupiedClassSectionIds: tập các lớp mà sinh viên đang chiếm chỗ
 *
 * Mục tiêu:
 * - chống tạo enrollment trùng
 * - giúp các bước sau chỉ cần đọc Set trong RAM, không phải query DB liên tục
 */
function buildStudentStateMap(existingEnrollments, classSectionsById) {
  const stateByStudent = new Map();

  for (const enrollment of existingEnrollments) {
    const studentId = String(enrollment.student);
    if (!stateByStudent.has(studentId)) {
      stateByStudent.set(studentId, {
        activeSubjectIds: new Set(),
        occupiedClassSectionIds: new Set(),
      });
    }

    const state = stateByStudent.get(studentId);
    const classSectionId = String(enrollment.classSection);
    const classSection = classSectionsById.get(classSectionId);

    // Chỉ cần sinh viên đã từng chiếm lớp này thì đánh dấu là occupied ngay.
    // Tập này giúp bước chọn lớp không gán sinh viên vào cùng một class section thêm lần nữa.
    state.occupiedClassSectionIds.add(classSectionId);
    if (!classSection) continue;

    if (ACTIVE_ENROLLMENT_STATUSES.has(enrollment.status)) {
      // activeSubjectIds là tập môn đang "có hiệu lực" với sinh viên trong kỳ.
      // Nếu subject đã nằm trong tập này thì các bước sau sẽ skip để tránh duplicate theo môn.
      state.activeSubjectIds.add(String(classSection.subject));
    }
  }

  return stateByStudent;
}

// Trong batch, có sinh viên lúc đầu chưa có state sẵn.
// Hàm này bảo đảm mọi sinh viên đều có một state object thống nhất để cập nhật trong RAM.
/**
 * Lấy state của sinh viên nếu đã có, nếu chưa có thì tạo mới.
 *
 * Đây là helper nhỏ nhưng cần thiết vì trong batch có sinh viên:
 * - đã có enrollment từ trước
 * - hoặc hoàn toàn chưa có state nào
 *
 * Dùng helper này giúp shape state luôn thống nhất ở mọi nơi.
 */
function getOrCreateStudentState(stateByStudent, studentId) {
  const key = String(studentId);
  if (!stateByStudent.has(key)) {
    stateByStudent.set(key, {
      activeSubjectIds: new Set(),
      occupiedClassSectionIds: new Set(),
    });
  }

  return stateByStudent.get(key);
}

// Chuyển danh sách class section từ DB thành 2 cấu trúc lookup:
// - classSectionsById: truy cập nhanh theo id
// - classSectionsBySubject: lấy toàn bộ lớp mở của một môn
// Đồng thời ép currentEnrollment/maxCapacity về number để so sánh an toàn.
/**
 * Tiền xử lý danh sách class section thành 2 bảng tra cứu nhanh.
 *
 * classSectionsById:
 * - tra từ classSectionId sang object lớp tương ứng
 *
 * classSectionsBySubject:
 * - gom tất cả lớp mở của cùng một subject vào một mảng
 *
 * Vì sao cần làm vậy:
 * - triggerAutoEnrollment phải tìm lớp cho rất nhiều subject
 * - nếu mỗi lần đều lặp qua cả mảng classSections sẽ rất tốn
 * - dựng lookup một lần giúp phần còn lại chỉ đọc Map trong RAM
 */
function buildClassSectionPools(classSections) {
  const classSectionsById = new Map();
  const classSectionsBySubject = new Map();
  // Thêm: Gom theo classGroup để auto-enrollment ưu tiên đúng nhóm
  const classSectionsByGroup = new Map();

  for (const classSection of classSections) {
    const normalized = {
      ...classSection,
      currentEnrollment: Number(classSection.currentEnrollment || 0),
      maxCapacity: Number(classSection.maxCapacity || 0),
    };

    const classSectionId = String(normalized._id);
    const subjectId = String(normalized.subject);
    const classGroup = normalized.classGroup || null;

    // Lưu theo classSectionId để khi đã biết id lớp thì lấy object ra ngay.
    classSectionsById.set(classSectionId, normalized);

    // Nếu subject này chưa có "rổ lớp" thì tạo mảng rỗng trước.
    if (!classSectionsBySubject.has(subjectId)) {
      classSectionsBySubject.set(subjectId, []);
    }
    classSectionsBySubject.get(subjectId).push(normalized);

    // Gom theo classGroup (VD: "SE1808-01")
    if (classGroup) {
      if (!classSectionsByGroup.has(classGroup)) {
        classSectionsByGroup.set(classGroup, new Map());
      }
      if (!classSectionsByGroup.get(classGroup).has(subjectId)) {
        classSectionsByGroup.get(classGroup).set(subjectId, []);
      }
      classSectionsByGroup.get(classGroup).get(subjectId).push(normalized);
    }
  }

  return {
    classSectionsById,
    classSectionsBySubject,
    classSectionsByGroup,
  };
}

// Service vẫn tự normalize code list để tự bảo vệ mình ngay cả khi
// được gọi từ script/hook khác chứ không đi qua controller.
function normalizeCodeList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) =>
          String(value || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
}

// Giới hạn số lượng student xử lý theo batch phải là số nguyên dương.
// Giá trị sai định dạng sẽ bị bỏ qua thay vì làm hỏng luồng xử lý.
function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function generateUniqueSplitClassCode(baseCode) {
  const base = String(baseCode || "CLASS")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 36);
  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = `${Date.now().toString(36)}${attempt.toString(36)}`;
    const code = `${base}-NS${suffix}`.slice(0, 80);
    const exists = await ClassSection.findOne({ classCode: code })
      .select("_id")
      .lean();
    if (!exists) return code;
  }
  const e = new Error("Không tạo được mã lớp duy nhất");
  e.statusCode = 500;
  throw e;
}

/**
 * Chọn một lớp học phần mẫu cùng nhóm để copy môn + GV (và fallback sĩ số).
 */
function pickTemplateClassSection({
  classSections,
  classGroup,
  enrollmentMode,
  curriculumIdFilter,
  sectionSemester,
  sectionAcademicYear,
  curriculumSemesterOrderVal,
}) {
  const cg = String(classGroup || "").trim();
  const pool = (classSections || []).filter(
    (cs) => String(cs.classGroup || "").trim() === cg,
  );
  const open = pool.filter((cs) =>
    TEMPLATE_SOURCE_CLASS_STATUSES.has(String(cs.status || "")),
  );
  let filtered = open;

  if (
    enrollmentMode === "normal" &&
    curriculumIdFilter &&
    curriculumSemesterOrderVal != null
  ) {
    filtered = open.filter((cs) => {
      if (cs.curriculumSemesterOrder == null) return false;
      if (
        Number(cs.curriculumSemesterOrder) !==
        Number(curriculumSemesterOrderVal)
      ) {
        return false;
      }
      if (!cs.curriculum) return true;
      return String(cs.curriculum) === String(curriculumIdFilter);
    });
    if (filtered.length === 0) {
      filtered = open.filter(
        (cs) =>
          cs.curriculumSemesterOrder != null &&
          Number(cs.curriculumSemesterOrder) ===
            Number(curriculumSemesterOrderVal),
      );
    }
    // Dữ liệu cũ/seed: chỉ có ClassSection.semester = kỳ trong khung, chưa ghi curriculumSemesterOrder
    if (filtered.length === 0) {
      filtered = open.filter(
        (cs) =>
          Number(cs.semester) === Number(sectionSemester) &&
          String(cs.academicYear || "").trim() ===
            String(sectionAcademicYear || "").trim(),
      );
    }
    // Cuối cùng: cùng niên khóa khung trên lớp (vẫn cùng nhóm)
    if (filtered.length === 0 && sectionAcademicYear) {
      filtered = open.filter(
        (cs) =>
          String(cs.academicYear || "").trim() ===
          String(sectionAcademicYear || "").trim(),
      );
    }
  } else {
    filtered = open.filter(
      (cs) =>
        Number(cs.semester) === Number(sectionSemester) &&
        String(cs.academicYear || "").trim() ===
          String(sectionAcademicYear || "").trim(),
    );
  }

  const withSubjectTeacher = filtered.filter(
    (cs) =>
      cs.subject &&
      mongoose.Types.ObjectId.isValid(String(cs.subject)) &&
      cs.teacher &&
      mongoose.Types.ObjectId.isValid(String(cs.teacher)),
  );
  const candidates =
    withSubjectTeacher.length > 0 ? withSubjectTeacher : filtered;
  if (candidates.length === 0) return null;
  candidates.sort((a, b) =>
    String(a.classCode || "").localeCompare(String(b.classCode || ""), undefined, {
      numeric: true,
    }),
  );
  return candidates[0];
}

async function buildTemplateClassSectionPool(ctx, classGroup) {
  const cg = String(classGroup || "").trim();
  if (!cg) {
    return Array.isArray(ctx.classSections) ? ctx.classSections : [];
  }
  const base = Array.isArray(ctx.classSections) ? ctx.classSections : [];
  const extra = await repo.findClassSectionsByGroupForTemplate(cg);
  const map = new Map();
  for (const c of base) {
    map.set(String(c._id), c);
  }
  for (const c of extra) {
    map.set(String(c._id), c);
  }
  return Array.from(map.values());
}

/**
 * Cùng quy tắc semester / academicYear như tạo lớp từ nhóm (createClassSectionAndAssignStudents).
 * `curriculumSemesterOrderRaw`: bắt buộc khi normal + có khung CT (số kỳ trong CT).
 */
function resolveSectionPeriodForGroupTemplate(ctx, curriculumSemesterOrderRaw) {
  const enrollmentMode = ctx.enrollmentMode;
  const sem = ctx.semester;
  const curriculumIdFilter = ctx.curriculumIdFilter;

  let sectionSemester;
  let sectionAcademicYear;
  let curriculumSemesterOrderVal;

  if (enrollmentMode === "retake" || !curriculumIdFilter) {
    sectionSemester = Number(sem.semesterNum);
    sectionAcademicYear = String(sem.academicYear || "").trim();
    if (!sectionAcademicYear || Number.isNaN(sectionSemester)) {
      return null;
    }
    const o = Number(curriculumSemesterOrderRaw);
    if (Number.isInteger(o) && o >= 1) {
      curriculumSemesterOrderVal = o;
    }
    return { sectionSemester, sectionAcademicYear, curriculumSemesterOrderVal };
  }

  const cur = ctx.activeCurriculums.find(
    (c) => String(c._id) === String(curriculumIdFilter),
  );
  if (!cur) {
    return null;
  }
  const o = Number(curriculumSemesterOrderRaw);
  if (!Number.isInteger(o) || o < 1) {
    return null;
  }
  curriculumSemesterOrderVal = o;
  sectionSemester = o;
  sectionAcademicYear = String(cur.academicYear || "").trim();
  if (!sectionAcademicYear) {
    return null;
  }
  return { sectionSemester, sectionAcademicYear, curriculumSemesterOrderVal };
}

// Lấy classGroup từ student.
// student.classSection có thể là:
// - "SE1808-01" → classGroup = "SE1808-01"
// - "SE1808" → trả về null để không ép khớp (tránh gán nhầm lớp khi DB còn section chưa có classGroup)
function getStudentClassGroup(student) {
  if (!student?.classSection) return null;
  const classSection = String(student.classSection).trim();
  // Nếu đã có định dạng "SE1808-01" thì dùng trực tiếp
  if (classSection.includes("-")) return classSection;
  // Nếu chỉ có prefix như "SE1808", trả về null để fallback
  return null;
}

// Utility cộng dồn trong Map.
// Dùng cho classSectionIncrementMap để cuối batch ghi tăng currentEnrollment một lần.
function incrementMapCounter(map, key, amount = 1) {
  const normalizedKey = String(key);
  map.set(normalizedKey, Number(map.get(normalizedKey) || 0) + amount);
}

// Cache curriculum match theo majorCode + enrollmentYear.
// Nhiều sinh viên cùng khóa/ngành thường dùng chung curriculum, nên cache này giúp giảm tính toán lặp.
function buildCurriculumMatchCacheKey(student) {
  return [
    String(student?.majorCode || "")
      .trim()
      .toUpperCase() || "N/A",
    curriculumService.resolveStudentEnrollmentYear(student) ?? "N/A",
  ].join(":");
}

// Tìm curriculum phù hợp cho sinh viên, có cache để nhiều sinh viên cùng profile không phải resolve lại.
/**
 * Tìm curriculum phù hợp cho sinh viên, có cache để tránh tính lặp.
 *
 * Nhiều sinh viên cùng major + enrollmentYear thường dùng chung curriculum,
 * nên cache ở đây giúp giảm số lần resolve curriculum giống nhau.
 */
async function getCurriculumMatchCached(cache, student, options) {
  const cacheKey = buildCurriculumMatchCacheKey(student);
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      curriculumService.getCurriculumMatchForStudent(student, options),
    );
  }

  return cache.get(cacheKey);
}

function addAcademicYear(target, academicYear) {
  const normalizedAcademicYear = String(academicYear || '').trim();
  if (normalizedAcademicYear) {
    target.add(normalizedAcademicYear);
  }
}

function buildCurriculumsById(curriculums = []) {
  const map = new Map();
  for (const curriculum of curriculums) {
    if (curriculum?._id) {
      map.set(String(curriculum._id), curriculum);
    }
  }
  return map;
}

async function resolveNormalModeAcademicYears({
  semester,
  candidateStudents,
  curriculumIdFilter,
  activeCurriculums,
  curriculumLookup,
  majorAliasesByCode,
}) {
  const academicYears = new Set();
  addAcademicYear(academicYears, semester?.academicYear);

  const curriculumsById = buildCurriculumsById(activeCurriculums);
  if (curriculumIdFilter) {
    addAcademicYear(
      academicYears,
      curriculumsById.get(String(curriculumIdFilter))?.academicYear,
    );
  }

  if (!Array.isArray(candidateStudents) || candidateStudents.length === 0) {
    return Array.from(academicYears);
  }

  const curriculumMatchCache = new Map();
  const majorIdCache = new Map();

  for (const student of candidateStudents) {
    const directCurriculum = curriculumsById.get(String(student?.curriculumId || ''));
    if (directCurriculum?.academicYear) {
      addAcademicYear(academicYears, directCurriculum.academicYear);
      continue;
    }

    const curriculumMatch = await getCurriculumMatchCached(
      curriculumMatchCache,
      student,
      {
        curriculumLookup,
        majorAliasesByCode,
        allowSingleCurriculumFallback: true,
        majorIdCache,
      },
    );

    addAcademicYear(academicYears, curriculumMatch?.curriculum?.academicYear);
  }

  return Array.from(academicYears);
}

// Xác định sinh viên đang thuộc curriculum semester nào ở thời điểm chạy batch.
// Ưu tiên lấy từ hồ sơ student nếu trường currentCurriculumSemester đã được set.
// Nếu chưa có, hệ thống tính động dựa trên năm nhập học và học kỳ hiện tại.
/**
 * Xác định sinh viên đang ở curriculum semester số mấy.
 *
 * Thứ tự ưu tiên:
 * 1. Nếu student đã có currentCurriculumSemester thì dùng luôn
 * 2. Nếu chưa có thì tính từ enrollmentYear + semester hiện tại + termsPerYear
 *
 * Bước này cực quan trọng vì nó quyết định sẽ lấy môn của kỳ nào trong curriculum.
 */
async function getCurriculumSemesterOrderCached(
  cache,
  student,
  semester,
  options,
) {
  const enrollmentYear =
    curriculumService.resolveStudentEnrollmentYear(student);
  const cacheKey = `${student._id}:${enrollmentYear ?? "N/A"}:${semester?.semesterNum}:${semester?.academicYear}:${options?.termsPerYear}`;
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      paymentValidationService.resolveDisplayedCurriculumSemester(student, {
        currentSystemSemester: semester,
        ...options,
      }),
    );
  }

  return cache.get(cacheKey);
}

// Kiểm tra xem sinh viên đã hoàn thành TẤT CẢ môn của curriculum semester hiện tại chưa.
// Nếu đã có enrollment cho MỌI môn trong kỳ thì coi như "không còn gì để xếp".
async function checkStudentHasUnenrolledSubjects(
  student,
  studentStateMap,
  curriculumLookup,
  semester,
  termsPerYear,
  curriculumSemesterSubjectsCache,
) {
  const enrollmentYear =
    curriculumService.resolveStudentEnrollmentYear(student);
  if (!enrollmentYear)
    return { hasUnenrolled: true, reason: "missingEnrollmentYear" };

  const curriculumKey = String(student.curriculumId || "");
  if (!mongoose.Types.ObjectId.isValid(curriculumKey))
    return { hasUnenrolled: true, reason: "missingCurriculumId" };

  const curriculum = curriculumLookup.get(curriculumKey);
  if (!curriculum) return { hasUnenrolled: true, reason: "noCurriculumMatch" };

  const curriculumSemesterOrder =
    await paymentValidationService.resolveDisplayedCurriculumSemester(student, {
      currentSystemSemester: semester,
      termsPerYear,
    });
  if (curriculumSemesterOrder == null)
    return { hasUnenrolled: true, reason: "noSemesterOrder" };

  const semesterSubjects = await getCurriculumSemesterSubjectsCached(
    curriculumSemesterSubjectsCache,
    curriculum._id,
    curriculumSemesterOrder,
  );
  if (!semesterSubjects?.length)
    return { hasUnenrolled: false, reason: "noSubjectsInSemester" };

  const studentState = studentStateMap.get(String(student._id));
  const activeIds = studentState?.activeSubjectIds ?? new Set();
  const allEnrolled = semesterSubjects.every((s) =>
    activeIds.has(String(s.subject?._id ?? s._id)),
  );
  return {
    hasUnenrolled: !allEnrolled,
    reason: allEnrolled ? "allSubjectsEnrolled" : "someSubjectsPending",
  };
}

// Gom waitlist vào bộ nhớ đệm của batch, chưa ghi DB ngay.
// Cách làm này giúp:
// - chống tạo waitlist trùng trong cùng lượt chạy
// - bulk upsert cuối batch nhanh hơn và ổn định hơn
/**
 * Đưa waitlist vào bộ nhớ tạm của batch, chưa ghi DB ngay.
 *
 * Vì sao không create trực tiếp:
 * - batch có thể phát sinh nhiều waitlist liên tiếp
 * - ghi từng bản ghi một sẽ chậm hơn và khó kiểm soát duplicate
 * - gom vào pendingWaitlistDocs để cuối batch bulk upsert sẽ ổn định hơn
 *
 * waitlistSet có nhiệm vụ chống trùng student + subject trong chính lần chạy này.
 */
function queueWaitlistIfNeeded(
  studentId,
  subjectId,
  semesterNum,
  academicYear,
  reason,
  options = {},
) {
  const waitKey = buildStudentSubjectKey(studentId, subjectId);
  if (options.waitlistSet?.has(waitKey)) {
    return {
      success: true,
      created: false,
      reason: "already_waiting",
      message: "Student is already in waitlist for this subject",
    };
  }

  options.waitlistSet?.add(waitKey);
  if (Array.isArray(options.pendingWaitlistDocs)) {
    // Chưa create DB ở đây; chỉ gom document để cuối batch bulk upsert.
    options.pendingWaitlistDocs.push({
      student: studentId,
      subject: subjectId,
      targetSemester: semesterNum,
      targetAcademicYear: academicYear,
      status: "WAITING",
      cancelReason: reason || undefined,
    });
  }

  return {
    success: true,
    created: true,
    message:
      options.dryRun === true
        ? "Dry run: waitlist would be created"
        : "Queued waitlist for persistence",
  };
}

// Tạo object mô tả phạm vi batch để trả về cho FE/log.
function buildFilterSummary({
  majorCodes,
  studentCodes,
  limit,
  onlyStudentsWithoutEnrollments,
  excludeStudentsAlreadyAssignedInSemester,
  enrollmentMode,
  curriculumId,
  classGroup,
}) {
  return {
    majorCodes,
    studentCodes,
    limit,
    onlyStudentsWithoutEnrollments,
    excludeStudentsAlreadyAssignedInSemester:
      excludeStudentsAlreadyAssignedInSemester === true,
    enrollmentMode,
    curriculumId: curriculumId || null,
    classGroup: classGroup || null,
  };
}

// Thứ tự ưu tiên khi chọn lớp cho 1 môn trong auto-enrollment:
// 1. Chỉ xét các class section thuộc đúng subject đang cần xếp
// 2. Bỏ qua lớp mà sinh viên đã chiếm chỗ rồi
// 3. Bỏ qua lớp đã đầy
// 4. Trong các lớp còn lại, ưu tiên lớp có currentEnrollment nhỏ hơn để cân tải
// 5. Nếu bằng nhau thì ưu tiên classCode nhỏ hơn để kết quả ổn định, dễ demo/debug
//
// Đây là kiểu "greedy selection":
// - hệ thống chọn ngay lớp tốt nhất tại thời điểm hiện tại
// - không quay lui
// - không tối ưu toàn cục cho cả batch
// Chọn lớp phù hợp nhất cho một môn theo rule hiện tại:
// - sinh viên chưa chiếm lớp đó
// - lớp chưa đầy
// - ưu tiên lớp có ít sinh viên hơn để phân tải đều
// - nếu bằng nhau thì lấy classCode nhỏ hơn để kết quả ổn định, dễ debug
/**
 * Chọn lớp phù hợp nhất cho một subject theo rule hiện tại.
 * Priority:
 * 1. Ưu tiên lớp cùng semester (curriculum) + classGroup với sinh viên
 * 2. Ưu tiên lớp ít người nhất (cân bằng tải)
 * 3. Nếu bằng nhau thì so classCode để giữ kết quả ổn định
 *
 * @param {string} subjectId - ID của môn học
 * @param {Map} classSectionsBySubject - Pool lớp theo subject
 * @param {Set} occupiedClassSectionIds - Các lớp SV đã chiếm
 * @param {string} studentClassGroup - classGroup của SV (VD: "SE1808-01")
 * @param {number} curriculumSemesterOrder - Kỳ trong khung CT (1, 2, 3...)
 */
function isBetterClassSectionCandidate(currentBest, candidate) {
  if (!currentBest) {
    return true;
  }
  const cap = Number(candidate.currentEnrollment) || 0;
  const bestCap = Number(currentBest.currentEnrollment) || 0;
  if (cap !== bestCap) {
    return cap < bestCap;
  }
  return (
    String(candidate.classCode || "").localeCompare(
      String(currentBest.classCode || ""),
    ) < 0
  );
}

function pickAvailableClassSection(
  subjectId,
  classSectionsBySubject,
  occupiedClassSectionIds,
  studentClassGroup,
  curriculumSemesterOrder,
) {
  const subjectKey = String(subjectId);
  const pool = classSectionsBySubject.get(subjectKey) || [];
  let bestAnyGroup = null;
  let bestMatchingGroup = null;

  for (const classSection of pool) {
    // Skip: SV đã có enrollment cho lớp này
    if (occupiedClassSectionIds?.has(String(classSection._id))) {
      continue;
    }
    // Skip: lớp đầy
    if (classSection.currentEnrollment >= classSection.maxCapacity) {
      continue;
    }

    // ✅ Khớp curriculumSemesterOrder — dùng trường mới trên ClassSection
    if (curriculumSemesterOrder != null) {
      const clsCurriculumOrder = classSection.curriculumSemesterOrder;
      if (clsCurriculumOrder != null && clsCurriculumOrder !== curriculumSemesterOrder) {
        continue;
      }
    }

    const matchesGroup =
      !studentClassGroup || classSection.classGroup === studentClassGroup;

    if (isBetterClassSectionCandidate(bestAnyGroup, classSection)) {
      bestAnyGroup = classSection;
    }
    if (
      matchesGroup &&
      isBetterClassSectionCandidate(bestMatchingGroup, classSection)
    ) {
      bestMatchingGroup = classSection;
    }
  }

  // Ưu tiên lớp đúng classGroup; trong tập đó chọn lớp ít SV nhất (trước đây lấy lớp đầu tiên trong pool → cả nhóm dồn một lớp, lớp published thứ 2 luôn 0).
  return bestMatchingGroup || bestAnyGroup;
}

// Chuẩn hóa cách đọc số bản ghi upserted vì shape kết quả bulkWrite thay đổi theo driver/version.
function getBulkWriteUpsertedCount(result) {
  if (!result) return 0;
  if (typeof result.upsertedCount === "number") return result.upsertedCount;
  if (typeof result.nUpserted === "number") return result.nUpserted;
  if (typeof result.result?.nUpserted === "number")
    return result.result.nUpserted;
  if (Array.isArray(result.result?.upserted))
    return result.result.upserted.length;
  if (result.upsertedIds && typeof result.upsertedIds === "object") {
    return Object.keys(result.upsertedIds).length;
  }
  return 0;
}

// Biến lỗi kỹ thuật khi ghi batch thành thông báo dễ hiểu hơn cho admin/dev.
function formatAutoEnrollmentPersistenceError(error) {
  if (
    error?.code === 11000 &&
    /waitlists/i.test(String(error?.message || "")) &&
    String(error?.message || "").includes(LEGACY_WAITLIST_INDEX_NAME)
  ) {
    return new Error(
      `Failed to persist auto enrollment batch: outdated waitlist index ${LEGACY_WAITLIST_INDEX_NAME}. ` +
        "Run npm run fix:waitlist-indexes to allow one WAITING waitlist per student, subject, and semester.",
    );
  }

  return new Error(`Failed to persist auto enrollment batch: ${error.message}`);
}

// Sinh câu lỗi chi tiết để biết sinh viên fail do thiếu dữ liệu hay do chưa cấu hình curriculum.
function formatCurriculumError(match, student) {
  const majorCode = match?.majorCode || student?.majorCode || "N/A";
  const cohort = student?.cohort ?? "N/A";
  const enrollmentYear =
    match?.enrollmentYear ?? student?.enrollmentYear ?? "N/A";
  const availableCurriculums = match?.availableCurriculumCodes?.length
    ? match.availableCurriculumCodes.join(", ")
    : "none";

  switch (match?.reason) {
    case "missing_major_code":
      return `Missing majorCode; cannot resolve curriculum (studentCode=${student?.studentCode || "N/A"})`;
    case "missing_enrollment_year":
      return `Missing enrollmentYear; cannot select curriculum (majorCode=${majorCode}, cohort=${cohort}, availableCurriculums=${availableCurriculums})`;
    case "no_active_curriculum_for_major":
      return `No active curriculum configured for major ${majorCode} (cohort=${cohort}, enrollmentYear=${enrollmentYear})`;
    case "no_curriculum_for_enrollment_year":
      return `No curriculum matches enrollmentYear ${enrollmentYear} for major ${majorCode} (availableCurriculums=${availableCurriculums})`;
    default:
      return `Curriculum not found (majorCode=${majorCode}, enrollmentYear=${enrollmentYear}, cohort=${cohort})`;
  }
}

// Preflight là phần tổng quan để biết dữ liệu nền có đủ sạch để chạy batch hay không.
// Nó không trực tiếp xếp lớp, nhưng rất hữu ích cho dashboard và kiểm tra cấu hình.
/**
 * Tạo phần tổng quan/preflight cho lần chạy batch.
 *
 * Hàm này không trực tiếp enroll ai.
 * Nó chỉ giúp admin hiểu dữ liệu nền đang ổn hay có vấn đề cấu hình:
 * - thiếu curriculum
 * - thiếu enrollmentYear
 * - curriculum-course mất linked subject
 * - học kỳ được chọn không có lớp mở
 */
function buildPreflightSummary({
  students,
  candidateStudentCount,
  semester,
  termsPerYear,
  activeCurriculums,
  classSections,
  studentsWithoutCurriculumByMajor,
  studentsWithoutCurriculumByReason,
  studentsMissingEnrollmentYear,
  curriculumSubjectMappingIssues,
  excludedAlreadyAssignedInSemester,
  dryRun,
  filters,
}) {
  const warnings = [];

  if (activeCurriculums.length === 0) {
    warnings.push("No active curriculum exists in the database.");
  }
  if (studentsMissingEnrollmentYear > 0) {
    warnings.push(
      `${studentsMissingEnrollmentYear} active students are missing enrollmentYear.`,
    );
  }
  if (Object.keys(studentsWithoutCurriculumByMajor).length > 0) {
    warnings.push(
      "Some student majors do not have a matching active curriculum.",
    );
  }
  if (curriculumSubjectMappingIssues > 0) {
    warnings.push(
      `${curriculumSubjectMappingIssues} curriculum-course records are missing linked subject data.`,
    );
  }
  if (classSections.length === 0) {
    warnings.push(
      `No open class sections found for semester ${semester.code}.`,
    );
  }

  return {
    dryRun,
    candidateStudentCount,
    termsPerYear,
    activeCurriculumCount: activeCurriculums.length,
    activeCurriculums: activeCurriculums.map((curriculum) => ({
      id: curriculum._id,
      code: curriculum.code,
      name: curriculum.name,
      major: curriculum.major,
      academicYear: curriculum.academicYear,
    })),
    activeStudentCount: students.length,
    openClassSectionCount: classSections.length,
    openClassSubjectCount: new Set(
      classSections.map((classSection) => String(classSection.subject)),
    ).size,
    studentsMissingEnrollmentYear,
    studentsWithoutCurriculumByMajor,
    studentsWithoutCurriculumByReason,
    curriculumSubjectMappingIssues,
    excludedAlreadyAssignedInSemester:
      Number(excludedAlreadyAssignedInSemester) || 0,
    filters,
    warnings,
  };
}

// Cache môn học của từng curriculum semester để giảm query lặp cho nhiều sinh viên giống nhau.
/**
 * Lấy danh sách môn của một curriculum semester, có cache.
 *
 * Nhiều sinh viên có thể cùng học chung một curriculum và cùng curriculum semester,
 * nên nếu không cache thì sẽ query cùng một dữ liệu rất nhiều lần.
 */
async function getCurriculumSemesterSubjectsCached(
  cache,
  curriculumId,
  curriculumSemesterOrder,
) {
  const cacheKey = buildCurriculumSemesterKey(
    curriculumId,
    curriculumSemesterOrder,
  );
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      curriculumService.getSubjectsBySemester(
        curriculumId,
        curriculumSemesterOrder,
      ),
    );
  }

  return cache.get(cacheKey);
}

// Hàm nhỏ dùng cho luồng đơn lẻ: tìm một lớp còn chỗ cho một subject trong học kỳ hiện tại.
// Khác với triggerAutoEnrollment, hàm này query trực tiếp DB thay vì dùng pool trong RAM.
async function findAvailableClassSection(subjectId, semesterNum, academicYear) {
  const classSections = await ClassSection.find({
    subject: subjectId,
    semester: semesterNum,
    academicYear,
    status: { $in: OPEN_CLASS_STATUSES },
    $expr: { $lt: ["$currentEnrollment", "$maxCapacity"] },
  })
    .sort({ currentEnrollment: 1, classCode: 1 })
    .limit(1)
    .lean();

  return classSections[0] || null;
}

// Luồng đơn lẻ để tạo waitlist ngay lập tức.
// Hàm này được dùng ở các trường hợp không chạy batch, ví dụ các flow nhỏ lẻ khác.
async function addToWaitlistIfNeeded(
  studentId,
  subjectId,
  semesterNum,
  academicYear,
  reason,
  options = {},
) {
  const waitKey = buildStudentSubjectKey(studentId, subjectId);
  if (options.waitlistSet?.has(waitKey)) {
    return {
      success: true,
      created: false,
      reason: "already_waiting",
      message: "Student is already in waitlist for this subject",
    };
  }

  if (options.dryRun === true) {
    options.waitlistSet?.add(waitKey);
    return {
      success: true,
      created: true,
      reason: "dry_run",
      message: "Dry run: waitlist would be created",
    };
  }

  try {
    const waitlist = await Waitlist.create({
      student: studentId,
      subject: subjectId,
      targetSemester: semesterNum,
      targetAcademicYear: academicYear,
      status: "WAITING",
      cancelReason: reason || undefined,
    });

    options.waitlistSet?.add(waitKey);
    return {
      success: true,
      created: true,
      waitlistId: waitlist._id,
      message: "Student moved to waitlist",
    };
  } catch (error) {
    if (error?.code === 11000) {
      options.waitlistSet?.add(waitKey);
      return {
        success: true,
        created: false,
        reason: "already_waiting",
        message: "Student is already in waitlist for this subject",
      };
    }

    return {
      success: false,
      reason: "error",
      message: error.message,
    };
  }
}

// Ghi enrollment cho một sinh viên vào một class section cụ thể.
// Quy trình:
// 1. Tăng currentEnrollment có điều kiện để giữ chỗ
// 2. Tạo ClassEnrollment
// 3. Nếu tạo enrollment fail thì rollback lại currentEnrollment
async function enrollStudentInSection(
  studentId,
  classSectionId,
  semesterCode,
  options = {},
) {
  try {
    if (options.dryRun === true) {
      return {
        success: true,
        dryRun: true,
      };
    }

    const classSection = await ClassSection.findOneAndUpdate(
      {
        _id: classSectionId,
        status: { $in: OPEN_CLASS_STATUSES },
        $expr: { $lt: ["$currentEnrollment", "$maxCapacity"] },
      },
      {
        $inc: { currentEnrollment: 1 },
      },
      { new: true },
    ).lean();

    if (!classSection) {
      const existingClassSection =
        await repo.findClassSectionById(classSectionId);
      if (!existingClassSection) {
        return {
          success: false,
          reason: "class_not_found",
          message: "Class section not found",
        };
      }

      if (!OPEN_CLASS_STATUSES.includes(existingClassSection.status)) {
        return {
          success: false,
          reason: "class_not_open",
          message: "Class section is not open for enrollment",
        };
      }

      return {
        success: false,
        reason: "class_full",
        message: "Class is full",
      };
    }

    try {
      const enrollment = await ClassEnrollment.create({
        student: studentId,
        classSection: classSectionId,
        enrollmentDate: new Date(),
        status: "enrolled",
        isOverload: options.isOverload === true,
        note:
          options.note || `Auto-enrolled for payment period ${semesterCode}`,
      });

      return {
        success: true,
        enrollment,
        classSection,
      };
    } catch (error) {
      await ClassSection.updateOne(
        { _id: classSectionId },
        { $inc: { currentEnrollment: -1 } },
      );

      if (error?.code === 11000) {
        return {
          success: false,
          reason: "duplicate",
          message: "Duplicate enrollment detected",
        };
      }

      return {
        success: false,
        reason: "error",
        message: error.message,
      };
    }
  } catch (error) {
    return {
      success: false,
      reason: "error",
      message: error.message,
    };
  }
}

// Auto-enroll theo từng sinh viên sau khi hoàn tất thanh toán.
// Đây là luồng đơn lẻ, khác với triggerAutoEnrollment là luồng batch do admin kích hoạt.
async function autoEnrollAfterPayment(studentId, curriculumSemesterOrder) {
  const student = await repo.findStudentById(studentId);
  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const curriculumMatch =
    await curriculumService.getCurriculumMatchForStudent(student);
  if (!curriculumMatch.curriculum) {
    return {
      success: false,
      message: formatCurriculumError(curriculumMatch, student),
      totalSubjects: 0,
      enrolledSubjects: [],
      failedSubjects: [],
    };
  }

  const curriculum = curriculumMatch.curriculum;

  // Preview cần biết sinh viên đang ở curriculum semester nào để hiển thị đúng danh sách môn sẽ được xếp.

  // Hàm này nhận sẵn curriculumSemesterOrder từ luồng thanh toán,
  // nên chỉ cần lấy đúng danh sách môn của kỳ đó trong curriculum.
  const semesterSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  if (!semesterSubjects || semesterSubjects.length === 0) {
    return {
      success: true,
      message: "No subjects configured in this curriculum semester",
      totalSubjects: 0,
      enrolledSubjects: [],
      failedSubjects: [],
    };
  }

  const enrolledSubjects = [];
  const failedSubjects = [];

  // Năm học + HK hệ thống suy từ năm nhập học + kỳ khung — không dùng mỗi học kỳ "đang mở" toàn trường (vd 2025-2026)
  const teachingCtx =
    await paymentValidationService.resolveTeachingContextForClassSections(
      student,
      curriculumSemesterOrder,
    );

  for (const subjectData of semesterSubjects) {
    const subject = subjectData.subject;
    if (!subject?._id) continue;

    const classSection = await findAvailableClassSection(
      subject._id,
      teachingCtx.semesterNum,
      teachingCtx.academicYear,
    );

    if (!classSection) {
      failedSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        reason: "no_class_section",
        message: "No available class section found",
      });
      continue;
    }

    const semesterPaymentCode =
      paymentValidationService.generateSemesterPaymentCode(
        curriculumSemesterOrder,
        curriculum.code,
      );

    const result = await enrollStudentInSection(
      studentId,
      classSection._id,
      semesterPaymentCode,
      {
        isOverload: false,
        note: `Auto enrolled after payment (${teachingCtx.academicYear}, HK${teachingCtx.semesterNum})`,
      },
    );

    if (result.success) {
      enrolledSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        classCode: classSection.classCode,
      });
      continue;
    }

    failedSubjects.push({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      reason: result.reason,
      message: result.message,
    });
  }

  const totalSubjects = semesterSubjects.length;
  const successCount = enrolledSubjects.length;
  const failCount = failedSubjects.length;

  return {
    success: failCount === 0,
    message: `Enrolled ${successCount}/${totalSubjects} subjects`,
    totalSubjects,
    enrolledSubjects,
    failedSubjects,
    curriculumSemesterOrder,
    curriculumCode: curriculum.code,
    curriculumName: curriculum.name,
    semesterName:
      teachingCtx.matchedSemesterCode ||
      `HK${teachingCtx.semesterNum} — ${teachingCtx.academicYear}`,
    academicYear: teachingCtx.academicYear,
    teachingContext: {
      semesterNum: teachingCtx.semesterNum,
      academicYear: teachingCtx.academicYear,
      source: teachingCtx.source,
    },
  };
}

// Preview cho biết nếu auto-enrollment chạy cho sinh viên này thì các môn/lớp nào có thể được gán.
// Hàm này không ghi DB, chỉ trả dữ liệu để FE hiển thị hoặc để admin kiểm tra.
async function previewAutoEnrollment(studentId) {
  const student = await repo.findStudentById(studentId);
  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const currentSemester = await repo.findCurrentSemester();
  if (!currentSemester) {
    const error = new Error("Current semester not found");
    error.statusCode = 404;
    throw error;
  }

  const curriculumMatch =
    await curriculumService.getCurriculumMatchForStudent(student);
  if (!curriculumMatch.curriculum) {
    return {
      hasCurriculum: false,
      subjects: [],
      message: formatCurriculumError(curriculumMatch, student),
    };
  }

  const curriculum = curriculumMatch.curriculum;

  const curriculumSemesterOrder =
    await paymentValidationService.resolveDisplayedCurriculumSemester(student, {
      currentSystemSemester: currentSemester,
    });

  const semesterSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  const openClassSections = await repo.findOpenClassSections({
    semesterNum: currentSemester.semesterNum,
    academicYear: currentSemester.academicYear,
    statuses: OPEN_CLASS_STATUSES,
  });
  const { classSectionsBySubject, classSectionsById, classSectionsByGroup } =
    buildClassSectionPools(openClassSections);

  const existingEnrollments = await repo.findSemesterEnrollments(
    [studentId],
    Array.from(classSectionsById.keys()),
    { includeAllStatuses: false },
  );

  const studentStateMap = buildStudentStateMap(
    existingEnrollments,
    new Map(
      Array.from(classSectionsById.entries()).map(([key, value]) => [
        key,
        value,
      ]),
    ),
  );
  const studentState = getOrCreateStudentState(studentStateMap, studentId);
  const studentClassGroup = getStudentClassGroup(student);

  const availableSubjects = [];
  for (const subjectData of semesterSubjects) {
    const subject = subjectData.subject;
    if (!subject?._id) continue;

    const subjectId = String(subject._id);
    if (studentState.activeSubjectIds.has(subjectId)) {
      continue;
    }

    const classSection = pickAvailableClassSection(
      subjectId,
      classSectionsBySubject,
      studentState.occupiedClassSectionIds,
      studentClassGroup,
      curriculumSemesterOrder,
    );

    availableSubjects.push({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      credits: subject.credits,
      hasAvailableClass: !!classSection,
      classSectionId: classSection?._id,
      classSectionName: classSection?.className || classSection?.classCode,
      classSectionCode: classSection?.classCode,
      currentEnrollment: classSection?.currentEnrollment || 0,
      maxCapacity: classSection?.maxCapacity || 0,
    });
  }

  return {
    hasCurriculum: true,
    curriculumSemesterOrder,
    curriculumCode: curriculum.code,
    curriculumName: curriculum.name,
    currentSemesterName: currentSemester.name,
    academicYear: currentSemester.academicYear,
    totalSubjects: availableSubjects.length,
    subjects: availableSubjects,
  };
}

// Luồng batch chính của chức năng Auto-Assign Students To Classes.
// Đây là hàm quan trọng nhất của module.
//
// Ý tưởng tổng quát:
// 1. Nhận học kỳ và các filter chạy batch
// 2. Nạp dữ liệu nền: sinh viên, curriculum, class section, termsPerYear
// 3. Dựng state trong RAM để tránh query DB lặp cho từng sinh viên
// 4. Với mỗi sinh viên:
//    - tìm curriculum phù hợp
//    - xác định curriculum semester hiện tại
//    - lấy danh sách môn của kỳ đó
//    - chọn lớp còn chỗ hoặc đưa vào waitlist
// 5. Cuối batch mới bulk ghi DB để hiệu năng tốt hơn
/**
 * Hàm batch chính của chức năng Auto-Assign Students To Classes.
 *
 * Cách hiểu nhanh:
 * 1. Nhận semesterId và các filter chạy batch
 * 2. Nạp dữ liệu nền: sinh viên, curriculum, lớp mở, termsPerYear
 * 3. Dựng cache/state trong RAM
 * 4. Duyệt từng sinh viên
 * 5. Với mỗi sinh viên, duyệt từng môn của curriculum semester hiện tại
 * 6. Chọn lớp để enroll hoặc đưa vào waitlist
 * 7. Cuối cùng mới bulk ghi DB nếu không phải dryRun
 *
 * Đây là hàm điều phối (orchestration function), nên bản thân nó dài.
 * Khi đọc nên chia theo từng chặng thay vì cố hiểu từng dòng một lần.
 */
async function prepareAutoEnrollmentBatchContext(
  semesterId,
  options = {},
  { applyStudentLimit = true } = {},
) {
  const requestedMajorCodes = normalizeCodeList(options.majorCodes);
  const requestedStudentCodes = normalizeCodeList(options.studentCodes);
  const onlyStudentsWithoutEnrollments =
    options.onlyStudentsWithoutEnrollments === true;
  const excludeStudentsAlreadyAssignedInSemester =
    options.excludeStudentsAlreadyAssignedInSemester === true;
  const studentLimit = parsePositiveInteger(options.limit);
  // Mode: 'normal' = dựa vào curriculum semester của SV, 'retake' = dùng system semester dropdown
  const enrollmentMode = options.mode === "retake" ? "retake" : "normal";
  const curriculumIdFilter =
    options.curriculumId != null && String(options.curriculumId).trim() !== ""
      ? String(options.curriculumId).trim()
      : undefined;
  // classGroup filter: giới hạn xếp lớp chỉ cho nhóm được chọn (VD: "SE1808-01")
  const classGroupFilter =
    options.classGroup != null && String(options.classGroup).trim() !== ""
      ? String(options.classGroup).trim()
      : undefined;
  const filters = buildFilterSummary({
    majorCodes: requestedMajorCodes,
    studentCodes: requestedStudentCodes,
    limit: studentLimit,
    onlyStudentsWithoutEnrollments,
    excludeStudentsAlreadyAssignedInSemester,
    enrollmentMode,
    curriculumId: curriculumIdFilter,
    classGroup: classGroupFilter,
  });

  // Chặng 1: xác định học kỳ chạy batch.
  // Nếu semesterId sai thì toàn bộ luồng phải dừng ngay vì mọi bước phía sau đều phụ thuộc học kỳ này.
  const semester = await repo.findSemesterById(semesterId);
  if (!semester) {
    const error = new Error("Semester not found");
    error.statusCode = 404;
    throw error;
  }

  // Nạp dữ liệu nền song song để giảm thời gian chờ:
  // - candidateStudents: các sinh viên active có thể được xét
  // - activeCurriculums: toàn bộ curriculum đang active
  // - termsPerYear: số học kỳ trong năm để tính curriculum semester
  // Chặng 2: nạp dữ liệu nền song song.
  // Đây là toàn bộ đầu vào chính trước khi bắt đầu duyệt từng sinh viên.
  const [eligibleOutcome, activeCurriculums, termsPerYear] =
    await Promise.all([
      repo.findEligibleStudents({
        majorCodes: requestedMajorCodes,
        studentCodes: requestedStudentCodes,
        curriculumId: curriculumIdFilter,
        classGroup: classGroupFilter,
      }),
      repo.findActiveCurriculums(),
      paymentValidationService.resolveTermsPerYear(semester),
    ]);
  const candidateStudents = eligibleOutcome.students;
  const eligibleMajorMeta = eligibleOutcome.meta || {
    curriculumMajorCodes: [],
    effectiveMajorCodes: [],
    curriculumEnrollmentYearRange: null,
  };

  _svc(
    `findEligibleStudents returned ${candidateStudents.length} candidates`,
    '(check [Repo] logs above for classSection values)',
  );
  // In thử 5 SV đầu tiên — tìm Trần Minh Thật
  const debugNames = candidateStudents
    .filter((s) => /thật/i.test(s.fullName))
    .map((s) => `FOUND: ${s.studentCode} ${s.fullName} classSection="${s.classSection}"`);
  if (debugNames.length) {
    debugNames.forEach((m) => _svc(m));
  } else {
    _svc('Trần Minh Thật NOT in candidate list — showing top 5:');
    candidateStudents.slice(0, 5).forEach((s) =>
      _svc(
        `  ${s.studentCode} | ${s.fullName} | major=${s.majorCode} | classSection="${s.classSection}"`,
      ),
    );
  }

  const candidateMajorCodes = Array.from(
    new Set(
      candidateStudents
        .map((student) =>
          String(student.majorCode || '')
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
  const candidateMajorAliasesByCode = buildMajorAliasesByCode(
    candidateMajorCodes,
    await repo.findMajorsByCodes(candidateMajorCodes),
  );
  const curriculumLookupForMatching =
    curriculumService.buildCurriculumLookup(activeCurriculums);
  const normalModeAcademicYears =
    enrollmentMode === 'normal'
      ? await resolveNormalModeAcademicYears({
          semester,
          candidateStudents,
          curriculumIdFilter,
          activeCurriculums,
          curriculumLookup: curriculumLookupForMatching,
          majorAliasesByCode: candidateMajorAliasesByCode,
        })
      : [];

  // Chặng 2b: Load classSections.
  // - Normal mode: load ALL open class sections (sẽ match bằng classGroup)
  // - Retake mode: load class sections của system semester được chọn
  let classSections;
  if (enrollmentMode === "normal") {
    // Load tất cả class sections đang mở, không filter theo system semester
    classSections = await repo.findOpenClassSectionsAllSemesters({
      statuses: OPEN_CLASS_STATUSES,
      classGroup: classGroupFilter,
    });
  } else {
    // Retake mode: chỉ load class sections của system semester được chọn
    classSections = await repo.findOpenClassSections({
      semesterNum: semester.semesterNum,
      academicYear: semester.academicYear,
      statuses: OPEN_CLASS_STATUSES,
      classGroup: classGroupFilter,
    });
  }

  // Chuẩn bị các lookup/cache trong RAM để giảm việc lặp query trong vòng for lớn.
  // Chặng 3: dựng lookup/cache trong RAM để tránh query lặp trong vòng for lớn.
  // Normal mode vẫn cần nới academicYear để khớp niên khóa curriculum,
  // nhưng không được tràn sang semester khác của hệ thống.
  if (enrollmentMode === 'normal') {
    classSections = await repo.findOpenClassSectionsBySemesterYears({
      semesterNum: semester.semesterNum,
      academicYears: normalModeAcademicYears,
      statuses: OPEN_CLASS_STATUSES,
      classGroup: classGroupFilter,
    });
  }

  const { classSectionsById, classSectionsBySubject, classSectionsByGroup } =
    buildClassSectionPools(classSections);
  const classSectionIds = Array.from(classSectionsById.keys());
  const studentIds = candidateStudents.map((student) => student._id);
  const majorCodes = Array.from(
    new Set(
      candidateStudents
        .map((student) =>
          String(student.majorCode || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
  const majorAliasesByCode = buildMajorAliasesByCode(
    majorCodes,
    await repo.findMajorsByCodes(majorCodes),
  );
  const curriculumLookup =
    curriculumService.buildCurriculumLookup(activeCurriculums);

  // Gộp niên khóa HK hệ thống + niên khóa khung / trên lớp mở — waitlist & filter "đã có lớp" cần cùng tập này
  // (tránh chỉ query 2025-2026 trong khi bản ghi waitlist/enrollment gắn 2026-2030).
  const institutionalSemesterYearUnion = (() => {
    const years = new Set();
    const primary = String(semester.academicYear || "").trim();
    if (primary) {
      years.add(primary);
    }
    if (curriculumIdFilter && Array.isArray(activeCurriculums)) {
      const cur = activeCurriculums.find(
        (c) => String(c._id) === String(curriculumIdFilter),
      );
      if (cur?.academicYear) {
        years.add(String(cur.academicYear).trim());
      }
    }
    if (
      classGroupFilter &&
      enrollmentMode === "normal" &&
      Array.isArray(classSections)
    ) {
      for (const sec of classSections) {
        const ay = String(sec.academicYear || "").trim();
        if (ay) {
          years.add(ay);
        }
      }
    }
    return Array.from(years);
  })();

  // Lấy enrollment/waitlist đang tồn tại để:
  // - tránh tạo enrollment trùng
  // - biết sinh viên đã có môn nào rồi
  // - biết đã có waitlist chưa
  // Nạp enrollment và waitlist hiện có trước khi xếp lớp.
  // Mục đích là chống duplicate và biết sinh viên đã có môn nào rồi.
  const [existingEnrollments, existingWaitlists] =
    studentIds.length > 0
      ? await Promise.all([
          classSectionIds.length > 0
            ? repo.findSemesterEnrollments(studentIds, classSectionIds, {
                includeAllStatuses: true,
              })
            : Promise.resolve([]),
          repo.findSemesterWaitlists(
            studentIds,
            semester.semesterNum,
            semester.academicYear,
            institutionalSemesterYearUnion.length > 0
              ? { targetAcademicYears: institutionalSemesterYearUnion }
              : {},
          ),
        ])
      : [[], []];

  const studentStateMap = buildStudentStateMap(
    existingEnrollments,
    classSectionsById,
  );
  const waitlistSet = new Set(
    existingWaitlists.map((waitlist) =>
      buildStudentSubjectKey(waitlist.student, waitlist.subject),
    ),
  );
  const curriculumSemesterSubjectsCache = new Map();
  const curriculumMatchCache = new Map();
  const curriculumSemesterOrderCache = new Map();

  // Filter cuối cùng áp vào danh sách candidate.
  // onlyStudentsWithoutEnrollments: loại bỏ sinh viên đã hoàn thành TẤT CẢ môn của kỳ.
  let students = candidateStudents;
  if (onlyStudentsWithoutEnrollments) {
    const results = await Promise.all(
      candidateStudents.map(async (student) => ({
        student,
        check: await checkStudentHasUnenrolledSubjects(
          student,
          studentStateMap,
          curriculumLookup,
          semester,
          termsPerYear,
          curriculumSemesterSubjectsCache,
        ),
      })),
    );
    students = results
      .filter(({ check }) => check.hasUnenrolled)
      .map(({ student }) => student);
  }

  let excludedAlreadyAssignedInSemester = 0;
  // Khi đã lọc "chưa xếp đủ môn kỳ khung" (onlyStudentsWithoutEnrollments), SV vẫn có thể
  // có 1–2 enrollment trong HK → không được loại hết batch bằng "đã có bất kỳ lớp nào trong HK".
  // Trùng môn vẫn được xử lý trong vòng lặp (skip duplicate). Gộp hai filter trước đây làm
  // mất toàn bộ ứng viên (40 skipped) dù Lớp SH trống / chưa xếp đủ môn.
  if (
    excludeStudentsAlreadyAssignedInSemester &&
    students.length > 0 &&
    !onlyStudentsWithoutEnrollments
  ) {
    const primaryAy = String(semester.academicYear || "").trim();
    const excludeExtraYears = institutionalSemesterYearUnion.filter(
      (y) => y !== primaryAy,
    );

    const busyStudentIds =
      await repo.findStudentIdsWithEnrollmentInSystemSemester(
        students.map((s) => s._id),
        semester.semesterNum,
        semester.academicYear,
        excludeExtraYears.length > 0
          ? { extraAcademicYears: excludeExtraYears }
          : {},
      );
    const busySet = new Set(busyStudentIds.map((id) => String(id)));
    const before = students.length;
    students = students.filter((s) => !busySet.has(String(s._id)));
    excludedAlreadyAssignedInSemester = before - students.length;
  }

  if (applyStudentLimit && studentLimit) {
    students = students.slice(0, studentLimit);
  }

  const groupSectionsOrdered =
    classGroupFilter && Array.isArray(classSections) && classSections.length > 0
      ? [...classSections].sort((a, b) =>
          String(a.classCode || "").localeCompare(String(b.classCode || "")),
        )
      : [];

  let groupSubjectDocsById = new Map();
  if (groupSectionsOrdered.length > 0) {
    const subjIds = [
      ...new Set(
        groupSectionsOrdered
          .map((s) => s.subject)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ];
    if (subjIds.length > 0) {
      const subjDocs = await Subject.find({ _id: { $in: subjIds } })
        .select("_id subjectCode subjectName")
        .lean();
      groupSubjectDocsById = new Map(subjDocs.map((s) => [String(s._id), s]));
    }
  }

  const filtersWithSubjectSource = {
    ...filters,
    subjectListSource:
      classGroupFilter && groupSectionsOrdered.length > 0
        ? "group_open_sections"
        : "curriculum_semester",
  };

  return {
    requestedMajorCodes,
    requestedStudentCodes,
    onlyStudentsWithoutEnrollments,
    excludeStudentsAlreadyAssignedInSemester,
    studentLimit,
    enrollmentMode,
    curriculumIdFilter,
    classGroupFilter,
    filters: filtersWithSubjectSource,
    groupSectionsOrdered,
    groupSubjectDocsById,
    semester,
    candidateStudents,
    eligibleMajorMeta,
    activeCurriculums,
    termsPerYear,
    classSections,
    classSectionsById,
    classSectionsBySubject,
    classSectionsByGroup,
    majorAliasesByCode,
    curriculumLookup,
    institutionalSemesterYearUnion,
    existingEnrollments,
    existingWaitlists,
    studentStateMap,
    waitlistSet,
    curriculumSemesterSubjectsCache,
    curriculumMatchCache,
    curriculumSemesterOrderCache,
    students,
    excludedAlreadyAssignedInSemester,
  };
}

async function triggerAutoEnrollment(semesterId, options = {}) {
  const startedAt = Date.now();
  const dryRun = options.dryRun === true;
  const ctx = await prepareAutoEnrollmentBatchContext(semesterId, options, {
    applyStudentLimit: true,
  });
  const {
    requestedMajorCodes,
    requestedStudentCodes,
    onlyStudentsWithoutEnrollments,
    excludeStudentsAlreadyAssignedInSemester,
    studentLimit,
    enrollmentMode,
    curriculumIdFilter,
    classGroupFilter,
    filters,
    semester,
    candidateStudents,
    eligibleMajorMeta,
    activeCurriculums,
    termsPerYear,
    classSections,
    classSectionsById,
    classSectionsBySubject,
    classSectionsByGroup,
    majorAliasesByCode,
    curriculumLookup,
    institutionalSemesterYearUnion,
    existingEnrollments,
    existingWaitlists,
    studentStateMap,
    waitlistSet,
    curriculumSemesterSubjectsCache,
    curriculumMatchCache,
    curriculumSemesterOrderCache,
    students,
    excludedAlreadyAssignedInSemester,
    groupSectionsOrdered,
    groupSubjectDocsById,
  } = ctx;

  /** Đã chọn nhóm lớp: duyệt từng ClassSection trong pool (kể cả trùng subjectId), không gộp theo môn. */
  const useGroupSectionWalk =
    Boolean(classGroupFilter) &&
    Array.isArray(groupSectionsOrdered) &&
    groupSectionsOrdered.length > 0;

  const logs = [];
  let totalEnrollments = 0;
  let waitlisted = 0;
  let duplicates = 0;
  let failed = 0;
  let studentsWithErrors = 0;
  let studentsWithEnrollments = 0;
  let studentsMissingEnrollmentYear = students.filter(
    (student) =>
      curriculumService.resolveStudentEnrollmentYear(student) == null,
  ).length;
  let curriculumSubjectMappingIssues = 0;
  const studentsWithoutCurriculumByMajor = {};
  const studentsWithoutCurriculumByReason = {};
  const pendingEnrollmentDocs = [];
  const pendingWaitlistDocs = [];
  const classSectionIncrementMap = new Map();
  let studentsNoActionNeeded = 0;

  // Thứ tự ưu tiên tổng thể của thuật toán batch:
  // 1. Ưu tiên danh sách student đã được repository sort theo studentCode tăng dần
  // 2. Với từng student, ưu tiên curriculum match trước, rồi mới tính semester order
  // 3. Với từng subject của student:
  //    - ưu tiên skip duplicate trước
  //    - sau đó mới tìm class available
  //    - nếu không có class thì mới đẩy sang waitlist
  // 4. Với class available thì dùng rule ưu tiên ở pickAvailableClassSection(...)
  //
  // Nghĩa là khi bị hỏi "mức độ ưu tiên của auto-enrollment là gì", có thể trả lời:
  // - ưu tiên đúng curriculum
  // - ưu tiên đúng curriculum semester
  // - ưu tiên tránh duplicate
  // - ưu tiên lớp còn chỗ và ít sinh viên hơn
  // - hết chỗ mới sang waitlist
  // Xử lý từng sinh viên một để log kết quả chi tiết theo từng người.
  // Chặng 5: vòng lặp chính của batch.
  for (const student of students) {
    const studentLog = {
      studentId: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email || "",
      enrolled: [],
      waitlisted: [],
      skipped: [],
      errors: [],
    };

    try {
      // Bước 1: tìm curriculum phù hợp với major + enrollmentYear/cohort của sinh viên.
      // Bước 5.1: tìm curriculum phù hợp cho sinh viên.
      const curriculumMatch = await getCurriculumMatchCached(
        curriculumMatchCache,
        student,
        {
          curriculums: activeCurriculums,
          curriculumLookup,
          majorAliasesByCode,
        },
      );

      if (!curriculumMatch.curriculum) {
        const majorKey =
          curriculumMatch.majorCode || student.majorCode || "UNKNOWN";
        studentsWithoutCurriculumByMajor[majorKey] =
          (studentsWithoutCurriculumByMajor[majorKey] || 0) + 1;
        studentsWithoutCurriculumByReason[curriculumMatch.reason || "unknown"] =
          (studentsWithoutCurriculumByReason[
            curriculumMatch.reason || "unknown"
          ] || 0) + 1;

        studentLog.errors.push(formatCurriculumError(curriculumMatch, student));
        failed += 1;
        studentsWithErrors += 1;
        logs.push(studentLog);
        continue;
      }

      const curriculum = curriculumMatch.curriculum;
      // Bước 2: xác định sinh viên hiện đang học tới curriculum semester thứ mấy.
      // Bước 5.2: xác định sinh viên đang ở curriculum semester thứ mấy.
      const curriculumSemesterOrder = await getCurriculumSemesterOrderCached(
        curriculumSemesterOrderCache,
        student,
        semester,
        { termsPerYear },
      );

      studentLog.curriculumCode = curriculum.code;
      studentLog.curriculumSemesterOrder = curriculumSemesterOrder;

      // Nhóm lớp: duyệt từng ClassSection đã có trong pool (kể cả cùng môn — 2 lớp PRF192 = 2 enrollment).
      if (useGroupSectionWalk) {
        const studentState = getOrCreateStudentState(
          studentStateMap,
          student._id,
        );

        if (!groupSectionsOrdered.length) {
          studentLog.skipped.push(
            `Không có lớp học phần nào trong pool lớp mở của nhóm "${classGroupFilter}" (cần lớp Published/Scheduled trong nhóm).`,
          );
          logs.push(studentLog);
          continue;
        }

        let needsEnrollmentProcessing = false;
        let allSectionsAlreadyEnrolled = true;

        for (const secRaw of groupSectionsOrdered) {
          const sec = classSectionsById.get(String(secRaw._id));
          if (!sec) continue;
          if (studentState.occupiedClassSectionIds.has(String(sec._id))) {
            continue;
          }
          allSectionsAlreadyEnrolled = false;
          if (sec.currentEnrollment < sec.maxCapacity) {
            needsEnrollmentProcessing = true;
            break;
          }
          const wk = buildStudentSubjectKey(student._id, sec.subject);
          if (!waitlistSet.has(wk)) {
            needsEnrollmentProcessing = true;
            break;
          }
        }

        if (!needsEnrollmentProcessing) {
          studentsNoActionNeeded += 1;
          studentLog.skipped.push(
            allSectionsAlreadyEnrolled
              ? "Trong CSDL đã có enrollment cho đủ các lớp học phần trong nhóm — không cần xếp thêm."
              : "Trong CSDL đã có waitlist cho (các) môn chưa gán lớp của kỳ này và hiện không có lớp trống phù hợp — bỏ qua.",
          );
          logs.push(studentLog);
          continue;
        }

        for (const secRaw of groupSectionsOrdered) {
          const sec = classSectionsById.get(String(secRaw._id));
          if (!sec) continue;

          const subjectId = String(sec.subject);
          const subjectMeta =
            groupSubjectDocsById.get(subjectId) || {
              subjectCode: sec.classCode || "?",
              subjectName: sec.className || "",
            };

          if (studentState.occupiedClassSectionIds.has(String(sec._id))) {
            duplicates += 1;
            studentLog.skipped.push(
              `${subjectMeta.subjectCode} (${sec.classCode || sec.className}): đã có enrollment`,
            );
            continue;
          }

          if (sec.currentEnrollment >= sec.maxCapacity) {
            const waitlistResult = queueWaitlistIfNeeded(
              student._id,
              sec.subject,
              semester.semesterNum,
              semester.academicYear,
              "Auto enrollment: no available class section",
              {
                dryRun,
                waitlistSet,
                pendingWaitlistDocs,
              },
            );

            if (waitlistResult.success) {
              if (waitlistResult.created) {
                waitlisted += 1;
                studentLog.waitlisted.push({
                  subjectCode: subjectMeta.subjectCode,
                  subjectName: subjectMeta.subjectName,
                  waitlistId: waitlistResult.waitlistId,
                  message: waitlistResult.message,
                });
              } else if (waitlistResult.reason === "already_waiting") {
                studentLog.skipped.push(
                  `${subjectMeta.subjectCode}: đã có trong waitlist (cùng HK hệ thống / niên khóa đã gộp), bỏ qua.`,
                );
              } else {
                studentLog.skipped.push(
                  `${subjectMeta.subjectCode}: ${waitlistResult.message}`,
                );
              }
            } else {
              failed += 1;
              studentLog.errors.push(
                `${subjectMeta.subjectCode}: ${waitlistResult.message}`,
              );
            }
            continue;
          }

          const semesterPaymentCode =
            paymentValidationService.generateSemesterPaymentCode(
              curriculumSemesterOrder,
              curriculum.code,
            );

          pendingEnrollmentDocs.push({
            student: student._id,
            classSection: sec._id,
            enrollmentDate: new Date(),
            status: "enrolled",
            isOverload: false,
            note: `Auto enrolled by semester trigger ${semester.code} (${semesterPaymentCode})`,
          });
          incrementMapCounter(classSectionIncrementMap, sec._id, 1);
          totalEnrollments += 1;
          sec.currentEnrollment += 1;
          studentState.activeSubjectIds.add(subjectId);
          studentState.occupiedClassSectionIds.add(String(sec._id));
          studentLog.enrolled.push({
            subjectCode: subjectMeta.subjectCode,
            subjectName: subjectMeta.subjectName,
            classSectionId: sec._id,
            classCode: sec.classCode,
          });
        }

        logs.push(studentLog);
        continue;
      }

      // Bước 3: danh môn cần xếp theo kỳ trong khung CT (không chọn nhóm lớp).
      let semesterSubjects = await getCurriculumSemesterSubjectsCached(
        curriculumSemesterSubjectsCache,
        curriculum._id,
        curriculumSemesterOrder,
      );

      if (!semesterSubjects?.length) {
        studentLog.skipped.push(
          `No subjects found in curriculum semester ${curriculumSemesterOrder} for curriculum ${curriculum.code}`,
        );
        logs.push(studentLog);
        continue;
      }

      const studentState = getOrCreateStudentState(
        studentStateMap,
        student._id,
      );

      // Bước 4: duyệt từng subject trong curriculum semester để gán lớp hoặc waitlist.
      // Bước 5.4: duyệt từng môn để quyết định enroll, waitlist hoặc skip.
      const studentClassGroup = getStudentClassGroup(student);

      // Bỏ qua sớm SV đã "xong" kỳ này: đủ enrollment HOẶC (waitlist + không có lớp trống).
      // Tránh log Enrolled/Waitlisted gây hiểu nhầm khi chạy lặp.
      let needsEnrollmentProcessing = false;
      let allSubjectsAlreadyEnrolled = true;

      for (const subjectData of semesterSubjects) {
        const sub = subjectData?.subject;
        if (!sub?._id) {
          needsEnrollmentProcessing = true;
          allSubjectsAlreadyEnrolled = false;
          break;
        }
        const sid = String(sub._id);
        if (studentState.activeSubjectIds.has(sid)) {
          continue;
        }
        allSubjectsAlreadyEnrolled = false;

        const openSection = pickAvailableClassSection(
          sid,
          classSectionsBySubject,
          studentState.occupiedClassSectionIds,
          studentClassGroup,
          curriculumSemesterOrder,
        );
        if (openSection) {
          needsEnrollmentProcessing = true;
          break;
        }

        const wk = buildStudentSubjectKey(student._id, sub._id);
        if (!waitlistSet.has(wk)) {
          needsEnrollmentProcessing = true;
          break;
        }
      }

      if (!needsEnrollmentProcessing) {
        studentsNoActionNeeded += 1;
        studentLog.skipped.push(
          allSubjectsAlreadyEnrolled
            ? "Trong CSDL đã có enrollment cho đủ môn kỳ khung này — không cần xếp thêm. (Trang «Lịch sử đã lưu» chỉ là bản chụp log, không phải nguồn enrollment.)"
            : "Trong CSDL đã có waitlist cho (các) môn chưa gán lớp của kỳ này và hiện không có lớp trống phù hợp — bỏ qua. «Lịch sử đã lưu» = 0 chỉ nghĩa chưa bấm «Lưu lớp»; waitlist/enrollment vẫn có thể tồn tại sau lần chạy Live (hoặc thao tác khác) trước đó.",
        );
        logs.push(studentLog);
        continue;
      }

      for (const subjectData of semesterSubjects) {
        const subject = subjectData?.subject;
        if (!subject?._id) {
          curriculumSubjectMappingIssues += 1;
          failed += 1;
          studentLog.errors.push(
            "Curriculum course is missing linked subject data",
          );
          continue;
        }

        const subjectId = String(subject._id);
        if (studentState.activeSubjectIds.has(subjectId)) {
          // Duplicate luôn được ưu tiên xử lý trước:
          // nếu student đã có môn này rồi thì không xét chọn lớp nữa.
          duplicates += 1;
          studentLog.skipped.push(`${subject.subjectCode}: already enrolled`);
          continue;
        }

        // Chọn lớp phù hợp nhất cho đúng subject này từ pool lớp đang mở.
        const classSection = pickAvailableClassSection(
          subjectId,
          classSectionsBySubject,
          studentState.occupiedClassSectionIds,
          studentClassGroup,
          curriculumSemesterOrder,
        );

        // Nếu không còn lớp mở cho môn này, sinh viên được đưa sang waitlist thay vì bỏ qua im lặng.
        if (!classSection) {
          // Waitlist là bước fallback cuối cùng, chỉ xảy ra sau khi:
          // - đã xác định đúng curriculum
          // - đã xác định đúng subject của kỳ
          // - đã thử chọn lớp nhưng không còn lớp nào hợp lệ
          const waitlistResult = queueWaitlistIfNeeded(
            student._id,
            subject._id,
            semester.semesterNum,
            semester.academicYear,
            "Auto enrollment: no available class section",
            {
              dryRun,
              waitlistSet,
              pendingWaitlistDocs,
            },
          );

          if (waitlistResult.success) {
            if (waitlistResult.created) {
              waitlisted += 1;
              studentLog.waitlisted.push({
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                waitlistId: waitlistResult.waitlistId,
                message: waitlistResult.message,
              });
            } else if (waitlistResult.reason === "already_waiting") {
              studentLog.skipped.push(
                `${subject.subjectCode}: đã có trong waitlist (cùng HK hệ thống / niên khóa đã gộp), bỏ qua.`,
              );
            } else {
              studentLog.skipped.push(
                `${subject.subjectCode}: ${waitlistResult.message}`,
              );
            }
          } else {
            failed += 1;
            studentLog.errors.push(
              `${subject.subjectCode}: ${waitlistResult.message}`,
            );
          }
          continue;
        }

        const semesterPaymentCode =
          paymentValidationService.generateSemesterPaymentCode(
            curriculumSemesterOrder,
            curriculum.code,
          );

        // Chưa ghi DB ngay; chỉ gom document và cập nhật state trong RAM.
        // Lý do phải tăng currentEnrollment trong RAM ở đây:
        // - batch có thể xếp nhiều sinh viên liên tiếp vào cùng một lớp
        // - nếu không "giữ chỗ tạm" trong bộ nhớ, các sinh viên sau sẽ tiếp tục thấy lớp còn chỗ
        //   và bị xếp vượt maxCapacity trước khi tới bước bulkWrite cuối batch
        // Chưa ghi DB ngay.
        // Batch chỉ gom enrollment vào danh sách chờ ghi và "giữ chỗ tạm" trong RAM.
        pendingEnrollmentDocs.push({
          student: student._id,
          classSection: classSection._id,
          enrollmentDate: new Date(),
          status: "enrolled",
          isOverload: false,
          note: `Auto enrolled by semester trigger ${semester.code} (${semesterPaymentCode})`,
        });
        incrementMapCounter(classSectionIncrementMap, classSection._id, 1);
        totalEnrollments += 1;

        // Giữ chỗ tạm ngay trong RAM để các sinh viên xử lý sau trong cùng batch
        // không tiếp tục nhìn thấy lớp này còn chỗ và bị xếp vượt maxCapacity.
        classSection.currentEnrollment += 1;

        // Cập nhật state của sinh viên ngay sau khi đã quyết định enroll.
        // Nhờ vậy các môn/lớp xử lý tiếp theo trong cùng vòng lặp sẽ nhìn thấy trạng thái mới nhất.
        studentState.activeSubjectIds.add(subjectId);
        studentState.occupiedClassSectionIds.add(String(classSection._id));
        studentLog.enrolled.push({
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          classSectionId: classSection._id,
          classCode: classSection.classCode,
        });
      }
    } catch (error) {
      failed += 1;
      studentLog.errors.push(error.message);
    }

    // Sau mỗi sinh viên, cập nhật các bộ đếm tổng rồi mới đẩy log vào danh sách logs.
    if (studentLog.errors.length > 0) {
      studentsWithErrors += 1;
    }
    if (studentLog.enrolled.length > 0) {
      studentsWithEnrollments += 1;
    }

    logs.push(studentLog);
  }

  // dryRun chỉ mô phỏng kết quả, tuyệt đối không ghi DB.
  // Nếu chạy thật, enrollment, seat count, và waitlist sẽ được persist ở cuối batch.
  // Chặng 6: nếu không phải dryRun thì mới bulk ghi DB thật.
  if (!dryRun) {
    try {
      const enrollmentPersistResult =
        await repo.bulkUpsertEnrollments(pendingEnrollmentDocs);
      await repo.bulkIncrementClassSections(
        enrollmentPersistResult.insertedClassSectionCounts,
      );
      await repo.bulkUpsertWaitlists(pendingWaitlistDocs);
    } catch (error) {
      const persistError = formatAutoEnrollmentPersistenceError(error);
      persistError.statusCode = 500;
      throw persistError;
    }
  }

  // Chặng 7: tổng hợp preflight + summary + logs để FE/admin hiển thị kết quả.
  // Chặng 7: tổng hợp summary/preflight để FE hiển thị lại kết quả lần chạy.
  const preflight = buildPreflightSummary({
    students,
    candidateStudentCount: candidateStudents.length,
    semester,
    termsPerYear,
    activeCurriculums,
    classSections,
    studentsWithoutCurriculumByMajor,
    studentsWithoutCurriculumByReason,
    studentsMissingEnrollmentYear,
    curriculumSubjectMappingIssues,
    excludedAlreadyAssignedInSemester,
    dryRun,
    filters,
  });

  if (curriculumIdFilter) {
    const cm = eligibleMajorMeta.curriculumMajorCodes || [];
    const em = eligibleMajorMeta.effectiveMajorCodes || [];
    if (cm.length === 0 && em.length === 0) {
      preflight.warnings.push(
        "Không có SV ứng viên: không suy ra được mã ngành từ khung CT (thiếu majorId / Major không khớp) và ô Major codes để trống. " +
          "Cập nhật Curriculum.majorId trong DB, hoặc nhập Major codes (vd: SE) trùng ngành khung.",
      );
    } else if (
      cm.length > 0 &&
      requestedMajorCodes.length > 0 &&
      em.length === 0
    ) {
      preflight.warnings.push(
        `Major codes trên form không giao với ngành của khung: khung → [${cm.join(", ")}], form → [${requestedMajorCodes.join(", ")}]. Để trống Major codes để lấy hết SV ngành khung.`,
      );
    }
  }

  const durationMs = Date.now() - startedAt;

  // success ở đây là mức batch-level:
  // - true khi không có lỗi nào bị tính vào failed
  // - false khi có ít nhất một lỗi trong quá trình xử lý
  const result = {
    success: failed === 0,
    dryRun,
    durationMs,
    curriculumSemester: null, // sẽ set bên dưới nếu batch đồng nhất
    semester: {
      id: semester._id,
      code: semester.code,
      name: semester.name,
      semesterNum: semester.semesterNum,
      academicYear: semester.academicYear,
    },
    summary: {
      totalStudents: students.length,
      processedStudents: logs.length,
      candidateStudents: candidateStudents.length,
      excludedAlreadyAssignedInSemester,
      studentsNoActionNeeded,
      studentsWithEnrollments,
      studentsWithErrors,
      totalEnrollments,
      waitlisted,
      duplicates,
      failed,
    },
    preflight,
    filters: {
      ...filters,
      curriculumMajorCodesResolved: eligibleMajorMeta.curriculumMajorCodes,
      effectiveMajorCodes: eligibleMajorMeta.effectiveMajorCodes,
      curriculumEnrollmentYearRange:
        eligibleMajorMeta.curriculumEnrollmentYearRange || null,
    },
    logs,
  };

  // Xác định curriculumSemester batch-level: nếu tất cả SV cùng kỳ → dùng kỳ đó, không thì null (mixed).
  const uniqueSemesters = [
    ...new Set(
      logs
        .map((l) => l.curriculumSemesterOrder)
        .filter((v) => v != null),
    ),
  ];
  if (uniqueSemesters.length === 1) {
    result.curriculumSemester = uniqueSemesters[0];
  }

  return result;
}

// ─────────────────────────────────────────────
// Enrollment Management — service wrappers
// ─────────────────────────────────────────────

function parseMajorCodesQuery(value) {
  if (value == null || value === '') return [];
  return String(value)
    .split(/[\s,;\n]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

async function getEnrollmentStatus({
  semesterNum,
  academicYear,
  classGroup,
  curriculumId,
  curriculumSemesterOrder,
  majorCodes,
}) {
  if (semesterNum == null || !academicYear) {
    const err = new Error('semesterNum and academicYear are required');
    err.statusCode = 400;
    throw err;
  }
  const csOrder =
    curriculumSemesterOrder != null && String(curriculumSemesterOrder).trim() !== ''
      ? Number(curriculumSemesterOrder)
      : undefined;
  return repo.getEnrollmentStatus({
    semesterNum,
    academicYear,
    classGroup,
    curriculumId,
    curriculumSemesterOrder:
      csOrder != null && Number.isFinite(csOrder) && csOrder >= 1 ? csOrder : undefined,
    majorCodes: Array.isArray(majorCodes) ? majorCodes : parseMajorCodesQuery(majorCodes),
  });
}

async function deleteEnrollments({ semesterNum, academicYear, classGroup, studentId }) {
  return repo.deleteEnrollments({ semesterNum, academicYear, classGroup, studentId });
}

async function deleteWaitlists({ semesterNum, academicYear, classGroup, studentId, subjectId }) {
  return repo.deleteWaitlists({ semesterNum, academicYear, classGroup, studentId, subjectId });
}

async function promoteWaitlist(waitlistId, targetClassSectionId) {
  if (!waitlistId) {
    const err = new Error('waitlistId is required');
    err.statusCode = 400;
    throw err;
  }
  return repo.promoteWaitlist(waitlistId, { targetClassSectionId });
}

function serializeStudentRow(s) {
  return {
    _id: s._id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    email: s.email || '',
    majorCode: s.majorCode,
    enrollmentYear: s.enrollmentYear,
    classSection: s.classSection,
    curriculumId: s.curriculumId,
  };
}

/**
 * Danh sách sinh viên sau cùng cùng filter với trigger (không áp limit — để admin chọn tay).
 * Khi có classGroup: loại SV đã có enrollment (enrolled/completed) cùng môn + kỳ như lớp mẫu trong nhóm
 * (không hiển thị SV đã học môn đó trong học kỳ đó — trùng logic gán tay).
 */
async function listEligibleStudents(semesterId, options = {}) {
  const ctx = await prepareAutoEnrollmentBatchContext(semesterId, options, {
    applyStudentLimit: false,
  });
  const { semester, eligibleMajorMeta, filters } = ctx;
  let students = ctx.students;

  const cg =
    options.classGroup != null && String(options.classGroup).trim() !== ""
      ? String(options.classGroup).trim()
      : "";
  let excludedAlreadyEnrolledInSubject = 0;
  let templateClassCodeForList = null;

  if (cg) {
    const period = resolveSectionPeriodForGroupTemplate(
      ctx,
      options.curriculumSemesterOrder,
    );
    if (period) {
      const templatePool = await buildTemplateClassSectionPool(ctx, cg);
      const template = pickTemplateClassSection({
        classSections: templatePool,
        classGroup: cg,
        enrollmentMode: ctx.enrollmentMode,
        curriculumIdFilter: ctx.curriculumIdFilter,
        sectionSemester: period.sectionSemester,
        sectionAcademicYear: period.sectionAcademicYear,
        curriculumSemesterOrderVal: period.curriculumSemesterOrderVal,
      });
      if (template && template.subject) {
        templateClassCodeForList = template.classCode || null;
        const ids = students.map((s) => s._id);
        const busy = await repo.findStudentIdsWithEnrollmentForSubjectPeriod(
          ids,
          template.subject,
          template.semester,
          template.academicYear,
        );
        const busySet = new Set(busy.map((id) => String(id)));
        const before = students.length;
        students = students.filter((s) => !busySet.has(String(s._id)));
        excludedAlreadyEnrolledInSubject = before - students.length;
      }
    }
  }

  return {
    semester: {
      _id: semester._id,
      semesterNum: semester.semesterNum,
      academicYear: semester.academicYear,
      code: semester.code,
      name: semester.name,
    },
    students: students.map(serializeStudentRow),
    count: students.length,
    filters: {
      ...filters,
      curriculumMajorCodesResolved: eligibleMajorMeta.curriculumMajorCodes,
      effectiveMajorCodes: eligibleMajorMeta.effectiveMajorCodes,
      curriculumEnrollmentYearRange:
        eligibleMajorMeta.curriculumEnrollmentYearRange || null,
      excludedAlreadyEnrolledInSubject,
      templateClassCodeForList,
    },
  };
}

/**
 * Chọn đúng một ClassSection: theo ObjectId, hoặc mã lớp / tên lớp (khớp duy nhất).
 */
async function resolveManualAssignClassSectionId(classSectionIdRaw, classLookup, ctx) {
  const pool = Array.isArray(ctx.classSections) ? ctx.classSections : [];

  if (classSectionIdRaw != null && String(classSectionIdRaw).trim() !== '') {
    const id = String(classSectionIdRaw).trim();
    if (mongoose.Types.ObjectId.isValid(id)) {
      return id;
    }
  }

  const raw = String(classLookup || "").trim();
  if (!raw) {
    const e = new Error(
      "Chọn lớp trong danh sách hoặc nhập mã lớp / tên lớp học phần",
    );
    e.statusCode = 400;
    throw e;
  }

  const upper = raw.toUpperCase();
  const byCode = pool.filter(
    (cs) => String(cs.classCode || "").trim().toUpperCase() === upper,
  );
  if (byCode.length === 1) {
    return String(byCode[0]._id);
  }
  if (byCode.length > 1) {
    const e = new Error(
      `Có ${byCode.length} lớp trùng mã trong danh sách — chọn trực tiếp trong dropdown.`,
    );
    e.statusCode = 400;
    throw e;
  }

  const lower = raw.toLowerCase();
  const byName = pool.filter(
    (cs) => String(cs.className || "").trim().toLowerCase() === lower,
  );
  if (byName.length === 1) {
    return String(byName[0]._id);
  }
  if (byName.length > 1) {
    const e = new Error(
      `Có ${byName.length} lớp trùng tên "${raw}" — nhập đúng mã lớp (classCode).`,
    );
    e.statusCode = 400;
    throw e;
  }

  const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let sec = await ClassSection.findOne({
    classCode: new RegExp(`^${esc}$`, "i"),
    status: { $in: OPEN_CLASS_STATUSES },
  }).lean();
  if (sec) {
    return String(sec._id);
  }

  const nameMatches = await ClassSection.find({
    className: new RegExp(`^${esc}$`, "i"),
    status: { $in: OPEN_CLASS_STATUSES },
  })
    .select("_id classCode className")
    .limit(3)
    .lean();
  if (nameMatches.length === 1) {
    return String(nameMatches[0]._id);
  }
  if (nameMatches.length > 1) {
    const e = new Error(
      `Có nhiều lớp trùng tên "${raw}" — nhập mã lớp (VD: ${nameMatches[0].classCode}).`,
    );
    e.statusCode = 400;
    throw e;
  }

  const e = new Error(
    `Không tìm thấy lớp đang mở (published/scheduled) với mã/tên: "${raw}"`,
  );
  e.statusCode = 404;
  throw e;
}

/**
 * Gán các sinh viên đã chọn vào một lớp học (cùng điều kiện lọc với tab Auto Enrollment).
 * Có thể truyền `classSectionId` hoặc `options.classLookup` (mã lớp / tên lớp).
 */
async function assignStudentsToClassSection(
  semesterId,
  classSectionIdRaw,
  studentIds,
  options = {},
) {
  const dryRun = options.dryRun === true;
  if (!semesterId || !mongoose.Types.ObjectId.isValid(String(semesterId))) {
    const e = new Error('semesterId không hợp lệ');
    e.statusCode = 400;
    throw e;
  }
  const rawIds = Array.isArray(studentIds) ? studentIds : [];
  const uniqueIds = [
    ...new Set(
      rawIds
        .map((id) => String(id || '').trim())
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (uniqueIds.length === 0) {
    const e = new Error('studentIds phải có ít nhất một mã hợp lệ');
    e.statusCode = 400;
    throw e;
  }

  const ctx = await prepareAutoEnrollmentBatchContext(semesterId, options, {
    applyStudentLimit: false,
  });
  const allowed = new Set(ctx.students.map((s) => String(s._id)));
  const eligibleIds = uniqueIds.filter((id) => allowed.has(id));
  const notEligible = uniqueIds.filter((id) => !allowed.has(id));

  const classLookup =
    options.classLookup != null && String(options.classLookup).trim() !== ""
      ? String(options.classLookup).trim()
      : "";

  const classSectionId = await resolveManualAssignClassSectionId(
    classSectionIdRaw,
    classLookup,
    ctx,
  );

  const classSection = await ClassSection.findById(classSectionId).lean();
  if (!classSection) {
    const e = new Error('Class section not found');
    e.statusCode = 404;
    throw e;
  }
  if (!OPEN_CLASS_STATUSES.includes(classSection.status)) {
    const e = new Error('Class section is not open for enrollment');
    e.statusCode = 400;
    throw e;
  }

  const cg =
    options.classGroup != null && String(options.classGroup).trim() !== ''
      ? String(options.classGroup).trim()
      : '';
  if (cg && String(classSection.classGroup || '').trim() !== cg) {
    const e = new Error('Lớp không thuộc nhóm lớp đã chọn');
    e.statusCode = 400;
    throw e;
  }

  const enrollmentMode = options.mode === 'retake' ? 'retake' : 'normal';
  const sem = ctx.semester;
  if (enrollmentMode === 'retake') {
    if (
      Number(classSection.semester) !== Number(sem.semesterNum) ||
      String(classSection.academicYear || '').trim() !==
        String(sem.academicYear || '').trim()
    ) {
      const e = new Error('Lớp học không thuộc học kỳ hệ thống đang chọn');
      e.statusCode = 400;
      throw e;
    }
  }

  const subjectIdStr = String(classSection.subject);
  const semNum = Number(classSection.semester);
  const ayStr = String(classSection.academicYear || '').trim();

  const existingForStudents =
    eligibleIds.length > 0
      ? await ClassEnrollment.find({
          student: { $in: eligibleIds.map((id) => new mongoose.Types.ObjectId(id)) },
          status: { $in: Array.from(ACTIVE_ENROLLMENT_STATUSES) },
        })
          .populate({
            path: 'classSection',
            select: 'semester academicYear subject',
          })
          .lean()
      : [];

  const results = [];
  let enrolled = 0;
  let skipped = 0;
  const semesterCode = String(sem.code || `${ayStr}_HK${semNum}`);

  for (const studentId of eligibleIds) {
    const dupTarget = existingForStudents.some(
      (en) =>
        String(en.student) === studentId &&
        String(en.classSection?._id || en.classSection) === String(classSectionId),
    );
    if (dupTarget) {
      results.push({
        studentId,
        ok: false,
        reason: 'already_in_section',
        message: 'Sinh viên đã có trong lớp này',
      });
      skipped += 1;
      continue;
    }

    const subjectConflict = existingForStudents.some((en) => {
      if (String(en.student) !== studentId) return false;
      const cs = en.classSection;
      if (!cs) return false;
      return (
        Number(cs.semester) === semNum &&
        String(cs.academicYear || '').trim() === ayStr &&
        String(cs.subject) === subjectIdStr
      );
    });
    if (subjectConflict) {
      results.push({
        studentId,
        ok: false,
        reason: 'subject_already_enrolled',
        message: 'Sinh viên đã có lớp khác cho cùng môn trong học kỳ này',
      });
      skipped += 1;
      continue;
    }

    const r = await enrollStudentInSection(studentId, classSectionId, semesterCode, {
      dryRun,
      note: options.note || `Manual assign (${semesterCode})`,
    });
    if (r.success) {
      enrolled += 1;
      results.push({ studentId, ok: true, enrollmentId: r.enrollment?._id });
    } else {
      skipped += 1;
      results.push({
        studentId,
        ok: false,
        reason: r.reason || 'error',
        message: r.message || 'Enrollment failed',
      });
    }
  }

  return {
    classSectionId: String(classSection._id),
    classCode: classSection.classCode,
    className: classSection.className,
    dryRun,
    requested: uniqueIds.length,
    notEligible,
    enrolled,
    skipped,
    results,
  };
}

/**
 * Tạo một ClassSection mới (cùng nhóm với filter "Nhóm lớp học phần") rồi gán SV đã chọn.
 * - Chế độ theo khung CT: semester + academicYear trên lớp = kỳ trong khung + academicYear của curriculum.
 * - Chế độ học lại / không chọn khung: dùng semesterNum + academicYear của HK hệ thống.
 */
async function createClassSectionAndAssignStudents(
  semesterId,
  studentIds,
  options = {},
  newSection = {},
) {
  const dryRun = options.dryRun === true;
  const cgOpt =
    options.classGroup != null && String(options.classGroup).trim() !== ""
      ? String(options.classGroup).trim()
      : "";
  if (!cgOpt) {
    const e = new Error(
      "Cần chọn Nhóm lớp học phần trước khi tạo lớp và gán sinh viên",
    );
    e.statusCode = 400;
    throw e;
  }

  if (!semesterId || !mongoose.Types.ObjectId.isValid(String(semesterId))) {
    const e = new Error("semesterId không hợp lệ");
    e.statusCode = 400;
    throw e;
  }
  const rawIds = Array.isArray(studentIds) ? studentIds : [];
  const uniqueIds = [
    ...new Set(
      rawIds
        .map((id) => String(id || "").trim())
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (uniqueIds.length === 0) {
    const e = new Error("studentIds phải có ít nhất một mã hợp lệ");
    e.statusCode = 400;
    throw e;
  }

  const ctx = await prepareAutoEnrollmentBatchContext(semesterId, options, {
    applyStudentLimit: false,
  });
  const allowed = new Set(ctx.students.map((s) => String(s._id)));
  const eligibleIds = uniqueIds.filter((id) => allowed.has(id));
  if (eligibleIds.length === 0) {
    const e = new Error(
      "Không có sinh viên nào trong danh sách chọn khớp bộ lọc hiện tại",
    );
    e.statusCode = 400;
    throw e;
  }

  const enrollmentMode = ctx.enrollmentMode;
  const sem = ctx.semester;
  const curriculumIdFilter = ctx.curriculumIdFilter;

  let sectionSemester;
  let sectionAcademicYear;
  let curriculumSemesterOrderVal;
  let curriculumIdForSection;

  if (enrollmentMode === "retake" || !curriculumIdFilter) {
    sectionSemester = Number(sem.semesterNum);
    sectionAcademicYear = String(sem.academicYear || "").trim();
    if (!sectionAcademicYear || Number.isNaN(sectionSemester)) {
      const e = new Error("Học kỳ hệ thống không hợp lệ");
      e.statusCode = 400;
      throw e;
    }
    const optionalCso = newSection.curriculumSemesterOrder;
    if (
      optionalCso != null &&
      optionalCso !== "" &&
      !Number.isNaN(Number(optionalCso))
    ) {
      const o = Number(optionalCso);
      if (Number.isInteger(o) && o >= 1) curriculumSemesterOrderVal = o;
    }
    curriculumIdForSection =
      curriculumIdFilter &&
      mongoose.Types.ObjectId.isValid(String(curriculumIdFilter))
        ? String(curriculumIdFilter)
        : undefined;
  } else {
    const cur = ctx.activeCurriculums.find(
      (c) => String(c._id) === String(curriculumIdFilter),
    );
    if (!cur) {
      const e = new Error("Không tìm thấy khung chương trình");
      e.statusCode = 400;
      throw e;
    }
    const o = Number(newSection.curriculumSemesterOrder);
    if (!Number.isInteger(o) || o < 1) {
      const e = new Error(
        "Thiếu curriculumSemesterOrder — chọn học kỳ trong khung CT (dropdown HK)",
      );
      e.statusCode = 400;
      throw e;
    }
    curriculumSemesterOrderVal = o;
    sectionSemester = o;
    sectionAcademicYear = String(cur.academicYear || "").trim();
    if (!sectionAcademicYear) {
      const e = new Error("Khung CT thiếu academicYear");
      e.statusCode = 400;
      throw e;
    }
    curriculumIdForSection = String(curriculumIdFilter);
  }

  const subRaw = String(newSection.subjectId ?? newSection.subject ?? "").trim();
  const teaRaw = String(newSection.teacherId ?? newSection.teacher ?? "").trim();
  const explicitManual =
    String(newSection.classCode ?? "").trim() !== "" &&
    mongoose.Types.ObjectId.isValid(subRaw) &&
    mongoose.Types.ObjectId.isValid(teaRaw);

  let classCode;
  let className;
  let subjectId;
  let teacherId;
  let maxCap;
  let templateSection = null;

  if (explicitManual) {
    classCode = String(newSection.classCode ?? "").trim();
    className = String(newSection.className ?? "").trim();
    subjectId = subRaw;
    teacherId = teaRaw;
    maxCap = Number(newSection.maxCapacity);
    if (!classCode || !className) {
      const e = new Error("Thiếu mã lớp hoặc tên lớp");
      e.statusCode = 400;
      throw e;
    }
    if (!Number.isInteger(maxCap) || maxCap < 1) {
      const e = new Error("maxCapacity phải là số nguyên từ 1 trở lên");
      e.statusCode = 400;
      throw e;
    }
  } else {
    className = String(newSection.className ?? "").trim();
    if (!className) {
      const e = new Error("Nhập tên lớp học phần");
      e.statusCode = 400;
      throw e;
    }
    const templatePool = await buildTemplateClassSectionPool(ctx, cgOpt);
    templateSection = pickTemplateClassSection({
      classSections: templatePool,
      classGroup: cgOpt,
      enrollmentMode,
      curriculumIdFilter,
      sectionSemester,
      sectionAcademicYear,
      curriculumSemesterOrderVal,
    });
    if (!templateSection) {
      const e = new Error(
        "Không tìm thấy lớp mẫu cùng nhóm đã chọn: cần ít nhất một ClassSection (nháp / đã xếp lịch / đã công bố / khóa) với đúng classGroup, có môn và giảng viên. " +
          "Nếu mới tạo nhóm, hãy tạo một lớp học phần cho nhóm đó trong Quản lý lớp trước, hoặc kiểm tra HK trong khung và niên khóa trên lớp có khớp với dropdown đang chọn.",
      );
      e.statusCode = 404;
      throw e;
    }
    subjectId = String(templateSection.subject);
    teacherId = String(templateSection.teacher);
    const capFromOpt =
      parsePositiveInteger(options.newClassMaxCapacity) ??
      parsePositiveInteger(options.limit);
    const tmplCap = Number(templateSection.maxCapacity);
    maxCap =
      capFromOpt ??
      (Number.isInteger(tmplCap) && tmplCap >= 1 ? tmplCap : 40);
    if (!Number.isInteger(maxCap) || maxCap < 1) {
      const e = new Error("Sĩ số lớp không hợp lệ");
      e.statusCode = 400;
      throw e;
    }
    if (dryRun) {
      classCode = `${String(templateSection.classCode || "CLASS").slice(0, 48)}-NS(auto)`;
    } else {
      classCode = await generateUniqueSplitClassCode(templateSection.classCode);
    }
  }

  let status = "published";
  if (newSection.status === "scheduled") status = "scheduled";
  else if (newSection.status === "draft") status = "draft";

  const wouldCreate = {
    classCode,
    className,
    subject: subjectId,
    teacher: teacherId,
    semester: sectionSemester,
    academicYear: sectionAcademicYear,
    maxCapacity: maxCap,
    status,
    classGroup: cgOpt,
    curriculum: curriculumIdForSection,
    curriculumSemesterOrder: curriculumSemesterOrderVal,
    templateClassCode: templateSection ? templateSection.classCode : undefined,
  };

  if (dryRun) {
    return {
      dryRun: true,
      wouldCreate,
      requested: uniqueIds.length,
      eligible: eligibleIds.length,
      notEligible: uniqueIds.filter((id) => !allowed.has(id)),
    };
  }

  let created;
  try {
    created = await classSectionService.createClassSection({
      classCode,
      className,
      subject: subjectId,
      teacher: teacherId,
      semester: sectionSemester,
      academicYear: sectionAcademicYear,
      maxCapacity: maxCap,
      status,
      classGroup: cgOpt,
      curriculum: curriculumIdForSection,
      curriculumSemesterOrder: curriculumSemesterOrderVal,
    });
  } catch (err) {
    const e = new Error(err.message || "Tạo lớp thất bại");
    e.statusCode = 400;
    throw e;
  }

  const assignResult = await assignStudentsToClassSection(
    semesterId,
    String(created._id),
    uniqueIds,
    options,
  );

  return {
    ...assignResult,
    createdClassSectionId: String(created._id),
    createdClass: true,
  };
}

module.exports = {
  autoEnrollAfterPayment,
  previewAutoEnrollment,
  findAvailableClassSection,
  enrollStudentInSection,
  triggerAutoEnrollment,
  listEligibleStudents,
  assignStudentsToClassSection,
  createClassSectionAndAssignStudents,
  getBulkWriteUpsertedCount,
  // Enrollment Management
  getEnrollmentStatus,
  deleteEnrollments,
  deleteWaitlists,
  promoteWaitlist,
};
