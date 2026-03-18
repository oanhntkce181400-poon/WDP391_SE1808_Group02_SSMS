const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Waitlist = require('../../models/waitlist.model');
const curriculumService = require('../../services/curriculum.service');
const paymentValidationService = require('../../services/paymentValidation.service');
const repo = require('./autoEnrollment.repository');

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
const OPEN_CLASS_STATUSES = ['published', 'scheduled'];
const ACTIVE_ENROLLMENT_STATUSES = new Set(repo.ACTIVE_ENROLLMENT_STATUSES);
const LEGACY_WAITLIST_INDEX_NAME = 'student_1_subject_1_status_1';

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
    const normalizedMajorCode = String(majorCode || '').trim().toUpperCase();
    if (!normalizedMajorCode) continue;
    aliasesByCode.set(normalizedMajorCode, [normalizedMajorCode]);
  }

  for (const major of majors) {
    const majorCode = String(major.majorCode || '').trim().toUpperCase();
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

    state.occupiedClassSectionIds.add(classSectionId);
    if (!classSection) continue;

    if (ACTIVE_ENROLLMENT_STATUSES.has(enrollment.status)) {
      state.activeSubjectIds.add(String(classSection.subject));
    }
  }

  return stateByStudent;
}

// Trong batch, có sinh viên lúc đầu chưa có state sẵn.
// Hàm này bảo đảm mọi sinh viên đều có một state object thống nhất để cập nhật trong RAM.
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
function buildClassSectionPools(classSections) {
  const classSectionsById = new Map();
  const classSectionsBySubject = new Map();

  for (const classSection of classSections) {
    const normalized = {
      ...classSection,
      currentEnrollment: Number(classSection.currentEnrollment || 0),
      maxCapacity: Number(classSection.maxCapacity || 0),
    };

    const classSectionId = String(normalized._id);
    const subjectId = String(normalized.subject);

    classSectionsById.set(classSectionId, normalized);
    if (!classSectionsBySubject.has(subjectId)) {
      classSectionsBySubject.set(subjectId, []);
    }
    classSectionsBySubject.get(subjectId).push(normalized);
  }

  return {
    classSectionsById,
    classSectionsBySubject,
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
        .map((value) => String(value || '').trim().toUpperCase())
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
    String(student?.majorCode || '').trim().toUpperCase() || 'N/A',
    curriculumService.resolveStudentEnrollmentYear(student) ?? 'N/A',
  ].join(':');
}

// Tìm curriculum phù hợp cho sinh viên, có cache để nhiều sinh viên cùng profile không phải resolve lại.
async function getCurriculumMatchCached(cache, student, options) {
  const cacheKey = buildCurriculumMatchCacheKey(student);
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, curriculumService.getCurriculumMatchForStudent(student, options));
  }

  return cache.get(cacheKey);
}

// Xác định sinh viên đang thuộc curriculum semester nào ở thời điểm chạy batch.
// Ưu tiên lấy từ hồ sơ student nếu trường currentCurriculumSemester đã được set.
// Nếu chưa có, hệ thống tính động dựa trên năm nhập học và học kỳ hiện tại.
async function getCurriculumSemesterOrderCached(cache, student, semester, options) {
  // Ưu tiên dùng currentCurriculumSemester từ student (nếu đã được set)
  if (student.currentCurriculumSemester != null && student.currentCurriculumSemester >= 1 && student.currentCurriculumSemester <= 9) {
    return student.currentCurriculumSemester;
  }

  const enrollmentYear = curriculumService.resolveStudentEnrollmentYear(student);
  const cacheKey = `${enrollmentYear ?? 'N/A'}:${semester.semesterNum}:${semester.academicYear}:${options.termsPerYear}`;
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      paymentValidationService.calculateStudentCurriculumSemester(student, semester, options),
    );
  }

  return cache.get(cacheKey);
}

