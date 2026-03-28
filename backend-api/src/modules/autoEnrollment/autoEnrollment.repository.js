const mongoose = require('mongoose');
const Student = require('../../models/student.model');
const Semester = require('../../models/semester.model');
const Curriculum = require('../../models/curriculum.model');
const Major = require('../../models/major.model');
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Waitlist = require('../../models/waitlist.model');
const {
  getNonEmptyClassGroupsListsByStudentIds,
  studentMatchesClassGroupFilter,
} = require('../../utils/studentHomeroomFromEnrollments');

const ACTIVE_ENROLLMENT_STATUSES = ['enrolled', 'completed'];
const PROMOTABLE_CLASS_SECTION_STATUSES =
  process.env.AUTO_ENROLLMENT_INCLUDE_DRAFT === 'true'
    ? ['published', 'scheduled', 'draft']
    : ['published', 'scheduled'];

// Debug flag: bật=true khi cần trace, tắt=false khi hoàn thiện
const _DEBUG = false;
function _log(...args) {
  if (_DEBUG) console.log('[Repo]', ...args);
}

// Repository chỉ phụ trách truy vấn / ghi dữ liệu.
// Mọi quyết định nghiệp vụ như: sinh viên nào được xếp, khi nào waitlist,
// chọn lớp nào trước... nằm ở service, không đặt ở đây.
async function findSemesterById(id) {
  return Semester.findById(id).lean();
}

async function findCurrentSemester() {
  return Semester.findOne({ isCurrent: true }).lean();
}

async function findStudentById(id) {
  return Student.findById(id).lean();
}

// Repository vẫn tự normalize mảng code một lần nữa để phòng trường hợp
// service hoặc script nội bộ truyền dữ liệu chưa sạch vào.
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

/**
 * Normalize a list of academic year strings — deduplicate, trim, remove blanks.
 * Used when querying ClassSection across multiple academic years simultaneously.
 */
function normalizeAcademicYearList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse "2018-2023", "2026/2034" → { startYear, endYear } */
function parseAcademicYearRangeString(academicYear) {
  if (!academicYear || typeof academicYear !== "string") return null;
  const parts = academicYear
    .trim()
    .split(/[-/]/)
    .map((p) => parseInt(p, 10))
    .filter((n) => !Number.isNaN(n));
  if (parts.length < 2) return null;
  return { startYear: parts[0], endYear: parts[1] };
}

/** Giống logic findEligibleStudents: đúng curriculumId hoặc chưa gán khung nhưng majorCode khớp + năm nhập học trong khoảng khung. */
function studentMatchesStatusFilter(
  student,
  curriculumOid,
  majorCodesForFilter,
  enrollmentYearRange = null,
) {
  const codes = majorCodesForFilter && majorCodesForFilter.length ? majorCodesForFilter : null;
  const mc = String(student?.majorCode || "").trim().toUpperCase();
  if (!curriculumOid && !codes) return true;

  if (curriculumOid) {
    const rawC = student?.curriculumId;
    const hasC =
      rawC != null &&
      String(rawC).trim() !== "" &&
      String(rawC) !== "null";
    if (hasC) {
      if (String(rawC) !== String(curriculumOid)) return false;
      if (codes && mc && !codes.includes(mc)) return false;
      return true;
    }
    if (codes) {
      if (
        enrollmentYearRange &&
        enrollmentYearRange.startYear != null &&
        enrollmentYearRange.endYear != null
      ) {
        const ey = Number.parseInt(student?.enrollmentYear, 10);
        if (!Number.isFinite(ey)) return false;
        if (ey < enrollmentYearRange.startYear || ey > enrollmentYearRange.endYear) {
          return false;
        }
      }
      return codes.includes(mc);
    }
    return false;
  }

  return codes.includes(mc);
}

/**
 * Gợi ý mã ngành từ mã / tên khung (CURR_SE_18 → SE, K28_AI_2026 → AI).
 */
function inferMajorCodeHintsFromCurriculum(cur) {
  const hints = new Set();
  const code = String(cur?.code || "").toUpperCase();
  if (code) {
    const m1 = code.match(/CURR_([A-Z]{2,4})_/);
    if (m1) hints.add(m1[1]);
    const m2 = code.match(/_([A-Z]{2})_/);
    if (m2) hints.add(m2[1]);
    const m3 = code.match(/K\d+_([A-Z]{2,4})_/i);
    if (m3) hints.add(m3[1].toUpperCase());
  }
  return [...hints];
}

/**
 * Mã ngành (SE, AI, …) gắn với khung CT: ưu tiên majorId → Major.majorCode,
 * fallback tên Major theo curriculum.major, mã khung (CURR_SE_18), rồi gợi ý từ code.
 */
