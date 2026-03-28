const ClassSection = require('../../models/classSection.model');
require('../../models/subject.model');
require('../../models/room.model');
const Timeslot = require('../../models/timeslot.model');
const Schedule = require('../../models/schedule.model');
const Semester = require('../../models/semester.model');
const Teacher = require('../../models/teacher.model');
const User = require('../../models/user.model');
const { filterClassesBySemesterContext } = require('../../utils/semesterMatch.util');

const VISIBLE_TEACHING_CLASS_STATUSES = ['published', 'locked', 'completed'];

function buildTimeslotKey(startPeriod, endPeriod) {
  const normalizedStart = Number(startPeriod);
  const normalizedEnd = Number(endPeriod);
  if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
    return null;
  }
  return `${normalizedStart}:${normalizedEnd}`;
}

function buildSyntheticTimeslot(schedule, fallbackTimeslot = null) {
  const startPeriod = Number(schedule?.startPeriod || fallbackTimeslot?.startPeriod || 0);
  const endPeriod = Number(schedule?.endPeriod || fallbackTimeslot?.endPeriod || startPeriod || 0);
  if (!Number.isFinite(startPeriod) || !Number.isFinite(endPeriod) || startPeriod <= 0 || endPeriod <= 0) {
    return fallbackTimeslot || null;
  }

  return {
    _id: `period:${startPeriod}:${endPeriod}`,
    groupName:
      fallbackTimeslot?.groupName ||
      (startPeriod === endPeriod ? `Tiet ${startPeriod}` : `Tiet ${startPeriod}-${endPeriod}`),
    startPeriod,
    endPeriod,
    startTime: fallbackTimeslot?.startTime || '',
    endTime: fallbackTimeslot?.endTime || '',
  };
}

function resolveScheduleTimeslot(schedule, fallbackTimeslot, timeslotByPeriodKey) {
  const periodKey = buildTimeslotKey(schedule?.startPeriod, schedule?.endPeriod);
  if (periodKey && timeslotByPeriodKey.has(periodKey)) {
    return timeslotByPeriodKey.get(periodKey);
  }

  if (
    fallbackTimeslot &&
    Number(fallbackTimeslot.startPeriod) === Number(schedule?.startPeriod) &&
    Number(fallbackTimeslot.endPeriod) === Number(schedule?.endPeriod)
  ) {
    return fallbackTimeslot;
  }

  return buildSyntheticTimeslot(schedule, fallbackTimeslot);
}

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