// Gom waitlist vào bộ nhớ đệm của batch, chưa ghi DB ngay.
// Cách làm này giúp:
// - chống tạo waitlist trùng trong cùng lượt chạy
// - bulk upsert cuối batch nhanh hơn và ổn định hơn
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
      reason: 'already_waiting',
      message: 'Student is already in waitlist for this subject',
    };
  }

  options.waitlistSet?.add(waitKey);
  if (Array.isArray(options.pendingWaitlistDocs)) {
    options.pendingWaitlistDocs.push({
      student: studentId,
      subject: subjectId,
      targetSemester: semesterNum,
      targetAcademicYear: academicYear,
      status: 'WAITING',
      cancelReason: reason || undefined,
    });
  }

  return {
    success: true,
    created: true,
    message:
      options.dryRun === true
        ? 'Dry run: waitlist would be created'
        : 'Queued waitlist for persistence',
  };
}

// Tạo object mô tả phạm vi batch để trả về cho FE/log.
function buildFilterSummary({ majorCodes, studentCodes, limit, onlyStudentsWithoutEnrollments }) {
  return {
    majorCodes,
    studentCodes,
    limit,
    onlyStudentsWithoutEnrollments,
  };
}

// Chọn lớp phù hợp nhất cho một môn theo rule hiện tại:
// - sinh viên chưa chiếm lớp đó
// - lớp chưa đầy
// - ưu tiên lớp có ít sinh viên hơn để phân tải đều
// - nếu bằng nhau thì lấy classCode nhỏ hơn để kết quả ổn định, dễ debug
function pickAvailableClassSection(subjectId, classSectionsBySubject, occupiedClassSectionIds) {
  const subjectKey = String(subjectId);
  const pool = classSectionsBySubject.get(subjectKey) || [];
  let selected = null;

  for (const classSection of pool) {
    if (occupiedClassSectionIds?.has(String(classSection._id))) {
      continue;
    }

    if (classSection.currentEnrollment >= classSection.maxCapacity) {
      continue;
    }

    if (
      !selected ||
      classSection.currentEnrollment < selected.currentEnrollment ||
      (classSection.currentEnrollment === selected.currentEnrollment &&
        String(classSection.classCode || '').localeCompare(String(selected.classCode || '')) < 0)
    ) {
      selected = classSection;
    }
  }

  return selected;
}

// Chuẩn hóa cách đọc số bản ghi upserted vì shape kết quả bulkWrite thay đổi theo driver/version.
function getBulkWriteUpsertedCount(result) {
  if (!result) return 0;
  if (typeof result.upsertedCount === 'number') return result.upsertedCount;
  if (typeof result.nUpserted === 'number') return result.nUpserted;
  if (typeof result.result?.nUpserted === 'number') return result.result.nUpserted;
  if (Array.isArray(result.result?.upserted)) return result.result.upserted.length;
  if (result.upsertedIds && typeof result.upsertedIds === 'object') {
    return Object.keys(result.upsertedIds).length;
  }
  return 0;
}

// Biến lỗi kỹ thuật khi ghi batch thành thông báo dễ hiểu hơn cho admin/dev.
function formatAutoEnrollmentPersistenceError(error) {
  if (
    error?.code === 11000 &&
    /waitlists/i.test(String(error?.message || '')) &&
    String(error?.message || '').includes(LEGACY_WAITLIST_INDEX_NAME)
  ) {
    return new Error(
      `Failed to persist auto enrollment batch: outdated waitlist index ${LEGACY_WAITLIST_INDEX_NAME}. ` +
        'Run npm run fix:waitlist-indexes to allow one WAITING waitlist per student, subject, and semester.',
    );
  }

  return new Error(`Failed to persist auto enrollment batch: ${error.message}`);
}