async function resolveMajorCodesFromCurriculumDoc(cur) {
  if (!cur) return [];

  if (cur.majorId) {
    const m = await Major.findById(cur.majorId).select("majorCode").lean();
    if (m?.majorCode) return normalizeCodeList([m.majorCode]);
  }

  const name = String(cur.major || "").trim();
  if (name) {
    const escaped = escapeRegex(name);
    const byName = await Major.findOne({
      isActive: true,
      $or: [
        { majorName: new RegExp(`^${escaped}$`, "i") },
        { majorName: new RegExp(escaped, "i") },
      ],
    })
      .select("majorCode")
      .lean();
    if (byName?.majorCode) return normalizeCodeList([byName.majorCode]);
  }

  const hints = inferMajorCodeHintsFromCurriculum(cur);
  for (const hint of hints) {
    const mc = String(hint || "")
      .trim()
      .toUpperCase();
    if (!mc || mc.length < 2) continue;
    const m = await Major.findOne({ isActive: true, majorCode: mc })
      .select("majorCode")
      .lean();
    if (m?.majorCode) return normalizeCodeList([m.majorCode]);
  }

  return [];
}

async function resolveMajorCodesFromCurriculumId(curriculumOid) {
  if (!curriculumOid || !mongoose.Types.ObjectId.isValid(String(curriculumOid))) {
    return [];
  }
  const cur = await Curriculum.findById(curriculumOid)
    .select("majorId major code name")
    .lean();
  return resolveMajorCodesFromCurriculumDoc(cur);
}

async function findEligibleStudents(filters = {}) {
  const query = {
    isActive: true,
    $or: [{ academicStatus: 'enrolled' }, { academicStatus: { $exists: false } }],
  };

  const requestedMajorCodes = normalizeCodeList(filters.majorCodes);
  const curriculumIdRaw = filters.curriculumId;
  const hasCurriculum =
    curriculumIdRaw != null &&
    String(curriculumIdRaw).trim() !== "" &&
    mongoose.Types.ObjectId.isValid(String(curriculumIdRaw));

  let curriculumDoc = null;
  let curriculumMajorCodes = [];
  let curriculumEnrollmentYearRange = null;

  if (hasCurriculum) {
    curriculumDoc = await Curriculum.findById(curriculumIdRaw)
      .select("academicYear majorId major code name")
      .lean();
    curriculumMajorCodes = await resolveMajorCodesFromCurriculumDoc(curriculumDoc);
    if (curriculumDoc?.academicYear) {
      curriculumEnrollmentYearRange = parseAcademicYearRangeString(
        curriculumDoc.academicYear,
      );
    }
  }

  /** Khi có khung CT: chỉ SV đúng ngành của khung (giao với majorCodes form nếu có). */
  let effectiveMajorCodes = [];
  if (hasCurriculum) {
    if (curriculumMajorCodes.length > 0) {
      effectiveMajorCodes = requestedMajorCodes.length
        ? requestedMajorCodes.filter((c) => curriculumMajorCodes.includes(c))
        : curriculumMajorCodes.slice();
    } else {
      effectiveMajorCodes = requestedMajorCodes.slice();
      if (effectiveMajorCodes.length === 0) {
        _log(
          "findEligibleStudents: có curriculumId nhưng không suy ra được mã ngành và không có majorCodes — 0 SV",
        );
        return {
          students: [],
          meta: {
            curriculumMajorCodes: [],
            effectiveMajorCodes: [],
            curriculumEnrollmentYearRange,
          },
        };
      }
    }
  } else {
    effectiveMajorCodes = requestedMajorCodes.slice();
  }

  if (effectiveMajorCodes.length > 0) {
    query.majorCode = { $in: effectiveMajorCodes };
  }

  const studentCodes = normalizeCodeList(filters.studentCodes);
  if (studentCodes.length > 0) {
    query.studentCode = { $in: studentCodes };
  }

  if (hasCurriculum) {
    const oid = new mongoose.Types.ObjectId(String(curriculumIdRaw));
    if (!query.$and) query.$and = [];

    const unassignedCurriculum = {
      $and: [
        {
          $or: [
            { curriculumId: { $exists: false } },
            { curriculumId: null },
          ],
        },
      ],
    };
    if (
      curriculumEnrollmentYearRange &&
      Number.isFinite(Number(curriculumEnrollmentYearRange.startYear)) &&
      Number.isFinite(Number(curriculumEnrollmentYearRange.endYear))
    ) {
      unassignedCurriculum.$and.push({
        enrollmentYear: {
          $gte: curriculumEnrollmentYearRange.startYear,
          $lte: curriculumEnrollmentYearRange.endYear,
        },
      });
    }

    query.$and.push({
      $or: [{ curriculumId: oid }, unassignedCurriculum],
    });
  }

  const classGroupFilter =
    filters.classGroup && typeof filters.classGroup === 'string' && filters.classGroup.trim() !== ''
      ? filters.classGroup.trim()
      : '';

  // Debug: log query thực tế
  _log('findEligibleStudents filters:', JSON.stringify(filters, null, 2));
  _log('findEligibleStudents query:', JSON.stringify(query, null, 2));

  let results = await Student.find(query)
    .select(
      'studentCode fullName email majorCode cohort enrollmentYear currentCurriculumSemester curriculumId academicStatus isActive userId classSection',
    )
    .sort({ studentCode: 1, _id: 1 })
    .lean();

  // Nhóm lớp: đồng bộ với Lớp SH suy từ ClassSection.classGroup (enrollment enrolled),
  // không chỉ trường Student.classSection (legacy).
  if (classGroupFilter) {
    const listsMap = await getNonEmptyClassGroupsListsByStudentIds(
      results.map((r) => r._id),
    );
    results = results.filter((s) =>
      studentMatchesClassGroupFilter(
        listsMap.get(String(s._id)) || [],
        s.classSection,
        classGroupFilter,
      ),
    );
  }

  _log(`findEligibleStudents => found ${results.length} students`);
  // Log first 3 to see classSection values
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const s = results[i];
    _log(
      `  [${i + 1}] ${s.studentCode} | ${s.fullName} | major=${s.majorCode} | classSection="${s.classSection}" | curriculumId=${s.curriculumId}`,
    );
  }

  return {
    students: results,
    meta: {
      curriculumMajorCodes,
      effectiveMajorCodes,
      curriculumEnrollmentYearRange,
    },
  };
}

