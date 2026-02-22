// attendance.service.js
// Service xử lý logic nghiệp vụ cho tính năng điểm danh
// Tương ứng với AttendanceService trong class diagram:
//   +getTeachingClasses(user): ClassCard[]
//   +bulkSave(payload): Result
//   -computeAvgRate(classes): void
//   -applyWarningRule(>15%): void
// Và AttendanceRepository / ClassRepository:
//   +bulkUpsert(slotId, records): void
//   +findBySemester(user, semester): Class[]

const mongoose = require('mongoose');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');

// ─────────────────────────────────────────────────────────────
// ClassRepository.findBySemester(user, semester)
// Lấy danh sách lớp học trong học kỳ, theo quyền của user
// Admin/Staff → lấy TẤT CẢ lớp đang active
// Teacher → lấy lớp của giảng viên đó (chưa triển khai hoàn chỉnh)
// ─────────────────────────────────────────────────────────────
async function findClassesBySemester(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('Không tìm thấy tài khoản');
    err.statusCode = 404;
    throw err;
  }

  // Vì hệ thống hiện tại chưa có role "teacher" trong User model,
  // admin và staff có thể quản lý tất cả lớp
  // Khi thêm teacher về sau, chỉ cần thêm: { teacher: teacherObjectId }
  const query = { status: 'active' };

  const classes = await ClassSection.find(query)
    .populate('subject', 'subjectCode subjectName credits')
    .populate('teacher', 'fullName email department')
    .populate('room', 'roomCode roomName')
    .populate('timeslot', 'groupName startTime endTime startDate endDate sessionsPerDay')
    .sort({ classCode: 1 })
    .lean();

  return classes;
}

// ─────────────────────────────────────────────────────────────
// computeAvgRate(classId)
// Tính tỷ lệ chuyên cần trung bình của một lớp
// = (số lần Present + Late) / tổng số lần điểm danh * 100
// ─────────────────────────────────────────────────────────────
async function computeAvgRate(classId) {
  // Đếm tổng số bản ghi điểm danh của lớp
  const total = await Attendance.countDocuments({ classSection: classId });

  if (total === 0) {
    // Chưa có buổi nào → tỷ lệ 100% (chưa tính)
    return { avgRate: 100, totalRecords: 0, absentCount: 0, taughtSlots: 0 };
  }

  // Đếm số lần Absent
  const absentCount = await Attendance.countDocuments({
    classSection: classId,
    status: 'Absent',
  });

  // Đếm số buổi học đã dạy (distinct slotId)
  const slots = await Attendance.distinct('slotId', { classSection: classId });
  const taughtSlots = slots.length;

  // Tỷ lệ chuyên cần = (tổng - vắng) / tổng * 100
  const attendedCount = total - absentCount;
  const avgRate = total > 0 ? Math.round((attendedCount / total) * 100) : 100;

  return { avgRate, totalRecords: total, absentCount, taughtSlots };
}

// ─────────────────────────────────────────────────────────────
// applyWarningRule(classId)
// Kiểm tra và cập nhật cờ cảnh báo cho từng sinh viên trong lớp
// absenceWarning = true nếu tỷ lệ vắng của sinh viên đó > 15%
// ─────────────────────────────────────────────────────────────
async function applyWarningRule(classId) {
  // Lấy tất cả buổi học của lớp
  const slots = await Attendance.distinct('slotId', { classSection: classId });
  const totalSlots = slots.length;

  if (totalSlots === 0) return;

  // Lấy danh sách sinh viên trong lớp
  const enrollments = await ClassEnrollment.find({
    classSection: classId,
    status: 'enrolled',
  }).lean();

  // Với mỗi sinh viên, tính số buổi vắng và so sánh với 15%
  for (const enrollment of enrollments) {
    const studentId = enrollment.student;

    // Đếm số buổi vắng của sinh viên này trong lớp này
    const absentCount = await Attendance.countDocuments({
      classSection: classId,
      student: studentId,
      status: 'Absent',
    });

    // Tỷ lệ vắng: absentCount / totalSlots * 100
    const absentRate = (absentCount / totalSlots) * 100;
    const shouldWarn = absentRate > 15;

    // Cập nhật cờ cảnh báo cho TẤT CẢ bản ghi điểm danh của sinh viên này
    await Attendance.updateMany(
      { classSection: classId, student: studentId },
      { absenceWarning: shouldWarn },
    );
  }
}

