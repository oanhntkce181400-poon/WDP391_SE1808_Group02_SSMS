const Student = require('../models/student.model');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Semester = require('../models/semester.model');
const {
  isDateRangeOverlapped,
  normalizeAcademicYearKey,
} = require('../utils/semesterMatch.util');

const DASHBOARD_CLASS_STATUSES = ['draft', 'scheduled', 'published', 'locked', 'completed'];

/**
 * Dashboard cards should prefer the current semester when one is configured.
 * If the system has not marked a semester as current yet, we gracefully fall
 * back to the latest active semester so the analytics card still has context.
 */
async function resolveCurrentSemester() {
  const currentSemester = await Semester.findOne({ isCurrent: true, isActive: true }).lean();
  if (currentSemester) {
    return currentSemester;
  }

  return Semester.findOne({ isActive: true })
    .sort({ academicYear: -1, semesterNum: -1, createdAt: -1 })
    .lean();
}

async function loadDashboardClasses(semester) {
  const classQuery = {
    status: { $in: DASHBOARD_CLASS_STATUSES },
  };

  if (semester?.semesterNum != null) {
    classQuery.semester = Number(semester.semesterNum);
  }

  const classes = await ClassSection.find(classQuery)
    .select('_id maxCapacity currentEnrollment semester academicYear startDate endDate')
    .lean();

  if (!semester) {
    return classes;
  }

  const targetAcademicYear = normalizeAcademicYearKey(semester.academicYear);

  return classes.filter((classSection) => {
    if (Number(classSection.semester) !== Number(semester.semesterNum)) {
      return false;
    }

    const classAcademicYear = normalizeAcademicYearKey(classSection.academicYear);
    if (classAcademicYear && targetAcademicYear && classAcademicYear === targetAcademicYear) {
      return true;
    }

    return isDateRangeOverlapped(
      classSection.startDate,
      classSection.endDate,
      semester.startDate,
      semester.endDate,
    );
  });
}

/**
 * Computes the compact analytics payload used by the admin dashboard.
 *
 * We intentionally keep the response focused on the three cards requested by
 * the feature:
 * - number of students
 * - number of classes
 * - registration rate
 *
 * A few supporting fields are returned as well so the frontend can show richer
 * helper text without making another request.
 */
async function getDashboardStats() {
  const semester = await resolveCurrentSemester();

  const [totalStudents, classes] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    loadDashboardClasses(semester),
  ]);

  const classIds = classes.map((item) => item._id);
  let registeredStudents = 0;
  let totalEnrollments = 0;

  if (classIds.length > 0) {
    const enrollments = await ClassEnrollment.find({
      classSection: { $in: classIds },
      status: { $in: ['enrolled', 'completed'] },
    })
      .select('student')
      .lean();

    totalEnrollments = enrollments.length;

    // The registration rate needs distinct students, not raw enrollments,
    // because one student can enroll in multiple classes in the same semester.
    registeredStudents = new Set(enrollments.map((item) => String(item.student))).size;
  }

  const totalClasses = classes.length;
  const totalCapacity = classes.reduce((sum, item) => sum + Number(item.maxCapacity || 0), 0);
  const occupiedSeats = classes.reduce((sum, item) => sum + Number(item.currentEnrollment || 0), 0);

  const registrationRate = totalStudents > 0
    ? Number(((registeredStudents / totalStudents) * 100).toFixed(1))
    : 0;

  const capacityUtilization = totalCapacity > 0
    ? Number(((occupiedSeats / totalCapacity) * 100).toFixed(1))
    : 0;

  return {
    totalStudents,
    totalClasses,
    registeredStudents,
    totalEnrollments,
    registrationRate,
    capacityUtilization,
    currentSemester: semester
      ? {
          code: semester.code,
          name: semester.name,
          semesterNum: semester.semesterNum,
          academicYear: semester.academicYear,
        }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getDashboardStats,
};