async function findActiveCurriculums() {
  return Curriculum.find({ status: 'active' })
    .select('code name major academicYear useRelationalStructure status')
    .lean();
}

async function findMajorsByCodes(majorCodes) {
  if (!Array.isArray(majorCodes) || majorCodes.length === 0) {
    return [];
  }

  return Major.find({
    isActive: true,
    majorCode: { $in: majorCodes },
  })
    .select('majorCode majorName')
    .lean();
}

async function findOpenClassSections({ semesterNum, academicYear, statuses, classGroup }) {
  const query = {
    semester: semesterNum,
    academicYear,
    status: { $in: statuses },
  };
  if (classGroup && typeof classGroup === 'string' && classGroup.trim() !== '') {
    query.classGroup = classGroup.trim();
  }
  return ClassSection.find(query)
    .select(
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex curriculum curriculumSemesterOrder',
    )
    .lean();
}

async function findOpenClassSectionsBySemesterYears({
  semesterNum,
  academicYears,
  statuses,
  classGroup,
}) {
  const query = {
    semester: semesterNum,
    status: { $in: statuses },
  };
  const normalizedAcademicYears = normalizeAcademicYearList(academicYears);
  if (normalizedAcademicYears.length === 1) {
    query.academicYear = normalizedAcademicYears[0];
  } else if (normalizedAcademicYears.length > 1) {
    query.academicYear = { $in: normalizedAcademicYears };
  }
  if (classGroup && typeof classGroup === 'string' && classGroup.trim() !== '') {
    query.classGroup = classGroup.trim();
  }
  return ClassSection.find(query)
    .select(
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex curriculum curriculumSemesterOrder',
    )
    .lean();
}

// Load tất cả class sections đang mở (không filter theo semester)
// Dùng cho normal enrollment mode - sẽ match bằng classGroup
async function findOpenClassSectionsAllSemesters({ statuses, classGroup }) {
  const query = { status: { $in: statuses } };
  if (classGroup && typeof classGroup === 'string' && classGroup.trim() !== '') {
    query.classGroup = classGroup.trim();
  }
  return ClassSection.find(query)
    .select(
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex curriculum curriculumSemesterOrder',
    )
    .lean();
}

// Lớp mẫu để copy môn/GV khi tạo lớp thủ công — gồm cả draft/locked (không dùng làm pool xếp tự động).
const TEMPLATE_CLASS_STATUSES = ['draft', 'scheduled', 'published', 'locked'];

async function findClassSectionsByGroupForTemplate(classGroup) {
  const cg =
    classGroup && typeof classGroup === 'string' ? classGroup.trim() : '';
  if (!cg) {
    return [];
  }
  return ClassSection.find({
    classGroup: cg,
    status: { $in: TEMPLATE_CLASS_STATUSES },
  })
    .select(
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex curriculum curriculumSemesterOrder',
    )
    .lean();
}