async function resolveSemesterContext(filters, includeAllClasses) {
  let semesterNum = filters.semester ? Number(filters.semester) : null;
  let academicYear = String(filters.academicYear || '').trim() || null;
  let semesterDoc = null;

  if (filters.semesterId) {
    semesterDoc = await Semester.findById(filters.semesterId).lean();
    if (!semesterDoc) {
      const error = new Error('Semester not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      semesterDoc,
      semesterNum: semesterDoc.semesterNum,
      academicYear: semesterDoc.academicYear,
    };
  }

  if (semesterNum != null && academicYear) {
    semesterDoc = await Semester.findOne({
      semesterNum,
      academicYear,
      isActive: true,
    })
      .sort({ isCurrent: -1, createdAt: -1 })
      .lean();

    return {
      semesterDoc,
      semesterNum,
      academicYear,
    };
  }

  if (includeAllClasses) {
    return {
      semesterDoc: null,
      semesterNum,
      academicYear,
    };
  }

  if (semesterNum != null || academicYear) {
    semesterDoc = await Semester.findOne({
      isActive: true,
      ...(semesterNum != null ? { semesterNum } : {}),
      ...(academicYear ? { academicYear } : {}),
    })
      .sort({ isCurrent: -1, academicYear: -1, semesterNum: -1, createdAt: -1 })
      .lean();

    return {
      semesterDoc,
      semesterNum: semesterNum ?? semesterDoc?.semesterNum ?? null,
      academicYear: academicYear || semesterDoc?.academicYear || null,
    };
  }

  semesterDoc = await Semester.findOne({ isCurrent: true, isActive: true }).lean();
  if (!semesterDoc) {
    semesterDoc = await Semester.findOne({ isActive: true })
      .sort({ academicYear: -1, semesterNum: -1, createdAt: -1 })
      .lean();
  }

  return {
    semesterDoc,
    semesterNum: semesterDoc?.semesterNum ?? null,
    academicYear: semesterDoc?.academicYear ?? null,
  };
}

async function getTeachingSchedule(userId, filters = {}) {
  const user = await User.findById(userId).select('role').lean();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const isAdminOrStaff = normalizedRole === 'admin' || normalizedRole === 'staff';
  const showAllTeachers = isAdminOrStaff && !filters.teacherId && !filters.teacherCode;

  const teacher = showAllTeachers
    ? null
    : await resolveTeacher({
        userId,
        teacherId: filters.teacherId,
        teacherCode: filters.teacherCode,
      });

  if (!showAllTeachers && !teacher) {
    const error = new Error(
      filters.teacherId || filters.teacherCode
        ? 'Teacher not found'
        : 'Teacher profile not found for this account.',
    );
    error.statusCode = 404;
    throw error;
  }

  const includeAllClasses = String(filters.includeAllClasses || '').toLowerCase() === 'true';
  const semesterContext = await resolveSemesterContext(filters, includeAllClasses);

  const classFilter = {
    status: { $in: VISIBLE_TEACHING_CLASS_STATUSES },
  };

  if (teacher?._id) {
    classFilter.teacher = teacher._id;
  }

  if (semesterContext.semesterNum != null) {
    classFilter.semester = Number(semesterContext.semesterNum);
  }

  const rawClasses = await ClassSection.find(classFilter)
    .populate('subject', 'subjectCode subjectName credits')
    .populate('teacher', 'teacherCode fullName department')
    .populate('room', 'roomCode roomName roomNumber')
    .populate('timeslot', 'groupName startTime endTime startPeriod endPeriod')
    .sort({ semester: -1, classCode: 1 })
    .lean();

  const semesterScopedClasses =
    semesterContext.semesterDoc || semesterContext.semesterNum != null || semesterContext.academicYear
      ? filterClassesBySemesterContext(rawClasses, {
          semesterNum: semesterContext.semesterNum,
          academicYear: semesterContext.academicYear,
          startDate: semesterContext.semesterDoc?.startDate,
          endDate: semesterContext.semesterDoc?.endDate,
        })
      : rawClasses;

  const classIds = semesterScopedClasses.map((cls) => cls._id);
  const timeslots = await Timeslot.find({ status: 'active' })
    .select('groupName startTime endTime startPeriod endPeriod')
    .lean();
  const timeslotByPeriodKey = new Map(
    timeslots
      .map((slot) => [buildTimeslotKey(slot.startPeriod, slot.endPeriod), slot])
      .filter(([key]) => Boolean(key)),
  );
  const classesById = new Map(semesterScopedClasses.map((cls) => [String(cls._id), cls]));
  const schedules = classIds.length
    ? await Schedule.find({ classSection: { $in: classIds }, status: 'active' })
        .populate('room', 'roomCode roomName roomNumber')
        .sort({ dayOfWeek: 1, startPeriod: 1, endPeriod: 1, startDate: 1, _id: 1 })
        .lean()
    : [];

  const schedulesByClass = schedules.reduce((acc, item) => {
    const classId = String(item.classSection);
    const classInfo = classesById.get(classId);
    const fallbackTimeslot = classInfo?.timeslot || null;
    if (!acc[classId]) acc[classId] = [];
    acc[classId].push({
      ...item,
      timeslot: resolveScheduleTimeslot(item, fallbackTimeslot, timeslotByPeriodKey),
    });
    return acc;
  }, {});

  const classes = semesterScopedClasses.filter(
    (cls) => (schedulesByClass[String(cls._id)] || []).length > 0,
  );

  return {
    teacher: {
      id: teacher?._id || null,
      teacherCode: teacher?.teacherCode || (showAllTeachers ? 'ALL' : ''),
      fullName: teacher?.fullName || (showAllTeachers ? 'Tất cả giảng viên' : ''),
      department: teacher?.department || (showAllTeachers ? 'Toàn trường' : ''),
    },
    semester: {
      id: semesterContext.semesterDoc?._id || null,
      code: semesterContext.semesterDoc?.code || null,
      name: semesterContext.semesterDoc?.name || null,
      semesterNum: semesterContext.semesterNum,
      academicYear: semesterContext.academicYear,
    },
    classes: classes.map((cls) => {
      const classSchedules = schedulesByClass[String(cls._id)] || [];
      const primarySchedule = classSchedules[0] || null;

      return {
        _id: cls._id,
        id: cls._id,
        classCode: cls.classCode,
        className: cls.className,
        semester: cls.semester,
        academicYear: cls.academicYear,
        currentEnrollment: cls.currentEnrollment,
        maxCapacity: cls.maxCapacity,
        subject: cls.subject,
        teacher: cls.teacher || null,
        room: cls.room || primarySchedule?.room || null,
        timeslot: cls.timeslot || primarySchedule?.timeslot || null,
        schedules: classSchedules,
      };
    }),
  };
}

module.exports = {
  getTeachingSchedule,
};
