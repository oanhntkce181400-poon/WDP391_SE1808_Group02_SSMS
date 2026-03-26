const mongoose = require('mongoose');
const Student = require('../../models/student.model');
const Semester = require('../../models/semester.model');
const Curriculum = require('../../models/curriculum.model');
const Major = require('../../models/major.model');
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Waitlist = require('../../models/waitlist.model');

const ACTIVE_ENROLLMENT_STATUSES = ['enrolled', 'completed'];

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

async function findEligibleStudents(filters = {}) {
  const query = {
    isActive: true,
    $or: [{ academicStatus: 'enrolled' }, { academicStatus: { $exists: false } }],
  };

  const majorCodes = normalizeCodeList(filters.majorCodes);
  if (majorCodes.length > 0) {
    query.majorCode = { $in: majorCodes };
  }

  const studentCodes = normalizeCodeList(filters.studentCodes);
  if (studentCodes.length > 0) {
    query.studentCode = { $in: studentCodes };
  }

  const curriculumId = filters.curriculumId;
  if (curriculumId && mongoose.Types.ObjectId.isValid(String(curriculumId))) {
    query.curriculumId = new mongoose.Types.ObjectId(String(curriculumId));
  }

  // Filter by classGroup: student.classSection chứa giá trị như "SE1808-01"
  // Dùng exact match vì classSection trên Student là string group name
  const classGroup = filters.classGroup;
  if (classGroup && typeof classGroup === 'string' && classGroup.trim() !== '') {
    query.classSection = classGroup.trim();
  }

  return Student.find(query)
    .select(
      'studentCode fullName email majorCode cohort enrollmentYear currentCurriculumSemester curriculumId academicStatus isActive userId',
    )
    .sort({ studentCode: 1, _id: 1 })
    .lean();
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
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex',
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
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot classGroup groupIndex',
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
async function bulkUpsertEnrollments(enrollmentDocs) {
  if (!Array.isArray(enrollmentDocs) || enrollmentDocs.length === 0) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
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

  return ClassEnrollment.bulkWrite(operations, { ordered: false });
}

// Waitlist cũng được upsert theo bộ khóa student + subject + target semester + year.
// Như vậy cùng một sinh viên sẽ không bị xếp chờ lặp nhiều lần cho cùng một môn trong cùng học kỳ.
async function bulkUpsertWaitlists(waitlistDocs) {
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

  return Waitlist.bulkWrite(operations, { ordered: false });
}

// Sau khi service quyết định được các enrollment mới, repository mới ghi tăng currentEnrollment.
// Việc cộng dồn trước trong Map rồi bulkWrite một lần giúp giảm số lần round-trip tới DB.
async function bulkIncrementClassSections(classSectionIncrementMap) {
  const operations = Array.from(classSectionIncrementMap.entries())
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

  return ClassSection.bulkWrite(operations, { ordered: false });
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
async function getEnrollmentStatus({ semesterNum, academicYear, classGroup, curriculumId }) {
  // 1. Tìm classSection thuộc HK này
  const csQuery = {
    semester: Number(semesterNum),
    academicYear: String(academicYear),
  };
  if (classGroup && typeof classGroup === 'string') {
    csQuery.classGroup = classGroup.trim();
  }
  const classSections = await ClassSection.find(csQuery)
    .select('_id classCode className subject semester academicYear classGroup')
    .lean();
  const csIds = classSections.map((cs) => cs._id);
  const csMap = Object.fromEntries(classSections.map((cs) => [String(cs._id), cs]));

  // 2. Lấy enrollment (chỉ enrolled, không lấy dropped/completed)
  const enrollmentDocs = await ClassEnrollment.find({
    classSection: { $in: csIds },
    status: 'enrolled',
  })
    .populate('student', 'studentCode fullName')
    .populate('classSection', 'classCode subject')
    .lean();

  // 3. Lấy waitlist (chỉ WAITING)
  const waitlistQuery = {
    targetSemester: Number(semesterNum),
    targetAcademicYear: String(academicYear),
    status: 'WAITING',
  };
  if (classGroup && typeof classGroup === 'string') {
    waitlistQuery.classGroup = classGroup.trim();
  }
  const waitlistDocs = await Waitlist.find(waitlistQuery)
    .populate('student', 'studentCode fullName')
    .populate('subject', 'subjectCode subjectName')
    .lean();

  // 4. Build kết quả
  const enrolledRows = enrollmentDocs.map((e) => ({
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

  const waitlistedRows = waitlistDocs.map((w) => ({
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
      status: { $in: ['open', 'scheduled'] },
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
  findActiveCurriculums,
  findMajorsByCodes,
  findOpenClassSections,
  findOpenClassSectionsAllSemesters,
  findSemesterEnrollments,
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