// Lấy các enrollment hiện có của tập sinh viên trong tập class section đã mở của học kỳ.
// Dữ liệu này dùng để:
// - tránh xếp trùng môn
// - biết student đang chiếm lớp nào
// - biết student có active enrollment sẵn chưa
async function findSemesterEnrollments(studentIds, classSectionIds, options = {}) {
  const query = {
    student: { $in: studentIds },
    classSection: { $in: classSectionIds },
  };

  if (options.includeAllStatuses !== true) {
    query.status = { $in: ACTIVE_ENROLLMENT_STATUSES };
  }

  return ClassEnrollment.find(query)
    .select('student classSection status isOverload grade enrollmentDate')
    .lean();
}

/**
 * Sinh viên đã có enrollment (enrolled/completed) vào bất kỳ lớp nào cùng môn + kỳ trên ClassSection.
 * Dùng để ẩn SV khỏi danh sách «tạo lớp mới / gán tay» khi đã học môn đó trong cùng học kỳ khung|hệ thống.
 */
async function findStudentIdsWithEnrollmentForSubjectPeriod(
  studentIds,
  subjectId,
  semester,
  academicYear,
) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }
  const sid = mongoose.Types.ObjectId.isValid(String(subjectId))
    ? new mongoose.Types.ObjectId(String(subjectId))
    : null;
  if (!sid) {
    return [];
  }

  const sem = Number(semester);
  if (Number.isNaN(sem)) {
    return [];
  }
  const ay = String(academicYear || '').trim();
  if (!ay) {
    return [];
  }

  const sectionIds = await ClassSection.find({
    subject: sid,
    semester: sem,
    academicYear: ay,
  })
    .select('_id')
    .lean()
    .then((rows) => rows.map((r) => r._id));

  if (sectionIds.length === 0) {
    return [];
  }

  return ClassEnrollment.find({
    student: { $in: studentIds },
    classSection: { $in: sectionIds },
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
  })
    .distinct('student')
    .then((ids) => ids.map((id) => String(id)));
}

async function findSemesterWaitlists(
  studentIds,
  semesterNum,
  academicYear,
  options = {},
) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }

  let yearList;
  if (
    Array.isArray(options.targetAcademicYears) &&
    options.targetAcademicYears.length > 0
  ) {
    yearList = Array.from(
      new Set(
        options.targetAcademicYears
          .map((y) => String(y || '').trim())
          .filter(Boolean),
      ),
    );
  } else {
    const p = String(academicYear || '').trim();
    yearList = p ? [p] : [];
  }

  if (yearList.length === 0) {
    return [];
  }

  const ayQuery = yearList.length === 1 ? yearList[0] : { $in: yearList };

  return Waitlist.find({
    student: { $in: studentIds },
    targetSemester: Number(semesterNum),
    targetAcademicYear: ayQuery,
    status: 'WAITING',
  })
    .select('student subject targetSemester targetAcademicYear status')
    .lean();
}

/**
 * Sinh viên đã có xếp lớp (enrollment còn hiệu lực) trong bất kỳ lớp nào
 * thuộc đúng học kỳ hệ thống (semester + academicYear).
 * Dùng để loại khỏi autoroll, tránh chạy lại trên SV đã có lớp trong kỳ đó.
 *
 * `options.extraAcademicYears`: thêm các chuỗi niên khóa (vd academicYear của khung CT).
 * Normal mode thường mở lớp với academicYear = niên khóa khung (2026-2030) trong khi
 * HK hệ thống dropdown là 2025-2026 — không gộp thì filter "đã có lớp" luôn rỗng.
 */
async function findStudentIdsWithEnrollmentInSystemSemester(
  studentIds,
  semesterNum,
  academicYear,
  options = {},
) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }

  const years = new Set();
  const primary = String(academicYear || '').trim();
  if (primary) {
    years.add(primary);
  }
  const extras = options.extraAcademicYears;
  if (Array.isArray(extras)) {
    for (const y of extras) {
      const t = String(y || '').trim();
      if (t) {
        years.add(t);
      }
    }
  }

  const yearList = Array.from(years);
  if (yearList.length === 0) {
    return [];
  }

  const sectionIds = await ClassSection.find({
    semester: Number(semesterNum),
    academicYear: { $in: yearList },
  })
    .select('_id')
    .lean()
    .then((rows) => rows.map((r) => r._id));

  if (sectionIds.length === 0) {
    return [];
  }

  return ClassEnrollment.find({
    student: { $in: studentIds },
    classSection: { $in: sectionIds },
    status: 'enrolled',
  })
    .distinct('student');
}

