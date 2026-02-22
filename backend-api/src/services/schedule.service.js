const User = require('../models/user.model');
const Student = require('../models/student.model');
const ClassEnrollment = require('../models/classEnrollment.model');

function getMondayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const jsDay = date.getDay(); // 0=CN, 1=T2, ..., 6=T7
  const diff = jsDay === 0 ? -6 : 1 - jsDay; // lùi về Thứ 2
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function validateWeekStart(weekStart) {
  if (!weekStart) {
    // Nếu không truyền weekStart, dùng tuần hiện tại
    return getMondayOfWeek(new Date());
  }

  const date = new Date(weekStart);
  if (isNaN(date.getTime())) {
    throw new Error('weekStart không hợp lệ, định dạng phải là YYYY-MM-DD');
  }

  // Luôn lấy Thứ 2 của tuần chứa ngày đó
  return getMondayOfWeek(date);
}

async function getMyWeekSchedule(userId, weekStart) {
  const weekStartDate = validateWeekStart(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6); 

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('Không tìm thấy tài khoản người dùng');
  }

  const student = await Student.findOne({ email: user.email }).lean();
  if (!student) {
    throw new Error('Không tìm thấy sinh viên');
  }

  const enrollments = await ClassEnrollment.find({
    student: student._id,
    status: 'enrolled',
  }).populate({
    path: 'classSection',
    populate: [
      { path: 'subject', select: 'subjectCode subjectName' },
      { path: 'room', select: 'roomCode roomName' },
      { path: 'teacher', select: 'fullName' },
      { path: 'timeslot', select: 'startDate endDate startTime endTime groupName' },
    ],
  });

  const scheduleItems = [];

  for (const enrollment of enrollments) {
    const cls = enrollment.classSection;

    if (!cls || !cls.timeslot) continue;

    const timeslot = cls.timeslot;

    if (!timeslot) continue;

    let dayOfWeek = cls.dayOfWeek;
    if (!dayOfWeek) {
      const jsDay = new Date(timeslot.startDate).getDay(); 
      dayOfWeek = jsDay === 0 ? 7 : jsDay; 
    }

    scheduleItems.push({
      classId: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      dayOfWeek: dayOfWeek, 
      startTime: timeslot.startTime, 
      endTime: timeslot.endTime,     
      subject: {
        subjectCode: cls.subject?.subjectCode || 'N/A',
        subjectName: cls.subject?.subjectName || 'Chưa có tên',
      },
      room: {
        roomCode: cls.room?.roomCode || '',
        roomName: cls.room?.roomName || 'Chưa có phòng',
      },
      teacher: cls.teacher?.fullName || 'Chưa có GV',
      academicYear: cls.academicYear,
      semester: cls.semester,
    });
  }

  return {
    weekStart: weekStartDate.toISOString().split('T')[0],
    weekEnd: weekEndDate.toISOString().split('T')[0],
    schedules: scheduleItems,
  };
}

module.exports = { getMyWeekSchedule };
