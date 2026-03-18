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

  return Student.find(query)
    .select('studentCode fullName majorCode cohort enrollmentYear academicStatus isActive userId')
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

async function findOpenClassSections({ semesterNum, academicYear, statuses }) {
  return ClassSection.find({
    semester: semesterNum,
    academicYear,
    status: { $in: statuses },
  })
    .select(
      '_id classCode className subject semester academicYear currentEnrollment maxCapacity status teacher room timeslot',
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

async function findSemesterWaitlists(studentIds, semesterNum, academicYear) {
  return Waitlist.find({
    student: { $in: studentIds },
    targetSemester: semesterNum,
    targetAcademicYear: academicYear,
    status: 'WAITING',
  })
    .select('student subject targetSemester targetAcademicYear status')
    .lean();
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

module.exports = {
  ACTIVE_ENROLLMENT_STATUSES,
  findSemesterById,
  findCurrentSemester,
  findStudentById,
  findEligibleStudents,
  findActiveCurriculums,
  findMajorsByCodes,
  findOpenClassSections,
  findSemesterEnrollments,
  findSemesterWaitlists,
  bulkUpsertEnrollments,
  bulkUpsertWaitlists,
  bulkIncrementClassSections,
  findClassSectionById,
};