// Dùng bulkWrite + upsert để chèn hàng loạt enrollment một cách hiệu quả.
// filter(student + classSection) giúp chống tạo trùng nếu batch bị chạy lặp.
async function bulkUpsertEnrollments(enrollmentDocs, options = {}) {
  if (!Array.isArray(enrollmentDocs) || enrollmentDocs.length === 0) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
      insertedClassSectionCounts: {},
    };
  }

  const operations = enrollmentDocs.map((doc) => ({
    updateOne: {
      filter: {
        student: doc.student,
        classSection: doc.classSection,
      },
      update: {
        $setOnInsert: doc,
      },
      upsert: true,
    },
  }));

  const bulkResult = await ClassEnrollment.bulkWrite(operations, {
    ordered: false,
    ...(options.session ? { session: options.session } : {}),
  });
  const insertedIndexes = new Set();

  if (bulkResult?.upsertedIds && typeof bulkResult.upsertedIds === 'object') {
    Object.keys(bulkResult.upsertedIds).forEach((key) => {
      const parsedIndex = Number(key);
      if (Number.isInteger(parsedIndex) && parsedIndex >= 0) {
        insertedIndexes.add(parsedIndex);
      }
    });
  }

  if (Array.isArray(bulkResult?.result?.upserted)) {
    bulkResult.result.upserted.forEach((item) => {
      const parsedIndex = Number(item?.index);
      if (Number.isInteger(parsedIndex) && parsedIndex >= 0) {
        insertedIndexes.add(parsedIndex);
      }
    });
  }

  const insertedClassSectionCounts = {};
  insertedIndexes.forEach((index) => {
    const classSectionId = enrollmentDocs[index]?.classSection;
    if (!classSectionId) {
      return;
    }

    const key = String(classSectionId);
    insertedClassSectionCounts[key] = Number(insertedClassSectionCounts[key] || 0) + 1;
  });

  return {
    matchedCount: Number(bulkResult?.matchedCount || 0),
    modifiedCount: Number(bulkResult?.modifiedCount || 0),
    upsertedCount: Number(bulkResult?.upsertedCount || 0),
    upsertedIds: bulkResult?.upsertedIds || {},
    insertedClassSectionCounts,
  };
}

// Waitlist cũng được upsert theo bộ khóa student + subject + target semester + year.
// Như vậy cùng một sinh viên sẽ không bị xếp chờ lặp nhiều lần cho cùng một môn trong cùng học kỳ.
async function bulkUpsertWaitlists(waitlistDocs, options = {}) {
  if (!Array.isArray(waitlistDocs) || waitlistDocs.length === 0) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
    };
  }

  const operations = waitlistDocs.map((doc) => ({
    updateOne: {
      filter: {
        student: doc.student,
        subject: doc.subject,
        targetSemester: doc.targetSemester,
        targetAcademicYear: doc.targetAcademicYear,
        status: 'WAITING',
      },
      update: {
        $setOnInsert: doc,
      },
      upsert: true,
    },
  }));

  return Waitlist.bulkWrite(operations, {
    ordered: false,
    ...(options.session ? { session: options.session } : {}),
  });
}

// Sau khi service quyết định được các enrollment mới, repository mới ghi tăng currentEnrollment.
// Việc cộng dồn trước trong Map rồi bulkWrite một lần giúp giảm số lần round-trip tới DB.
async function bulkIncrementClassSections(classSectionIncrementMap, options = {}) {
  const incrementEntries =
    classSectionIncrementMap instanceof Map
      ? Array.from(classSectionIncrementMap.entries())
      : Object.entries(classSectionIncrementMap || {});

  const operations = incrementEntries
    .filter(([, incrementBy]) => Number(incrementBy) > 0)
    .map(([classSectionId, incrementBy]) => ({
      updateOne: {
        filter: { _id: classSectionId },
        update: { $inc: { currentEnrollment: incrementBy } },
      },
    }));

  if (operations.length === 0) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
    };
  }

  return ClassSection.bulkWrite(operations, {
    ordered: false,
    ...(options.session ? { session: options.session } : {}),
  });
}

async function findClassSectionById(id) {
  return ClassSection.findById(id).lean();
}

// ─────────────────────────────────────────────
// Enrollment Management — CRUD cho trạng thái xếp lớp
// ─────────────────────────────────────────────

/**
 * Lấy trạng thái enrollment + waitlist của sinh viên cho một HK cụ thể.
 * Trả về danh sách gộp, mỗi dòng gắn nhãn "enrolled" hoặc "waitlisted".
 * Dùng cho admin xem trước khi quyết định reset / promote.
 */