// Sinh câu lỗi chi tiết để biết sinh viên fail do thiếu dữ liệu hay do chưa cấu hình curriculum.
function formatCurriculumError(match, student) {
  const majorCode = match?.majorCode || student?.majorCode || 'N/A';
  const cohort = student?.cohort ?? 'N/A';
  const enrollmentYear = match?.enrollmentYear ?? student?.enrollmentYear ?? 'N/A';
  const availableCurriculums = match?.availableCurriculumCodes?.length
    ? match.availableCurriculumCodes.join(', ')
    : 'none';

  switch (match?.reason) {
    case 'missing_major_code':
      return `Missing majorCode; cannot resolve curriculum (studentCode=${student?.studentCode || 'N/A'})`;
    case 'missing_enrollment_year':
      return `Missing enrollmentYear; cannot select curriculum (majorCode=${majorCode}, cohort=${cohort}, availableCurriculums=${availableCurriculums})`;
    case 'no_active_curriculum_for_major':
      return `No active curriculum configured for major ${majorCode} (cohort=${cohort}, enrollmentYear=${enrollmentYear})`;
    case 'no_curriculum_for_enrollment_year':
      return `No curriculum matches enrollmentYear ${enrollmentYear} for major ${majorCode} (availableCurriculums=${availableCurriculums})`;
    default:
      return `Curriculum not found (majorCode=${majorCode}, enrollmentYear=${enrollmentYear}, cohort=${cohort})`;
  }
}

// Preflight là phần tổng quan để biết dữ liệu nền có đủ sạch để chạy batch hay không.
// Nó không trực tiếp xếp lớp, nhưng rất hữu ích cho dashboard và kiểm tra cấu hình.
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
  dryRun,
  filters,
}) {
  const warnings = [];

  if (activeCurriculums.length === 0) {
    warnings.push('No active curriculum exists in the database.');
  }
  if (studentsMissingEnrollmentYear > 0) {
    warnings.push(`${studentsMissingEnrollmentYear} active students are missing enrollmentYear.`);
  }
  if (Object.keys(studentsWithoutCurriculumByMajor).length > 0) {
    warnings.push('Some student majors do not have a matching active curriculum.');
  }
  if (curriculumSubjectMappingIssues > 0) {
    warnings.push(`${curriculumSubjectMappingIssues} curriculum-course records are missing linked subject data.`);
  }
  if (classSections.length === 0) {
    warnings.push(`No open class sections found for semester ${semester.code}.`);
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
    openClassSubjectCount: new Set(classSections.map((classSection) => String(classSection.subject))).size,
    studentsMissingEnrollmentYear,
    studentsWithoutCurriculumByMajor,
    studentsWithoutCurriculumByReason,
    curriculumSubjectMappingIssues,
    filters,
    warnings,
  };
}

// Cache môn học của từng curriculum semester để giảm query lặp cho nhiều sinh viên giống nhau.
async function getCurriculumSemesterSubjectsCached(cache, curriculumId, curriculumSemesterOrder) {
  const cacheKey = buildCurriculumSemesterKey(curriculumId, curriculumSemesterOrder);
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      curriculumService.getSubjectsBySemester(curriculumId, curriculumSemesterOrder),
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
    $expr: { $lt: ['$currentEnrollment', '$maxCapacity'] },
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
      reason: 'already_waiting',
      message: 'Student is already in waitlist for this subject',
    };
  }

  if (options.dryRun === true) {
    options.waitlistSet?.add(waitKey);
    return {
      success: true,
      created: true,
      reason: 'dry_run',
      message: 'Dry run: waitlist would be created',
    };
  }

  try {
    const waitlist = await Waitlist.create({
      student: studentId,
      subject: subjectId,
      targetSemester: semesterNum,
      targetAcademicYear: academicYear,
      status: 'WAITING',
      cancelReason: reason || undefined,
    });

    options.waitlistSet?.add(waitKey);
    return {
      success: true,
      created: true,
      waitlistId: waitlist._id,
      message: 'Student moved to waitlist',
    };
  } catch (error) {
    if (error?.code === 11000) {
      options.waitlistSet?.add(waitKey);
      return {
        success: true,
        created: false,
        reason: 'already_waiting',
        message: 'Student is already in waitlist for this subject',
      };
    }

    return {
      success: false,
      reason: 'error',
      message: error.message,
    };
  }
}

