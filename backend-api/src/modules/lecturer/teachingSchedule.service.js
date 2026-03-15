const ClassSection = require('../../models/classSection.model');
require('../../models/subject.model');
require('../../models/room.model');
require('../../models/timeslot.model');
const Schedule = require('../../models/schedule.model');
const Semester = require('../../models/semester.model');
const Teacher = require('../../models/teacher.model');
const User = require('../../models/user.model');

async function resolveTeacher({ userId, teacherId, teacherCode }) {
  if (teacherId) {
    const teacher = await Teacher.findOne({ _id: teacherId, isActive: true }).lean();
    if (teacher) return teacher;
  }

  if (teacherCode) {
    const teacher = await Teacher.findOne({
      teacherCode: String(teacherCode).trim(),
      isActive: true,
    }).lean();
    if (teacher) return teacher;
  }

  let teacher = await Teacher.findOne({ userId, isActive: true }).lean();
  if (teacher) return teacher;

  const user = await User.findById(userId).lean();
  if (!user?.email) return null;

  teacher = await Teacher.findOne({ email: user.email.toLowerCase(), isActive: true }).lean();
  return teacher;
}

async function getTeachingSchedule(userId, filters = {}) {
  const teacher = await resolveTeacher({
    userId,
    teacherId: filters.teacherId,
    teacherCode: filters.teacherCode,
  });
  if (!teacher) {
    const error = new Error(
      filters.teacherId || filters.teacherCode
        ? 'Teacher not found'
        : 'Teacher profile not found for this account. Please select a lecturer.',
    );
    error.statusCode = 404;
    throw error;
  }

  let semesterNum = filters.semester ? Number(filters.semester) : null;
  let academicYear = filters.academicYear || null;

  if (filters.semesterId) {
    const semester = await Semester.findById(filters.semesterId).lean();
    if (!semester) {
      const error = new Error('Semester not found');
      error.statusCode = 404;
      throw error;
    }
    semesterNum = semester.semesterNum;
    academicYear = semester.academicYear;
  }

  if (!semesterNum || !academicYear) {
    const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
    if (currentSemester) {
      semesterNum = semesterNum || currentSemester.semesterNum;
      academicYear = academicYear || currentSemester.academicYear;
    }
  }

  const classFilter = {
    teacher: teacher._id,
    status: { $ne: 'cancelled' },
  };

  if (semesterNum) classFilter.semester = semesterNum;
  if (academicYear) classFilter.academicYear = academicYear;

  const classes = await ClassSection.find(classFilter)
    .populate('subject', 'subjectCode subjectName credits')
    .populate('room', 'roomCode roomName roomNumber')
    .populate('timeslot', 'groupName startTime endTime')
    .sort({ semester: -1, classCode: 1 })
    .lean();

  const classIds = classes.map((cls) => cls._id);
  const schedules = classIds.length
    ? await Schedule.find({ classSection: { $in: classIds }, status: 'active' })
        .populate('room', 'roomCode roomName roomNumber')
        .lean()
    : [];

  const schedulesByClass = schedules.reduce((acc, item) => {
    const classId = String(item.classSection);
    if (!acc[classId]) acc[classId] = [];
    acc[classId].push(item);
    return acc;
  }, {});

  return {
    teacher: {
      id: teacher._id,
      teacherCode: teacher.teacherCode,
      fullName: teacher.fullName,
      department: teacher.department,
    },
    semester: {
      semesterNum,
      academicYear,
    },
    classes: classes.map((cls) => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      semester: cls.semester,
      academicYear: cls.academicYear,
      currentEnrollment: cls.currentEnrollment,
      maxCapacity: cls.maxCapacity,
      subject: cls.subject,
      room: cls.room,
      timeslot: cls.timeslot,
      schedules: schedulesByClass[String(cls._id)] || [],
    })),
  };
}

module.exports = {
  getTeachingSchedule,
};