async function getEnrollmentStatus({
  semesterNum,
  academicYear,
  classGroup,
  curriculumId,
  curriculumSemesterOrder,
  majorCodes: majorCodesParam = [],
}) {
  const majorCodesFromClient = normalizeCodeList(
    Array.isArray(majorCodesParam) ? majorCodesParam : [],
  );

  let curriculumOid = null;
  if (curriculumId && mongoose.Types.ObjectId.isValid(String(curriculumId))) {
    curriculumOid = new mongoose.Types.ObjectId(String(curriculumId));
  }

  let majorCodesForFilter = [...majorCodesFromClient];
  let enrollmentYearRangeForStatus = null;
  if (curriculumOid) {
    const curLean = await Curriculum.findById(curriculumOid)
      .select("academicYear majorId major code name")
      .lean();
    if (curLean?.academicYear) {
      enrollmentYearRangeForStatus = parseAcademicYearRangeString(curLean.academicYear);
    }
    const fromCur = await resolveMajorCodesFromCurriculumDoc(curLean);
    if (fromCur.length > 0) {
      majorCodesForFilter = majorCodesFromClient.length
        ? majorCodesFromClient.filter((c) => fromCur.includes(c))
        : fromCur;
    } else if (majorCodesForFilter.length === 0) {
      majorCodesForFilter = [];
    }
  }

  // 1. Tìm classSection thuộc HK này (+ khung / kỳ trong khung nếu có)
  const csOrderRaw =
    curriculumSemesterOrder != null && curriculumSemesterOrder !== ''
      ? Number(curriculumSemesterOrder)
      : null;
  const csOrder =
    csOrderRaw != null && Number.isFinite(csOrderRaw) && csOrderRaw >= 1
      ? csOrderRaw
      : null;

  const semNum = Number(semesterNum);
  const ay = String(academicYear);

  /**
   * ClassSection.academicYear thường là niên khóa khung CT (vd 2026–2030), không trùng
   * Semester.academicYear (vd 2025–2026). Khi lọc theo khung, bắt buộc dùng cùng ý tưởng
   * với getDistinctClassGroups: nhánh curriculum không ép academicYear; nhánh legacy
   * (lớp chưa gắn curriculum) vẫn theo HK hệ thống.
   */
  let csQuery;
  if (curriculumOid) {
    const branchCurriculum = {
      semester: semNum,
      curriculum: curriculumOid,
    };
    if (classGroup && typeof classGroup === 'string' && classGroup.trim()) {
      branchCurriculum.classGroup = classGroup.trim();
    }
    if (csOrder != null) {
      branchCurriculum.curriculumSemesterOrder = csOrder;
    }

    const noCurriculum = {
      $or: [{ curriculum: null }, { curriculum: { $exists: false } }],
    };
    const branchLegacy = {
      $and: [
        { semester: semNum },
        { academicYear: ay },
        noCurriculum,
        ...(classGroup && typeof classGroup === 'string' && classGroup.trim()
          ? [{ classGroup: classGroup.trim() }]
          : []),
      ],
    };

    csQuery = { $or: [branchCurriculum, branchLegacy] };
  } else {
    csQuery = {
      semester: semNum,
      academicYear: ay,
    };
    if (classGroup && typeof classGroup === 'string' && classGroup.trim()) {
      csQuery.classGroup = classGroup.trim();
    }
    if (csOrder != null) {
      csQuery.curriculumSemesterOrder = csOrder;
    }
  }

  const classSections = await ClassSection.find(csQuery)
    .select('_id classCode className subject semester academicYear classGroup curriculum curriculumSemesterOrder')
    .lean();
  const csIds = classSections.map((cs) => cs._id);

  // 2. Lấy enrollment (chỉ enrolled, không lấy dropped/completed)
  const enrollmentDocs = await ClassEnrollment.find({
    classSection: { $in: csIds },
    status: 'enrolled',
  })
    .populate('student', 'studentCode fullName curriculumId majorCode')
    .populate({
      path: 'classSection',
      select: 'classCode className subject',
      populate: {
        path: 'subject',
        select: 'subjectCode subjectName',
      },
    })
    .lean();

  // 3. Lấy waitlist (chỉ WAITING)
  const waitlistQuery = {
    targetSemester: Number(semesterNum),
    targetAcademicYear: String(academicYear),
    status: 'WAITING',
  };
  if (classGroup && typeof classGroup === 'string') {
    const groupedSubjectIds = [
      ...new Set(classSections.map((section) => String(section.subject || '')).filter(Boolean)),
    ];
    waitlistQuery.subject = {
      $in: groupedSubjectIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }
  const waitlistDocs = await Waitlist.find(waitlistQuery)
    .populate('student', 'studentCode fullName curriculumId majorCode')
    .populate('subject', 'subjectCode subjectName')
    .lean();

  // 4. Build kết quả + lọc theo khung / major (waitlist không gắn classSection)
  const enrolledRows = enrollmentDocs
    .filter((e) =>
      studentMatchesStatusFilter(
        e.student,
        curriculumOid,
        majorCodesForFilter,
        enrollmentYearRangeForStatus,
      ),
    )
    .map((e) => ({
      type: 'enrolled',
      studentCode: e.student?.studentCode,
      studentName: e.student?.fullName,
      studentId: e.student?._id,
      subjectCode: e.classSection?.subject?.subjectCode,
      subjectName: e.classSection?.subject?.subjectName,
      classCode: e.classSection?.classCode,
      classSectionId: e.classSection?._id,
      status: e.status,
      enrolledAt: e.enrollmentDate,
    }));

  const waitlistedRows = waitlistDocs
    .filter((w) =>
      studentMatchesStatusFilter(
        w.student,
        curriculumOid,
        majorCodesForFilter,
        enrollmentYearRangeForStatus,
      ),
    )
    .map((w) => ({
      type: 'waitlisted',
      studentCode: w.student?.studentCode,
      studentName: w.student?.fullName,
      studentId: w.student?._id,
      subjectCode: w.subject?.subjectCode,
      subjectName: w.subject?.subjectName,
      waitlistId: w._id,
      targetSemester: w.targetSemester,
      targetAcademicYear: w.targetAcademicYear,
      status: w.status,
      createdAt: w.createdAt,
    }));

  return {
    summary: {
      enrolledCount: enrolledRows.length,
      waitlistedCount: waitlistedRows.length,
      uniqueStudentsEnrolled: new Set(enrolledRows.map((r) => String(r.studentId))).size,
      uniqueStudentsWaitlisted: new Set(waitlistedRows.map((r) => String(r.studentId))).size,
    },
    enrolled: enrolledRows,
    waitlisted: waitlistedRows,
  };
}

/**
 * Xóa enrollment theo HK + classGroup (tùy chọn).
 * Trả về số lượng đã xóa.
 */
async function deleteEnrollments({ semesterNum, academicYear, classGroup, studentId }) {
  const query = {};

  if (semesterNum != null) query.semester = Number(semesterNum);
  if (academicYear) query.academicYear = String(academicYear);

  if (studentId && mongoose.Types.ObjectId.isValid(String(studentId))) {
    query.student = new mongoose.Types.ObjectId(String(studentId));
  }

  if (classGroup && typeof classGroup === 'string') {
    // Lấy classSection thuộc nhóm này
    const csQuery = { classGroup: classGroup.trim() };
    if (semesterNum != null) csQuery.semester = Number(semesterNum);
    if (academicYear) csQuery.academicYear = String(academicYear);
    const sections = await ClassSection.find(csQuery).select('_id').lean();
    const csIds = sections.map((s) => s._id);
    if (csIds.length === 0) return { deletedCount: 0 };
    query.classSection = { $in: csIds };
  }

  const result = await ClassEnrollment.deleteMany(query);
  return { deletedCount: result.deletedCount };
}

/**
 * Xóa waitlist theo HK + classGroup (tùy chọn).
 * Trả về số lượng đã xóa.
 */
async function deleteWaitlists({ semesterNum, academicYear, classGroup, studentId, subjectId }) {
  const query = {
    status: 'WAITING',
  };

  if (semesterNum != null) query.targetSemester = Number(semesterNum);
  if (academicYear) query.targetAcademicYear = String(academicYear);
  if (studentId && mongoose.Types.ObjectId.isValid(String(studentId))) {
    query.student = new mongoose.Types.ObjectId(String(studentId));
  }
  if (subjectId && mongoose.Types.ObjectId.isValid(String(subjectId))) {
    query.subject = new mongoose.Types.ObjectId(String(subjectId));
  }

  if (classGroup && typeof classGroup === 'string' && classGroup.trim()) {
    // Lấy subject thuộc classGroup (qua classSection → subject)
    const sections = await ClassSection.find({ classGroup: classGroup.trim() })
      .select('subject')
      .lean();
    const subjectIds = [...new Set(sections.map((s) => s.subject && String(s.subject)).filter(Boolean))];
    if (subjectIds.length > 0) {
      query.subject = { $in: subjectIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else {
      // Không có subject nào → không xóa gì
      return { deletedCount: 0 };
    }
  }

  const result = await Waitlist.deleteMany(query);
  return { deletedCount: result.deletedCount };
}

/**
 * Promote một waitlist: chuyển từ WAITING → ENROLLED.
 * Tìm lớp trống phù hợp (cùng subject, cùng targetSemester/academicYear, còn chỗ)
 * và tạo enrollment, đồng thời giảm currentEnrollment của lớp cũ (nếu có) và tăng lớp mới.
 * Nếu không tìm được lớp → trả lỗi.
 */
async function promoteWaitlist(waitlistId, { targetClassSectionId } = {}) {
  const waitlist = await Waitlist.findById(waitlistId).lean();
  if (!waitlist) {
    const err = new Error('Waitlist not found');
    err.statusCode = 404;
    throw err;
  }
  if (waitlist.status !== 'WAITING') {
    const err = new Error(`Waitlist already ${waitlist.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Xác định classSection để enroll
  let classSection;
  if (targetClassSectionId && mongoose.Types.ObjectId.isValid(String(targetClassSectionId))) {
    classSection = await ClassSection.findById(targetClassSectionId).lean();
  } else {
    // Tự động tìm lớp trống phù hợp: cùng subject, semester, academicYear, còn chỗ
    const candidates = await ClassSection.find({
      subject: waitlist.subject,
      semester: waitlist.targetSemester,
      academicYear: waitlist.targetAcademicYear,
      status: { $in: PROMOTABLE_CLASS_SECTION_STATUSES },
      $expr: { $lt: ['$currentEnrollment', '$maxCapacity'] },
    })
      .sort({ currentEnrollment: 1 })
      .lean();

    if (candidates.length === 0) {
      const err = new Error('No available class section found for this subject in the target semester');
      err.statusCode = 409;
      throw err;
    }
    classSection = candidates[0];
  }

  // Kiểm tra sinh viên đã enroll môn này chưa
  const existing = await ClassEnrollment.findOne({
    student: waitlist.student,
    classSection: classSection._id,
    status: 'enrolled',
  }).lean();
  if (existing) {
    // Đã enroll → cập nhật waitlist thành ENROLLED luôn
    await Waitlist.findByIdAndUpdate(waitlistId, {
      status: 'ENROLLED',
      enrolledClassSection: classSection._id,
      enrolledAt: new Date(),
    });
    return {
      success: true,
      alreadyEnrolled: true,
      classSection: {
        _id: classSection._id,
        classCode: classSection.classCode,
        subject: classSection.subject,
      },
    };
  }

  // Tạo enrollment mới
  const enrollment = await ClassEnrollment.create({
    student: waitlist.student,
    classSection: classSection._id,
    enrollmentDate: new Date(),
    status: 'enrolled',
    isOverload: false,
    note: `Promoted from waitlist by admin (${waitlistId})`,
  });

  // Cập nhật waitlist
  await Waitlist.findByIdAndUpdate(waitlistId, {
    status: 'ENROLLED',
    enrolledClassSection: classSection._id,
    enrolledAt: new Date(),
  });

  // Tăng currentEnrollment trên classSection
  await ClassSection.findByIdAndUpdate(classSection._id, {
    $inc: { currentEnrollment: 1 },
  });

  // Giảm currentEnrollment trên lớp cũ (enrolledClassSection cũ — nếu có)
  if (waitlist.enrolledClassSection) {
    await ClassSection.findByIdAndUpdate(waitlist.enrolledClassSection, {
      $inc: { currentEnrollment: -1 },
    });
  }

  return {
    success: true,
    alreadyEnrolled: false,
    enrollmentId: enrollment._id,
    classSection: {
      _id: classSection._id,
      classCode: classSection.classCode,
      subject: classSection.subject,
    },
  };
}

module.exports = {
  ACTIVE_ENROLLMENT_STATUSES,
  findSemesterById,
  findCurrentSemester,
  findStudentById,
  findEligibleStudents,
  resolveMajorCodesFromCurriculumId,
  findActiveCurriculums,
  findMajorsByCodes,
  findOpenClassSections,
  findOpenClassSectionsBySemesterYears,
  findOpenClassSectionsAllSemesters,
  findClassSectionsByGroupForTemplate,
  findSemesterEnrollments,
  findStudentIdsWithEnrollmentForSubjectPeriod,
  findSemesterWaitlists,
  findStudentIdsWithEnrollmentInSystemSemester,
  bulkUpsertEnrollments,
  bulkUpsertWaitlists,
  bulkIncrementClassSections,
  findClassSectionById,
  getEnrollmentStatus,
  deleteEnrollments,
  deleteWaitlists,
  promoteWaitlist,
};