// Ghi enrollment cho một sinh viên vào một class section cụ thể.
// Quy trình:
// 1. Tăng currentEnrollment có điều kiện để giữ chỗ
// 2. Tạo ClassEnrollment
// 3. Nếu tạo enrollment fail thì rollback lại currentEnrollment
async function enrollStudentInSection(studentId, classSectionId, semesterCode, options = {}) {
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
        $expr: { $lt: ['$currentEnrollment', '$maxCapacity'] },
      },
      {
        $inc: { currentEnrollment: 1 },
      },
      { new: true },
    ).lean();

    if (!classSection) {
      const existingClassSection = await repo.findClassSectionById(classSectionId);
      if (!existingClassSection) {
        return {
          success: false,
          reason: 'class_not_found',
          message: 'Class section not found',
        };
      }

      if (!OPEN_CLASS_STATUSES.includes(existingClassSection.status)) {
        return {
          success: false,
          reason: 'class_not_open',
          message: 'Class section is not open for enrollment',
        };
      }

      return {
        success: false,
        reason: 'class_full',
        message: 'Class is full',
      };
    }

    try {
      const enrollment = await ClassEnrollment.create({
        student: studentId,
        classSection: classSectionId,
        enrollmentDate: new Date(),
        status: 'enrolled',
        isOverload: options.isOverload === true,
        note: options.note || `Auto-enrolled for payment period ${semesterCode}`,
      });

      return {
        success: true,
        enrollment,
        classSection,
      };
    } catch (error) {
      await ClassSection.updateOne({ _id: classSectionId }, { $inc: { currentEnrollment: -1 } });

      if (error?.code === 11000) {
        return {
          success: false,
          reason: 'duplicate',
          message: 'Duplicate enrollment detected',
        };
      }

      return {
        success: false,
        reason: 'error',
        message: error.message,
      };
    }
  } catch (error) {
    return {
      success: false,
      reason: 'error',
      message: error.message,
    };
  }
}

// Auto-enroll theo từng sinh viên sau khi hoàn tất thanh toán.
// Đây là luồng đơn lẻ, khác với triggerAutoEnrollment là luồng batch do admin kích hoạt.
async function autoEnrollAfterPayment(studentId, curriculumSemesterOrder) {
  const student = await repo.findStudentById(studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const currentSemester = await repo.findCurrentSemester();
  if (!currentSemester) {
    const error = new Error('Current semester not found');
    error.statusCode = 404;
    throw error;
  }

  const curriculumMatch = await curriculumService.getCurriculumMatchForStudent(student);
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
      message: 'No subjects configured in this curriculum semester',
      totalSubjects: 0,
      enrolledSubjects: [],
      failedSubjects: [],
    };
  }

  const enrolledSubjects = [];
  const failedSubjects = [];

  for (const subjectData of semesterSubjects) {
    const subject = subjectData.subject;
    if (!subject?._id) continue;

    const classSection = await findAvailableClassSection(
      subject._id,
      currentSemester.semesterNum,
      currentSemester.academicYear,
    );

    if (!classSection) {
      failedSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        reason: 'no_class_section',
        message: 'No available class section found',
      });
      continue;
    }

    const semesterPaymentCode = paymentValidationService.generateSemesterPaymentCode(
      curriculumSemesterOrder,
      curriculum.code,
    );

    const result = await enrollStudentInSection(studentId, classSection._id, semesterPaymentCode, {
      isOverload: false,
      note: `Auto enrolled after payment for ${currentSemester.code}`,
    });

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
    semesterName: currentSemester.name,
    academicYear: currentSemester.academicYear,
  };
}

