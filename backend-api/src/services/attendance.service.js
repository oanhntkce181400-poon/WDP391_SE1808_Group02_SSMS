const mongoose = require('mongoose');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Schedule = require('../models/schedule.model');

const VALID_ATTENDANCE_STATUSES = new Set(['Present', 'Late', 'Absent']);
const ATTENDED_STATUSES = new Set(['Present', 'Late']);
const WEEKDAY_LABELS = {
  1: 'Thu Hai',
  2: 'Thu Ba',
  3: 'Thu Tu',
  4: 'Thu Nam',
  5: 'Thu Sau',
  6: 'Thu Bay',
  7: 'Chu Nhat',
};

function toStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateDdMmYyyy(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function weekBounds(date) {
  const day = toSystemDayOfWeek(date);
  const start = toStartOfDay(date);
  start.setDate(start.getDate() - (day - 1));
  const end = toStartOfDay(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function dateInRange(date, startDate, endDate) {
  const t = toStartOfDay(date).getTime();
  const start = startDate ? toStartOfDay(startDate).getTime() : null;
  const end = endDate ? toStartOfDay(endDate).getTime() : null;
  if (start != null && t < start) return false;
  if (end != null && t > end) return false;
  return true;
}

function dateFromWeekAndDay(weekStart, dayOfWeek) {
  const d = toStartOfDay(weekStart);
  d.setDate(d.getDate() + Number(dayOfWeek) - 1);
  return d;
}

function toSystemDayOfWeek(date) {
  const jsDay = date.getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

async function getAllowedClassWeekdays(classId, classSection) {
  const schedules = await Schedule.find({ classSection: classId, status: 'active' })
    .select('dayOfWeek')
    .lean();

  const daysFromSchedule = Array.from(
    new Set(
      schedules
        .map((s) => Number(s.dayOfWeek))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
    ),
  );

  if (daysFromSchedule.length > 0) return daysFromSchedule;

  const fallback = Number(classSection?.dayOfWeek);
  if (Number.isInteger(fallback) && fallback >= 1 && fallback <= 7) return [fallback];

  return [];
}

async function getValidClassDatesAroundSelection(classId, selectedDate) {
  const schedules = await Schedule.find({ classSection: classId, status: 'active' })
    .select('dayOfWeek startDate endDate')
    .lean();

  if (schedules.length === 0) return [];

  const { start, end } = weekBounds(selectedDate);
  const dates = [];

  for (const sch of schedules) {
    const d = Number(sch.dayOfWeek);
    if (!Number.isInteger(d) || d < 1 || d > 7) continue;

    const candidate = dateFromWeekAndDay(start, d);
    if (candidate < start || candidate > end) continue;
    if (!dateInRange(candidate, sch.startDate, sch.endDate)) continue;
    dates.push(candidate);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

async function resolveUserContext(userId) {
  const user = await User.findById(userId).select('role email').lean();
  if (!user) {
    const err = new Error('Khong tim thay tai khoan');
    err.statusCode = 404;
    throw err;
  }

  const role = String(user.role || '').toLowerCase();
  const isAdminOrStaff = role === 'admin' || role === 'staff';
  return { user, role, isAdminOrStaff };
}

async function resolveLecturerByUser(userId) {
  let teacher = await Teacher.findOne({ userId, isActive: true }).lean();
  if (teacher) return teacher;

  const user = await User.findById(userId).lean();
  if (!user?.email) return null;

  teacher = await Teacher.findOne({
    email: String(user.email).toLowerCase(),
    isActive: true,
  }).lean();

  return teacher;
}

async function resolveStudentByUser(userId) {
  if (!userId) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(userId).select('email').lean();
  if (!user) {
    const err = new Error('Khong tim thay tai khoan');
    err.statusCode = 404;
    throw err;
  }

  let student = await Student.findOne({ userId, isActive: true })
    .select('_id studentCode fullName email')
    .lean();

  if (!student && user.email) {
    student = await Student.findOne({
      email: String(user.email).toLowerCase(),
      isActive: true,
    })
      .select('_id studentCode fullName email')
      .lean();
  }

  if (!student) {
    const err = new Error('Khong tim thay ho so sinh vien');
    err.statusCode = 404;
    throw err;
  }

  return student;
}

function safePercentage(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function toObjectIdOrNull(value) {
  if (!value) return null;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function countOccurrencesByWeekday(startDate, endDate, dayOfWeek) {
  const start = startDate ? toStartOfDay(startDate) : null;
  const end = endDate ? toStartOfDay(endDate) : null;
  const targetDay = Number(dayOfWeek);

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  if (!Number.isInteger(targetDay) || targetDay < 1 || targetDay > 7) {
    return 0;
  }

  const first = new Date(start);
  const offset = (targetDay - toSystemDayOfWeek(first) + 7) % 7;
  first.setDate(first.getDate() + offset);

  if (first > end) {
    return 0;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const weeks = Math.floor((toStartOfDay(end).getTime() - toStartOfDay(first).getTime()) / (7 * DAY_MS));
  return weeks + 1;
}

function buildScheduleRules(classSection, schedules = []) {
  const rules = [];

  schedules.forEach((item) => {
    const day = Number(item.dayOfWeek);
    if (!Number.isInteger(day) || day < 1 || day > 7) return;
    if (!item.startDate || !item.endDate) return;

    rules.push({
      dayOfWeek: day,
      startDate: item.startDate,
      endDate: item.endDate,
    });
  });

  if (rules.length > 0) {
    return rules;
  }

  const fallbackDay = Number(classSection?.dayOfWeek);
  if (
    Number.isInteger(fallbackDay)
    && fallbackDay >= 1
    && fallbackDay <= 7
    && classSection?.startDate
    && classSection?.endDate
  ) {
    return [{
      dayOfWeek: fallbackDay,
      startDate: classSection.startDate,
      endDate: classSection.endDate,
    }];
  }

  return [];
}

function countSessionsFromRules(rules, untilDate = null) {
  if (!Array.isArray(rules) || rules.length === 0) return 0;

  return rules.reduce((sum, rule) => {
    const effectiveEnd = untilDate && rule.endDate
      ? (toStartOfDay(rule.endDate) < toStartOfDay(untilDate) ? rule.endDate : untilDate)
      : (untilDate || rule.endDate);

    return sum + countOccurrencesByWeekday(rule.startDate, effectiveEnd, rule.dayOfWeek);
  }, 0);
}

function toDateKey(date) {
  const d = toStartOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKeyToDate(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return toStartOfDay(date);
}

function normalizeSlotKey(slotId, slotDate) {
  const rawSlotId = String(slotId || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawSlotId)) {
    return rawSlotId;
  }

  if (!slotDate) return null;
  return toDateKey(slotDate);
}

function listSessionDatesFromRules(rules, untilDate = null) {
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const keySet = new Set();

  rules.forEach((rule) => {
    const dayOfWeek = Number(rule.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) return;

    if (!rule.startDate || !rule.endDate) return;

    const start = toStartOfDay(rule.startDate);
    let end = toStartOfDay(rule.endDate);

    if (untilDate) {
      const boundary = toStartOfDay(untilDate);
      if (end > boundary) {
        end = boundary;
      }
    }

    if (end < start) return;

    const first = new Date(start);
    const offset = (dayOfWeek - toSystemDayOfWeek(first) + 7) % 7;
    first.setDate(first.getDate() + offset);

    if (first > end) return;

    const cursor = new Date(first);
    while (cursor <= end) {
      keySet.add(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
  });

  return Array.from(keySet)
    .map((key) => parseDateKeyToDate(key))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());
}

async function getMyAttendanceReport(userId, filters = {}) {
  const student = await resolveStudentByUser(userId);
  const { classSectionId, subjectId } = filters;

  if (classSectionId && !mongoose.Types.ObjectId.isValid(classSectionId)) {
    const err = new Error('classSectionId khong hop le');
    err.statusCode = 400;
    throw err;
  }

  if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
    const err = new Error('subjectId khong hop le');
    err.statusCode = 400;
    throw err;
  }

  const enrollments = await ClassEnrollment.find({
    student: student._id,
    status: { $in: ['enrolled', 'completed'] },
  })
    .populate({
      path: 'classSection',
      select: '_id classCode className subject semester academicYear startDate endDate dayOfWeek',
      populate: {
        path: 'subject',
        select: '_id subjectCode subjectName credits',
      },
    })
    .lean();

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const classSection = enrollment.classSection;
    if (!classSection) return false;

    if (classSectionId && String(classSection._id) !== String(classSectionId)) {
      return false;
    }

    if (subjectId && String(classSection.subject?._id || classSection.subject) !== String(subjectId)) {
      return false;
    }

    return true;
  });

  if (filteredEnrollments.length === 0) {
    return {
      student,
      summary: {
        totalClasses: 0,
        sessionsElapsed: 0,
        totalSessions: 0,
        attendedSessions: 0,
        absentSessions: 0,
        absenceRateToDate: 0,
        absenceRateOverall: 0,
      },
      items: [],
    };
  }

  const classObjectIds = filteredEnrollments
    .map((enrollment) => toObjectIdOrNull(enrollment.classSection?._id))
    .filter(Boolean);

  const [scheduleRows, attendanceRows] = await Promise.all([
    Schedule.find({
      classSection: { $in: classObjectIds },
      status: 'active',
    })
      .select('classSection dayOfWeek startDate endDate')
      .lean(),
    Attendance.find({
      classSection: { $in: classObjectIds },
      student: student._id,
    })
      .select('classSection slotId slotDate status note')
      .sort({ slotDate: -1, createdAt: -1 })
      .lean(),
  ]);

  const scheduleMap = new Map();
  scheduleRows.forEach((item) => {
    const key = String(item.classSection);
    if (!scheduleMap.has(key)) scheduleMap.set(key, []);
    scheduleMap.get(key).push(item);
  });

  const attendanceMap = new Map();
  attendanceRows.forEach((item) => {
    const key = String(item.classSection);
    if (!attendanceMap.has(key)) attendanceMap.set(key, []);
    attendanceMap.get(key).push(item);
  });

  const today = toStartOfDay(new Date());

  const items = filteredEnrollments
    .map((enrollment) => {
      const classSection = enrollment.classSection;
      const classId = String(classSection._id);
      const classSchedules = scheduleMap.get(classId) || [];
      const rules = buildScheduleRules(classSection, classSchedules);

      const rawAttendanceDetails = (attendanceMap.get(classId) || []).map((record) => {
        const slotDate = record.slotDate ? toStartOfDay(record.slotDate) : null;
        const slotKey = normalizeSlotKey(record.slotId, slotDate);
        return {
          slotId: record.slotId,
          slotDate,
          slotKey,
          status: record.status || 'Absent',
          note: record.note || '',
        };
      });

      const attendanceByDateKey = new Map();
      rawAttendanceDetails.forEach((record) => {
        if (!record.slotKey) return;
        if (!attendanceByDateKey.has(record.slotKey)) {
          attendanceByDateKey.set(record.slotKey, record);
        }
      });

      const scheduledDatesToDate = listSessionDatesFromRules(rules, today);
      const detailByDateKey = new Map();

      scheduledDatesToDate.forEach((sessionDate) => {
        const dateKey = toDateKey(sessionDate);
        const existing = attendanceByDateKey.get(dateKey);

        if (existing) {
          detailByDateKey.set(dateKey, {
            slotId: existing.slotId || dateKey,
            slotDate: existing.slotDate || sessionDate,
            status: existing.status,
            note: existing.note,
            isAbsent: existing.status === 'Absent',
            isParticipated: ATTENDED_STATUSES.has(existing.status),
            isMarked: true,
            isToDate: true,
          });
          return;
        }

        detailByDateKey.set(dateKey, {
          slotId: dateKey,
          slotDate: sessionDate,
          status: 'Unmarked',
          note: '',
          isAbsent: false,
          isParticipated: false,
          isMarked: false,
          isToDate: true,
        });
      });

      rawAttendanceDetails.forEach((record) => {
        if (!record.slotDate || record.slotDate > today || !record.slotKey) {
          return;
        }

        if (detailByDateKey.has(record.slotKey)) {
          return;
        }

        detailByDateKey.set(record.slotKey, {
          slotId: record.slotId || record.slotKey,
          slotDate: record.slotDate,
          status: record.status,
          note: record.note,
          isAbsent: record.status === 'Absent',
          isParticipated: ATTENDED_STATUSES.has(record.status),
          isMarked: true,
          isToDate: true,
        });
      });

      const detailsToDate = Array.from(detailByDateKey.values()).sort((a, b) => {
        const ad = new Date(a.slotDate || 0).getTime();
        const bd = new Date(b.slotDate || 0).getTime();
        return bd - ad;
      });

      const absentSessions = detailsToDate.filter((item) => item.status === 'Absent').length;
      const lateSessions = detailsToDate.filter((item) => item.status === 'Late').length;
      const presentSessions = detailsToDate.filter((item) => item.status === 'Present').length;
      const attendedSessions = presentSessions + lateSessions;
      const unmarkedSessions = detailsToDate.filter((item) => item.status === 'Unmarked').length;

      const sessionsElapsedFromSchedule = scheduledDatesToDate.length;
      const totalSessionsFromSchedule = countSessionsFromRules(rules, null);

      const sessionsElapsed = Math.max(sessionsElapsedFromSchedule, detailsToDate.length);
      const totalSessions = Math.max(totalSessionsFromSchedule, rawAttendanceDetails.length, sessionsElapsed);

      const absenceRateToDate = safePercentage(absentSessions, sessionsElapsed);
      const absenceRateOverall = safePercentage(absentSessions, totalSessions);

      return {
        classSection: {
          _id: classSection._id,
          classCode: classSection.classCode,
          className: classSection.className,
          semester: classSection.semester,
          academicYear: classSection.academicYear,
          startDate: classSection.startDate || null,
          endDate: classSection.endDate || null,
        },
        subject: classSection.subject || null,
        attendanceStats: {
          sessionsElapsed,
          totalSessions,
          sessionsMarked: detailsToDate.length - unmarkedSessions,
          attendedSessions,
          presentSessions,
          lateSessions,
          absentSessions,
          unmarkedSessions,
          absenceRateToDate,
          absenceRateOverall,
          participationRateToDate: safePercentage(attendedSessions, sessionsElapsed),
          attendanceScore: Math.max(0, Math.round((100 - absenceRateToDate) * 10) / 10),
        },
        details: detailsToDate,
      };
    })
    .sort((a, b) => {
      const aCode = String(a.subject?.subjectCode || a.classSection?.classCode || '');
      const bCode = String(b.subject?.subjectCode || b.classSection?.classCode || '');
      return aCode.localeCompare(bCode);
    });

  const summary = items.reduce(
    (acc, item) => {
      acc.totalClasses += 1;
      acc.sessionsElapsed += item.attendanceStats.sessionsElapsed;
      acc.totalSessions += item.attendanceStats.totalSessions;
      acc.attendedSessions += item.attendanceStats.attendedSessions;
      acc.absentSessions += item.attendanceStats.absentSessions;
      return acc;
    },
    {
      totalClasses: 0,
      sessionsElapsed: 0,
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      absenceRateToDate: 0,
      absenceRateOverall: 0,
    },
  );

  summary.absenceRateToDate = safePercentage(summary.absentSessions, summary.sessionsElapsed);
  summary.absenceRateOverall = safePercentage(summary.absentSessions, summary.totalSessions);

  return {
    student,
    summary,
    items,
  };
}

async function ensureLecturerCanAccessClass(classId, userId) {
  const context = await resolveUserContext(userId);

  if (context.isAdminOrStaff) {
    const cls = await ClassSection.findById(classId)
      .select('_id classCode teacher status startDate endDate semester academicYear dayOfWeek')
      .lean();

    if (!cls) {
      const err = new Error('Khong tim thay lop hoc');
      err.statusCode = 404;
      throw err;
    }

    return { teacher: null, classSection: cls, isAdminOrStaff: true };
  }

  const teacher = await resolveLecturerByUser(userId);
  if (!teacher) {
    const err = new Error('Tai khoan chua lien ket ho so giang vien');
    err.statusCode = 403;
    throw err;
  }

  const cls = await ClassSection.findById(classId)
    .select('_id classCode teacher status startDate endDate semester academicYear dayOfWeek')
    .lean();

  if (!cls) {
    const err = new Error('Khong tim thay lop hoc');
    err.statusCode = 404;
    throw err;
  }

  if (String(cls.teacher) !== String(teacher._id)) {
    const err = new Error('Ban khong duoc phep diem danh lop hoc phan nay');
    err.statusCode = 403;
    throw err;
  }

  return { teacher, classSection: cls, isAdminOrStaff: false };
}

function estimateTotalSessions(classSection, weeklyScheduleCount) {
  const safeWeekly = Math.max(1, Number(weeklyScheduleCount) || 1);

  if (!classSection?.startDate || !classSection?.endDate) {
    return safeWeekly;
  }

  const start = new Date(classSection.startDate);
  const end = new Date(classSection.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return safeWeekly;
  }

  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000));
  const weeks = Math.max(1, Math.ceil((days + 1) / 7));
  return weeks * safeWeekly;
}

async function findTeachingClassesByLecturer(userId) {
  const context = await resolveUserContext(userId);

  if (context.isAdminOrStaff) {
    const classes = await ClassSection.find({
      status: { $in: ['scheduled', 'published', 'locked'] },
    })
      .populate('subject', 'subjectCode subjectName credits')
      .populate('teacher', 'fullName email department teacherCode')
      .populate('room', 'roomCode roomName')
      .populate('timeslot', 'groupName startTime endTime')
      .sort({ classCode: 1 })
      .lean();

    return { teacher: null, classes };
  }

  const teacher = await resolveLecturerByUser(userId);
  if (!teacher) {
    const err = new Error('Tai khoan chua lien ket ho so giang vien');
    err.statusCode = 403;
    throw err;
  }

  const classes = await ClassSection.find({
    teacher: teacher._id,
    status: { $in: ['scheduled', 'published', 'locked'] },
  })
    .populate('subject', 'subjectCode subjectName credits')
    .populate('teacher', 'fullName email department teacherCode')
    .populate('room', 'roomCode roomName')
    .populate('timeslot', 'groupName startTime endTime')
    .sort({ classCode: 1 })
    .lean();

  return { teacher, classes };
}

async function computeAvgRate(classId) {
  const total = await Attendance.countDocuments({ classSection: classId });
  if (total === 0) {
    return { avgRate: 100, totalRecords: 0, absentCount: 0, taughtSlots: 0 };
  }

  const absentCount = await Attendance.countDocuments({
    classSection: classId,
    status: 'Absent',
  });

  const slots = await Attendance.distinct('slotId', { classSection: classId });
  const taughtSlots = slots.length;

  const attendedCount = total - absentCount;
  const avgRate = total > 0 ? Math.round((attendedCount / total) * 100) : 100;

  return { avgRate, totalRecords: total, absentCount, taughtSlots };
}

async function applyWarningRule(classId) {
  const slots = await Attendance.distinct('slotId', { classSection: classId });
  const totalSlots = slots.length;
  if (totalSlots === 0) return;

  const enrollments = await ClassEnrollment.find({
    classSection: classId,
    status: 'enrolled',
  }).lean();

  for (const enrollment of enrollments) {
    const studentId = enrollment.student;
    const absentCount = await Attendance.countDocuments({
      classSection: classId,
      student: studentId,
      status: 'Absent',
    });

    const absentRate = (absentCount / totalSlots) * 100;
    const shouldWarn = absentRate > 15;

    await Attendance.updateMany(
      { classSection: classId, student: studentId },
      { absenceWarning: shouldWarn },
    );
  }
}

async function getTeachingClasses(userId) {
  const { classes } = await findTeachingClassesByLecturer(userId);
  if (classes.length === 0) return [];

  const classIds = classes.map((c) => c._id);

  const [enrollmentCounts, scheduleCounts] = await Promise.all([
    ClassEnrollment.aggregate([
      { $match: { classSection: { $in: classIds }, status: 'enrolled' } },
      { $group: { _id: '$classSection', count: { $sum: 1 } } },
    ]),
    Schedule.aggregate([
      { $match: { classSection: { $in: classIds }, status: 'active' } },
      { $group: { _id: '$classSection', count: { $sum: 1 } } },
    ]),
  ]);

  const scheduleDaysAgg = await Schedule.aggregate([
    { $match: { classSection: { $in: classIds }, status: 'active' } },
    { $group: { _id: '$classSection', days: { $addToSet: '$dayOfWeek' } } },
  ]);

  const enrollmentMap = new Map(enrollmentCounts.map((x) => [String(x._id), x.count]));
  const scheduleMap = new Map(scheduleCounts.map((x) => [String(x._id), x.count]));
  const scheduleDaysMap = new Map(
    scheduleDaysAgg.map((x) => [
      String(x._id),
      (x.days || [])
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
        .sort((a, b) => a - b),
    ]),
  );

  const classCards = await Promise.all(
    classes.map(async (cls) => {
      const enrollmentCount = enrollmentMap.get(String(cls._id)) || 0;
      const { avgRate, taughtSlots } = await computeAvgRate(cls._id);
      const weeklyScheduleCount = scheduleMap.get(String(cls._id)) || 0;
      const scheduleDays = scheduleDaysMap.get(String(cls._id)) ||
        (Number.isInteger(Number(cls.dayOfWeek)) ? [Number(cls.dayOfWeek)] : []);
      const totalSessions = estimateTotalSessions(cls, weeklyScheduleCount);

      return {
        _id: cls._id,
        classCode: cls.classCode,
        className: cls.className,
        subject: cls.subject,
        teacher: cls.teacher,
        room: cls.room,
        timeslot: cls.timeslot,
        semester: cls.semester,
        academicYear: cls.academicYear,
        dayOfWeek: cls.dayOfWeek,
        scheduleDays,
        enrollmentCount,
        taughtSlots,
        totalSessions,
        avgAttendanceRate: avgRate,
      };
    }),
  );

  // Chỉ hiển thị lớp có sinh viên đang enrolled để luồng điểm danh luôn nhất quán.
  return classCards.filter((item) => Number(item.enrollmentCount || 0) > 0);
}

async function getSlotAttendance(classId, slotId, userId) {
  const { classSection } = await ensureLecturerCanAccessClass(classId, userId);

  const enrollments = await ClassEnrollment.find({
    classSection: classId,
    status: 'enrolled',
  })
    .populate('student', 'studentCode fullName email')
    .lean();

  if (enrollments.length === 0) return [];

  const existingRecords = await Attendance.find({
    classSection: classId,
    slotId,
  }).lean();

  const recordMap = new Map();
  existingRecords.forEach((r) => recordMap.set(String(r.student), r));

  return enrollments.map((enrollment) => {
    const studentId = String(enrollment.student._id);
    const existing = recordMap.get(studentId);

    return {
      studentId: enrollment.student._id,
      studentCode: enrollment.student.studentCode,
      fullName: enrollment.student.fullName,
      email: enrollment.student.email,
      status: existing?.status || '',
      note: existing?.note || '',
      absenceWarning: existing?.absenceWarning || false,
    };
  });
}

async function getClassSlots(classId, userId) {
  const { classSection } = await ensureLecturerCanAccessClass(classId, userId);

  const slots = await Attendance.aggregate([
    { $match: { classSection: new mongoose.Types.ObjectId(classId) } },
    {
      $group: {
        _id: '$slotId',
        slotDate: { $first: '$slotDate' },
        totalStudents: { $sum: 1 },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
      },
    },
    { $sort: { slotDate: -1 } },
  ]);

  return slots.map((s) => ({
    slotId: s._id,
    slotDate: s.slotDate,
    totalStudents: s.totalStudents,
    absentCount: s.absentCount,
    lateCount: s.lateCount,
    presentCount: s.totalStudents - s.absentCount - s.lateCount,
  }));
}

async function bulkSave(payload, userId) {
  const { classId, slotId, slotDate, records } = payload || {};

  if (!classId || !slotId || !Array.isArray(records)) {
    const err = new Error('Du lieu khong hop le: thieu classId, slotId hoac records');
    err.statusCode = 400;
    throw err;
  }

  const { classSection } = await ensureLecturerCanAccessClass(classId, userId);

  const enrolledStudents = await ClassEnrollment.find({
    classSection: classId,
    status: 'enrolled',
  })
    .select('student')
    .lean();

  const enrolledSet = new Set(enrolledStudents.map((e) => String(e.student)));
  const inputSet = new Set(records.map((r) => String(r.studentId)));

  if (enrolledSet.size === 0) {
    const err = new Error('Lop chua co sinh vien de diem danh');
    err.statusCode = 400;
    throw err;
  }

  if (records.length !== enrolledSet.size || inputSet.size !== enrolledSet.size) {
    const err = new Error('Vui long diem danh day du tat ca sinh vien truoc khi luu');
    err.statusCode = 400;
    throw err;
  }

  for (const record of records) {
    if (!enrolledSet.has(String(record.studentId))) {
      const err = new Error('Danh sach diem danh chua sinh vien khong thuoc lop hoc phan');
      err.statusCode = 400;
      throw err;
    }

    if (!VALID_ATTENDANCE_STATUSES.has(record.status)) {
      const err = new Error('Moi sinh vien phai co dung mot trang thai diem danh');
      err.statusCode = 400;
      throw err;
    }
  }

  const sessionDate = slotDate ? new Date(slotDate) : new Date();

  // Đồng bộ lịch học và điểm danh theo Schedule thật: ngày điểm danh phải đúng thứ có lịch học.
  const allowedWeekdays = await getAllowedClassWeekdays(classId, classSection);
  if (allowedWeekdays.length > 0) {
    const selectedDay = toSystemDayOfWeek(sessionDate);
    if (!allowedWeekdays.includes(selectedDay)) {
      const selectedText = formatDateDdMmYyyy(sessionDate);
      const validDates = await getValidClassDatesAroundSelection(classId, sessionDate);

      let hint = '';
      if (validDates.length > 0) {
        hint = ` Ngay hop le trong tuan nay: ${validDates.map((d) => formatDateDdMmYyyy(d)).join(', ')}.`;
      } else {
        const allowedText = allowedWeekdays
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_LABELS[d] || `Thu ${d}`)
          .join(', ');
        hint = ` Lop nay hoc vao: ${allowedText}.`;
      }

      const err = new Error(`Lop ${classSection.classCode} khong hoc ngay ${selectedText}.${hint}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const bulkOps = records.map((record) => ({
    updateOne: {
      filter: {
        classSection: classId,
        slotId,
        student: record.studentId,
      },
      update: {
        $set: {
          classSection: classId,
          slotId,
          slotDate: sessionDate,
          student: record.studentId,
          status: record.status,
          note: record.note || '',
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(bulkOps, { ordered: false });
  await applyWarningRule(classId);

  const totalSaved = records.length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const presentCount = totalSaved - absentCount - lateCount;

  return {
    saved: totalSaved,
    presentCount,
    absentCount,
    lateCount,
    warningTriggered: totalSaved > 0 && (absentCount / totalSaved) * 100 > 15,
  };
}

module.exports = {
  getTeachingClasses,
  getSlotAttendance,
  getClassSlots,
  bulkSave,
  computeAvgRate,
  getMyAttendanceReport,
};
