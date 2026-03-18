const mongoose = require('mongoose');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const Teacher = require('../models/teacher.model');
const Schedule = require('../models/schedule.model');

const VALID_ATTENDANCE_STATUSES = new Set(['Present', 'Late', 'Absent']);
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
};