// Preview cho biết nếu auto-enrollment chạy cho sinh viên này thì các môn/lớp nào có thể được gán.
// Hàm này không ghi DB, chỉ trả dữ liệu để FE hiển thị hoặc để admin kiểm tra.
async function previewAutoEnrollment(studentId) {
  const student = await repo.findStudentById(studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const currentSemester = await repo.findCurrentSemester();
  if (!currentSemester) {
    const error = new Error('Current semester not found');
    error.statusCode = 404;
    throw error;
  }

  const curriculumMatch = await curriculumService.getCurriculumMatchForStudent(student);
  if (!curriculumMatch.curriculum) {
    return {
      hasCurriculum: false,
      subjects: [],
      message: formatCurriculumError(curriculumMatch, student),
    };
  }

  const curriculum = curriculumMatch.curriculum;

  // Ưu tiên dùng currentCurriculumSemester từ student (nếu đã được set)
  let curriculumSemesterOrder;
  if (student.currentCurriculumSemester != null && student.currentCurriculumSemester >= 1 && student.currentCurriculumSemester <= 9) {
    curriculumSemesterOrder = student.currentCurriculumSemester;
  } else {
    curriculumSemesterOrder = await paymentValidationService.calculateStudentCurriculumSemester(
      student,
      currentSemester,
    );
  }

  const semesterSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  const openClassSections = await repo.findOpenClassSections({
    semesterNum: currentSemester.semesterNum,
    academicYear: currentSemester.academicYear,
    statuses: OPEN_CLASS_STATUSES,
  });
  const { classSectionsBySubject, classSectionsById } = buildClassSectionPools(openClassSections);

  const existingEnrollments = await repo.findSemesterEnrollments(
    [studentId],
    Array.from(classSectionsById.keys()),
    { includeAllStatuses: false },
  );

  const studentStateMap = buildStudentStateMap(
    existingEnrollments,
    new Map(Array.from(classSectionsById.entries()).map(([key, value]) => [key, value])),
  );
  const studentState = getOrCreateStudentState(studentStateMap, studentId);

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
async function triggerAutoEnrollment(semesterId, options = {}) {
  const startedAt = Date.now();
  const dryRun = options.dryRun === true;
  const requestedMajorCodes = normalizeCodeList(options.majorCodes);
  const requestedStudentCodes = normalizeCodeList(options.studentCodes);
  const onlyStudentsWithoutEnrollments = options.onlyStudentsWithoutEnrollments === true;
  const studentLimit = parsePositiveInteger(options.limit);
  const filters = buildFilterSummary({
    majorCodes: requestedMajorCodes,
    studentCodes: requestedStudentCodes,
    limit: studentLimit,
    onlyStudentsWithoutEnrollments,
  });

  const semester = await repo.findSemesterById(semesterId);
  if (!semester) {
    const error = new Error('Semester not found');
    error.statusCode = 404;
    throw error;
  }

  // Nạp dữ liệu nền song song để giảm thời gian chờ:
  // - candidateStudents: các sinh viên active có thể được xét
  // - activeCurriculums: toàn bộ curriculum đang active
  // - classSections: các lớp mở trong học kỳ cần chạy
  // - termsPerYear: số học kỳ trong năm để tính curriculum semester
  const [candidateStudents, activeCurriculums, classSections, termsPerYear] = await Promise.all([
    repo.findEligibleStudents({
      majorCodes: requestedMajorCodes,
      studentCodes: requestedStudentCodes,
    }),
    repo.findActiveCurriculums(),
    repo.findOpenClassSections({
      semesterNum: semester.semesterNum,
      academicYear: semester.academicYear,
      statuses: OPEN_CLASS_STATUSES,
    }),
    paymentValidationService.resolveTermsPerYear(semester),
  ]);

  // Chuẩn bị các lookup/cache trong RAM để giảm việc lặp query trong vòng for lớn.
  const { classSectionsById, classSectionsBySubject } = buildClassSectionPools(classSections);
  const classSectionIds = Array.from(classSectionsById.keys());
  const studentIds = candidateStudents.map((student) => student._id);
  const majorCodes = Array.from(
    new Set(
      candidateStudents
        .map((student) => String(student.majorCode || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const majorAliasesByCode = buildMajorAliasesByCode(
    majorCodes,
    await repo.findMajorsByCodes(majorCodes),
  );
  const curriculumLookup = curriculumService.buildCurriculumLookup(activeCurriculums);

  // Lấy enrollment/waitlist đang tồn tại để:
  // - tránh tạo enrollment trùng
  // - biết sinh viên đã có môn nào rồi
  // - biết đã có waitlist chưa
  const [existingEnrollments, existingWaitlists] =
    studentIds.length > 0
      ? await Promise.all([
          classSectionIds.length > 0
            ? repo.findSemesterEnrollments(studentIds, classSectionIds, {
                includeAllStatuses: true,
              })
            : Promise.resolve([]),
          repo.findSemesterWaitlists(studentIds, semester.semesterNum, semester.academicYear),
        ])
      : [[], []];

  const studentStateMap = buildStudentStateMap(existingEnrollments, classSectionsById);
  const waitlistSet = new Set(
    existingWaitlists.map((waitlist) => buildStudentSubjectKey(waitlist.student, waitlist.subject)),
  );
  const curriculumSemesterSubjectsCache = new Map();
  const curriculumMatchCache = new Map();
  const curriculumSemesterOrderCache = new Map();

  // Filter cuối cùng áp vào danh sách candidate.
  // onlyStudentsWithoutEnrollments thường dùng khi admin chỉ muốn xử lý các sinh viên chưa có enrollment active nào.
  let students = candidateStudents;
  if (onlyStudentsWithoutEnrollments) {
    students = students.filter((student) => {
      const studentState = studentStateMap.get(String(student._id));
      return !studentState || studentState.activeSubjectIds.size === 0;
    });
  }
  if (studentLimit) {
    students = students.slice(0, studentLimit);
  }

  const logs = [];
  let totalEnrollments = 0;
  let waitlisted = 0;
  let duplicates = 0;
  let failed = 0;
  let studentsWithErrors = 0;
  let studentsWithEnrollments = 0;
  let studentsMissingEnrollmentYear = students.filter(
    (student) => curriculumService.resolveStudentEnrollmentYear(student) == null,
  ).length;
  let curriculumSubjectMappingIssues = 0;
  const studentsWithoutCurriculumByMajor = {};
  const studentsWithoutCurriculumByReason = {};
  const pendingEnrollmentDocs = [];
  const pendingWaitlistDocs = [];
  const classSectionIncrementMap = new Map();

  // Xử lý từng sinh viên một để log kết quả chi tiết theo từng người.
  for (const student of students) {
    const studentLog = {
      studentId: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      enrolled: [],
      waitlisted: [],
      skipped: [],
      errors: [],
    };

    try {
      // Bước 1: tìm curriculum phù hợp với major + enrollmentYear/cohort của sinh viên.
      const curriculumMatch = await getCurriculumMatchCached(curriculumMatchCache, student, {
        curriculums: activeCurriculums,
        curriculumLookup,
        majorAliasesByCode,
      });

      if (!curriculumMatch.curriculum) {
        const majorKey = curriculumMatch.majorCode || student.majorCode || 'UNKNOWN';
        studentsWithoutCurriculumByMajor[majorKey] =
          (studentsWithoutCurriculumByMajor[majorKey] || 0) + 1;
        studentsWithoutCurriculumByReason[curriculumMatch.reason || 'unknown'] =
          (studentsWithoutCurriculumByReason[curriculumMatch.reason || 'unknown'] || 0) + 1;

        studentLog.errors.push(formatCurriculumError(curriculumMatch, student));
        failed += 1;
        studentsWithErrors += 1;
        logs.push(studentLog);
        continue;
      }

      const curriculum = curriculumMatch.curriculum;
      // Bước 2: xác định sinh viên hiện đang học tới curriculum semester thứ mấy.
      const curriculumSemesterOrder = await getCurriculumSemesterOrderCached(
        curriculumSemesterOrderCache,
        student,
        semester,
        { termsPerYear },
      );

      studentLog.curriculumCode = curriculum.code;
      studentLog.curriculumSemesterOrder = curriculumSemesterOrder;

      // Bước 3: lấy danh sách subject mà curriculum quy định cho semester order này.
      const semesterSubjects = await getCurriculumSemesterSubjectsCached(
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

      const studentState = getOrCreateStudentState(studentStateMap, student._id);

      // Bước 4: duyệt từng subject trong curriculum semester để gán lớp hoặc waitlist.
      for (const subjectData of semesterSubjects) {
        const subject = subjectData?.subject;
        if (!subject?._id) {
          curriculumSubjectMappingIssues += 1;
          failed += 1;
          studentLog.errors.push('Curriculum course is missing linked subject data');
          continue;
        }

        const subjectId = String(subject._id);
        if (studentState.activeSubjectIds.has(subjectId)) {
          duplicates += 1;
          studentLog.skipped.push(`${subject.subjectCode}: already enrolled`);
          continue;
        }

        const classSection = pickAvailableClassSection(
          subjectId,
          classSectionsBySubject,
          studentState.occupiedClassSectionIds,
        );

        // Nếu không còn lớp mở cho môn này, sinh viên được đưa sang waitlist thay vì bỏ qua im lặng.
        if (!classSection) {
          const waitlistResult = queueWaitlistIfNeeded(
            student._id,
            subject._id,
            semester.semesterNum,
            semester.academicYear,
            'Auto enrollment: no available class section',
            {
              dryRun,
              waitlistSet,
              pendingWaitlistDocs,
            },
          );

          if (waitlistResult.success) {
            if (waitlistResult.created) {
              waitlisted += 1;
            }
            studentLog.waitlisted.push({
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              waitlistId: waitlistResult.waitlistId,
              message: waitlistResult.message,
            });
          } else {
            failed += 1;
            studentLog.errors.push(`${subject.subjectCode}: ${waitlistResult.message}`);
          }
          continue;
        }

        const semesterPaymentCode = paymentValidationService.generateSemesterPaymentCode(
          curriculumSemesterOrder,
          curriculum.code,
        );

        // Chưa ghi DB ngay; chỉ gom document và cập nhật state trong RAM.
        // Lý do phải tăng currentEnrollment trong RAM ở đây:
        // - batch có thể xếp nhiều sinh viên liên tiếp vào cùng một lớp
        // - nếu không "giữ chỗ tạm" trong bộ nhớ, các sinh viên sau sẽ tiếp tục thấy lớp còn chỗ
        //   và bị xếp vượt maxCapacity trước khi tới bước bulkWrite cuối batch
        pendingEnrollmentDocs.push({
          student: student._id,
          classSection: classSection._id,
          enrollmentDate: new Date(),
          status: 'enrolled',
          isOverload: false,
          note: `Auto enrolled by semester trigger ${semester.code} (${semesterPaymentCode})`,
        });
        incrementMapCounter(classSectionIncrementMap, classSection._id, 1);
        totalEnrollments += 1;
        classSection.currentEnrollment += 1;
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
  if (!dryRun) {
    try {
      await repo.bulkUpsertEnrollments(pendingEnrollmentDocs);
      await repo.bulkIncrementClassSections(classSectionIncrementMap);
      await repo.bulkUpsertWaitlists(pendingWaitlistDocs);
    } catch (error) {
      const persistError = formatAutoEnrollmentPersistenceError(error);
      persistError.statusCode = 500;
      throw persistError;
    }
  }

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
    dryRun,
    filters,
  });

  const durationMs = Date.now() - startedAt;

  // success ở đây là mức batch-level:
  // - true khi không có lỗi nào bị tính vào failed
  // - false khi có ít nhất một lỗi trong quá trình xử lý
  return {
    success: failed === 0,
    dryRun,
    durationMs,
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
      studentsWithEnrollments,
      studentsWithErrors,
      totalEnrollments,
      waitlisted,
      duplicates,
      failed,
    },
    preflight,
    filters,
    logs,
  };
}

module.exports = {
  autoEnrollAfterPayment,
  previewAutoEnrollment,
  findAvailableClassSection,
  enrollStudentInSection,
  triggerAutoEnrollment,
  getBulkWriteUpsertedCount,
};