// ─────────────────────────────────────────────────────────────
// getTeachingClasses(userId)
// Hàm chính tương ứng AttendanceService.getTeachingClasses
// Trả về danh sách ClassCard với thông tin nhanh
// ─────────────────────────────────────────────────────────────
async function getTeachingClasses(userId) {
  // Bước 1: Lấy danh sách lớp (ClassRepository.findBySemester)
  const classes = await findClassesBySemester(userId);

  if (classes.length === 0) {
    return [];
  }

  // Bước 2: Với mỗi lớp, tính thêm thông tin điểm danh
  // (computeAvgRate cho từng lớp)
  const classCards = await Promise.all(
    classes.map(async (cls) => {
      // Lấy số sinh viên đang đăng ký
      const enrollmentCount = await ClassEnrollment.countDocuments({
        classSection: cls._id,
        status: 'enrolled',
      });

      // Tính tỷ lệ chuyên cần trung bình
      const { avgRate, taughtSlots } = await computeAvgRate(cls._id);

      // Tổng số buổi học dự kiến từ sessionsPerDay
      // Nếu không có timeslot → mặc định 0
      const totalSessions = cls.timeslot?.sessionsPerDay || 0;

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
        // Thông tin nhanh cho ClassCard (theo yêu cầu)
        enrollmentCount,    // Sĩ số
        taughtSlots,         // Số buổi đã dạy
        totalSessions,       // Tổng số buổi
        avgAttendanceRate: avgRate, // Tỷ lệ chuyên cần trung bình
      };
    }),
  );

  return classCards;
}

// ─────────────────────────────────────────────────────────────
// getSlotAttendance(classId, slotId)
// Trả về danh sách điểm danh của một buổi học cụ thể
// Kèm thông tin sinh viên và trạng thái
// ─────────────────────────────────────────────────────────────
async function getSlotAttendance(classId, slotId) {
  // Lấy tất cả sinh viên đang đăng ký lớp
  const enrollments = await ClassEnrollment.find({
    classSection: classId,
    status: 'enrolled',
  })
    .populate('student', 'studentCode fullName email')
    .lean();

  if (enrollments.length === 0) {
    return [];
  }

  // Lấy bản ghi điểm danh cho buổi này (nếu đã có)
  const existingRecords = await Attendance.find({
    classSection: classId,
    slotId: slotId,
  }).lean();

  // Tạo map: studentId → attendance record
  const recordMap = {};
  for (const rec of existingRecords) {
    recordMap[String(rec.student)] = rec;
  }

  // Ghép thông tin sinh viên với trạng thái điểm danh
  const result = enrollments.map((enrollment) => {
    const studentId = String(enrollment.student._id);
    const existing = recordMap[studentId];

    return {
      studentId: enrollment.student._id,
      studentCode: enrollment.student.studentCode,
      fullName: enrollment.student.fullName,
      email: enrollment.student.email,
      // Trạng thái điểm danh (nếu chưa có thì mặc định Present)
      status: existing?.status || 'Present',
      note: existing?.note || '',
      absenceWarning: existing?.absenceWarning || false,
    };
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// getClassSlots(classId)
// Trả về danh sách các buổi học đã có điểm danh trong lớp
// ─────────────────────────────────────────────────────────────
async function getClassSlots(classId) {
  // Lấy distinct slotId và slotDate
  const slots = await Attendance.aggregate([
    { $match: { classSection: new mongoose.Types.ObjectId(classId) } },
    {
      $group: {
        _id: '$slotId',
        slotDate: { $first: '$slotDate' },
        totalStudents: { $sum: 1 },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] },
        },
      },
    },
    { $sort: { slotDate: -1 } }, // Mới nhất lên đầu
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

// ─────────────────────────────────────────────────────────────
// bulkSave(payload)
// Hàm chính tương ứng AttendanceService.bulkSave
// Lưu điểm danh cho toàn bộ SV trong một Slot
// AttendanceRepository.bulkUpsert(slotId, records)
// ─────────────────────────────────────────────────────────────
async function bulkSave(payload) {
  const { classId, slotId, slotDate, records } = payload;

  // Validate đầu vào cơ bản
  if (!classId || !slotId || !records || !Array.isArray(records)) {
    const err = new Error('Dữ liệu không hợp lệ: thiếu classId, slotId hoặc records');
    err.statusCode = 400;
    throw err;
  }

  // Kiểm tra lớp có tồn tại không
  const classSection = await ClassSection.findById(classId).lean();
  if (!classSection) {
    const err = new Error('Không tìm thấy lớp học');
    err.statusCode = 404;
    throw err;
  }

  // Xác định ngày buổi học
  const sessionDate = slotDate ? new Date(slotDate) : new Date();

  // bulkUpsert: dùng updateOne với upsert=true để tạo mới hoặc cập nhật
  // Tương ứng AttendanceRepository.bulkUpsert(slotId, records)
  const upsertPromises = records.map((record) => {
    return Attendance.updateOne(
      {
        classSection: classId,
        slotId: slotId,
        student: record.studentId,
      },
      {
        $set: {
          classSection: classId,
          slotId: slotId,
          slotDate: sessionDate,
          student: record.studentId,
          status: record.status || 'Present',
          note: record.note || '',
        },
      },
      { upsert: true }, // Tạo mới nếu chưa có, cập nhật nếu đã có
    );
  });

  // Thực hiện tất cả cùng lúc
  await Promise.all(upsertPromises);

  // Sau khi lưu xong → áp dụng rule cảnh báo > 15%
  // applyWarningRule(classes): void
  await applyWarningRule(classId);

  // Trả về thống kê nhanh
  const totalSaved = records.length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const presentCount = totalSaved - absentCount - lateCount;

  return {
    saved: totalSaved,
    presentCount,
    absentCount,
    lateCount,
    // Cảnh báo nếu tỷ lệ vắng > 15%
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
