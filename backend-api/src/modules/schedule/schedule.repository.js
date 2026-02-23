const Schedule = require("../../models/schedule.model");
const ClassSection = require("../../models/classSection.model");

// ─── Schedule CRUD ────────────────────────────────

async function findSchedulesByClassId(classId) {
  return Schedule.find({ classSection: classId, status: "active" })
    .populate("room", "roomCode roomName capacity")
    .populate({
      path: "classSection",
      populate: [
        { path: "teacher", select: "teacherCode fullName" },
        { path: "subject", select: "subjectCode subjectName" },
      ],
    })
    .lean();
}

async function findScheduleById(id) {
  return Schedule.findById(id)
    .populate("room")
    .populate({
      path: "classSection",
      populate: [
        { path: "teacher" },
        { path: "subject" },
        { path: "room" },
      ],
    })
    .exec();
}

async function createSchedule(data) {
  const schedule = new Schedule(data);
  await schedule.save();
  return findScheduleById(schedule._id);
}

async function updateScheduleById(id, updates) {
  return Schedule.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("room")
    .populate("classSection")
    .exec();
}

async function deleteScheduleById(id) {
  return Schedule.findByIdAndDelete(id).exec();
}

async function deleteSchedulesByClassId(classId) {
  return Schedule.deleteMany({ classSection: classId }).exec();
}

// ─── Check Conflicts ────────────────────────────────

/**
 * Kiểm tra xem phòng đã được đặt vào thời gian đó chưa
 * @param {Object} params
 * @param {String} params.roomId - ID của phòng
 * @param {Number} params.dayOfWeek - Thứ trong tuần (1-7)
 * @param {Number} params.startPeriod - Tiết bắt đầu
 * @param {Number} params.endPeriod - Tiết kết thúc
 * @param {String} params.classSectionId - ID của lớp học phần (để loại trừ khi update)
 * @returns {Array} - Danh sách các lịch trùng
 */
async function checkRoomConflict({ roomId, dayOfWeek, startPeriod, endPeriod, classSectionId }) {
  const conflicts = [];

  // 1. Kiểm tra xung đột trong bảng schedules (dữ liệu mới)
  const scheduleQuery = {
    room: roomId,
    dayOfWeek: dayOfWeek,
    status: "active",
    $or: [
      // Case 1: new schedule starts during existing schedule
      {
        startPeriod: { $lte: startPeriod },
        endPeriod: { $gte: startPeriod }
      },
      // Case 2: new schedule ends during existing schedule
      {
        startPeriod: { $lte: endPeriod },
        endPeriod: { $gte: endPeriod }
      },
      // Case 3: new schedule completely contains existing schedule
      {
        startPeriod: { $gte: startPeriod },
        endPeriod: { $lte: endPeriod }
      }
    ]
  };

  // Exclude current classSection if provided
  if (classSectionId) {
    scheduleQuery.classSection = { $ne: classSectionId };
  }

  const scheduleConflicts = await Schedule.find(scheduleQuery)
    .populate({
      path: "classSection",
      populate: [
        { path: "subject", select: "subjectCode subjectName" },
        { path: "teacher", select: "teacherCode fullName" },
      ],
    })
    .populate("room", "roomCode roomName")
    .lean();

  conflicts.push(...scheduleConflicts);

  // 2. Kiểm tra xung đột với dữ liệu cũ trong bảng classsections
  // ClassSections cũ lưu: room, timeslot, dayOfWeek
  // timeslot có startPeriod/endPeriod
  const classSectionQuery = {
    room: roomId,
    dayOfWeek: dayOfWeek,
    status: "active",
    timeslot: { $ne: null } // Chỉ check các lớp có timeslot
  };

  // Exclude current classSection if provided
  if (classSectionId) {
    classSectionQuery._id = { $ne: classSectionId };
  }

  // Lấy tất cả classSections có timeslot để check period
  const oldClassSections = await ClassSection.find(classSectionQuery)
    .populate("subject", "subjectCode subjectName")
    .populate("teacher", "teacherCode fullName")
    .populate("timeslot", "startPeriod endPeriod")
    .populate("room", "roomCode roomName")
    .lean();

  // Lọc các classSection có xung đột về tiết học
  for (const cs of oldClassSections) {
    if (cs.timeslot) {
      const existingStart = cs.timeslot.startPeriod;
      const existingEnd = cs.timeslot.endPeriod;

      // Check if periods overlap
      const overlaps = !(endPeriod < existingStart || startPeriod > existingEnd);
      
      if (overlaps) {
        conflicts.push({
          room: cs.room,
          classSection: {
            _id: cs._id,
            classCode: cs.classCode,
            className: cs.className,
            subject: cs.subject,
            teacher: cs.teacher,
            timeslot: cs.timeslot,
            dayOfWeek: cs.dayOfWeek,
            isLegacy: true // Đánh dấu là dữ liệu cũ
          }
        });
      }
    }
  }

  return conflicts;
}

/**
 * Kiểm tra xem giảng viên đã có lịch dạy vào thời gian đó chưa
 * @param {Object} params
 * @param {String} params.teacherId - ID của giảng viên
 * @param {Number} params.dayOfWeek - Thứ trong tuần (1-7)
 * @param {Number} params.startPeriod - Tiết bắt đầu
 * @param {Number} params.endPeriod - Tiết kết thúc
 * @param {String} params.classSectionId - ID của lớp học phần (để loại trừ khi update)
 * @returns {Array} - Danh sách các lịch trùng
 */
async function checkTeacherConflict({ teacherId, dayOfWeek, startPeriod, endPeriod, classSectionId }) {
  const conflicts = [];

  // 1. Kiểm tra xung đột trong bảng schedules (dữ liệu mới)
  const classSections = await ClassSection.find({
    teacher: teacherId,
    status: "active"
  }).select("_id");

  const classSectionIds = classSections.map(cs => cs._id);

  const scheduleQuery = {
    classSection: { $in: classSectionIds },
    dayOfWeek: dayOfWeek,
    status: "active",
    $or: [
      // Case 1: new schedule starts during existing schedule
      {
        startPeriod: { $lte: startPeriod },
        endPeriod: { $gte: startPeriod }
      },
      // Case 2: new schedule ends during existing schedule
      {
        startPeriod: { $lte: endPeriod },
        endPeriod: { $gte: endPeriod }
      },
      // Case 3: new schedule completely contains existing schedule
      {
        startPeriod: { $gte: startPeriod },
        endPeriod: { $lte: endPeriod }
      }
    ]
  };

  // Exclude current classSection if provided
  if (classSectionId) {
    scheduleQuery.classSection = { $ne: classSectionId };
  }

  const scheduleConflicts = await Schedule.find(scheduleQuery)
    .populate({
      path: "classSection",
      populate: [
        { path: "subject", select: "subjectCode subjectName" },
        { path: "teacher", select: "teacherCode fullName" },
      ],
    })
    .populate("room", "roomCode roomName")
    .lean();

  conflicts.push(...scheduleConflicts);

  // 2. Kiểm tra xung đột với dữ liệu cũ trong bảng classsections
  // ClassSections cũ lưu: teacher, timeslot, dayOfWeek
  const legacyQuery = {
    teacher: teacherId,
    dayOfWeek: dayOfWeek,
    status: "active",
    timeslot: { $ne: null } // Chỉ check các lớp có timeslot
  };

  // Exclude current classSection if provided
  if (classSectionId) {
    legacyQuery._id = { $ne: classSectionId };
  }

  const legacyClassSections = await ClassSection.find(legacyQuery)
    .populate("subject", "subjectCode subjectName")
    .populate("teacher", "teacherCode fullName")
    .populate("timeslot", "startPeriod endPeriod")
    .populate("room", "roomCode roomName")
    .lean();

  // Lọc các classSection có xung đột về tiết học
  for (const cs of legacyClassSections) {
    if (cs.timeslot) {
      const existingStart = cs.timeslot.startPeriod;
      const existingEnd = cs.timeslot.endPeriod;

      // Check if periods overlap
      const overlaps = !(endPeriod < existingStart || startPeriod > existingEnd);
      
      if (overlaps) {
        conflicts.push({
          room: cs.room,
          classSection: {
            _id: cs._id,
            classCode: cs.classCode,
            className: cs.className,
            subject: cs.subject,
            teacher: cs.teacher,
            timeslot: cs.timeslot,
            dayOfWeek: cs.dayOfWeek,
            isLegacy: true // Đánh dấu là dữ liệu cũ
          }
        });
      }
    }
  }

  return conflicts;
}

/**
 * Lấy tất cả lịch học trong một khoảng thời gian
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array}
 */
async function findSchedulesInDateRange(startDate, endDate) {
  return Schedule.find({
    status: "active",
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  })
    .populate("room", "roomCode roomName capacity")
    .populate({
      path: "classSection",
      populate: [
        { path: "subject", select: "subjectCode subjectName" },
        { path: "teacher", select: "teacherCode fullName" },
      ],
    })
    .lean();
}

module.exports = {
  findSchedulesByClassId,
  findScheduleById,
  createSchedule,
  updateScheduleById,
  deleteScheduleById,
  deleteSchedulesByClassId,
  checkRoomConflict,
  checkTeacherConflict,
  findSchedulesInDateRange,
};
