const repo = require("./schedule.repository");
const ClassSection = require("../../models/classSection.model");
const Room = require("../../models/room.model");
const Teacher = require("../../models/teacher.model");

// ─── Assign Schedule to Class ────────────────────────────────

/**
 * Gán lịch học cho lớp học phần
 * @param {String} classSectionId - ID của lớp học phần
 * @param {Object} scheduleData - Dữ liệu lịch học
 * @returns {Object} - Lịch học đã tạo
 */
async function assignScheduleToClass(classSectionId, scheduleData) {
  const { roomId, dayOfWeek, startPeriod, endPeriod, startDate, endDate } = scheduleData;

  // 1. Kiểm tra lớp học phần tồn tại
  const classSection = await ClassSection.findById(classSectionId);
  if (!classSection) {
    throw new Error("Không tìm thấy lớp học phần");
  }

  // 2. Kiểm tra lớp có thể gán lịch không (không phải locked)
  if (classSection.status === "locked") {
    throw new Error("Lớp học phần đã bị khóa, không thể thay đổi lịch");
  }

  // 3. Validate ngày
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
  }

  // 4. Validate tiết học
  if (startPeriod > endPeriod) {
    throw new Error("Tiết bắt đầu phải trước tiết kết thúc");
  }

  // 5. Kiểm tra sức chứa phòng
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error("Không tìm thấy phòng học");
  }

  if (room.capacity < classSection.maxCapacity) {
    throw new Error(
      `Phòng ${room.roomCode} có sức chứa ${room.capacity}, nhỏ hơn sĩ số tối đa của lớp (${classSection.maxCapacity})`
    );
  }

  // 6. Kiểm tra trùng phòng
  const roomConflicts = await repo.checkRoomConflict({
    roomId,
    dayOfWeek: parseInt(dayOfWeek, 10),
    startPeriod: parseInt(startPeriod, 10),
    endPeriod: parseInt(endPeriod, 10),
    classSectionId
  });

  if (roomConflicts.length > 0) {
    const conflictInfo = roomConflicts.map(c => 
      `${c.room?.roomCode} - ${c.classSection?.subject?.subjectCode} (${c.classSection?.classCode})`
    ).join(", ");
    throw new Error(`Phòng ${room.roomCode} đã được đặt: ${conflictInfo}`);
  }

  // 7. Kiểm tra trùng giảng viên
  const teacherConflicts = await repo.checkTeacherConflict({
    teacherId: classSection.teacher,
    dayOfWeek: parseInt(dayOfWeek, 10),
    startPeriod: parseInt(startPeriod, 10),
    endPeriod: parseInt(endPeriod, 10),
    classSectionId
  });

  if (teacherConflicts.length > 0) {
    const conflictInfo = teacherConflicts.map(c => 
      `${c.classSection?.teacher?.fullName} - ${c.classSection?.subject?.subjectCode} (${c.classSection?.classCode})`
    ).join(", ");
    throw new Error(`Giảng viên ${classSection.teacher?.fullName || classSection.teacher} đã có lịch dạy: ${conflictInfo}`);
  }

  // 8. Tạo lịch học
  const schedule = await repo.createSchedule({
    classSection: classSectionId,
    room: roomId,
    dayOfWeek: parseInt(dayOfWeek, 10),
    startPeriod: parseInt(startPeriod, 10),
    endPeriod: parseInt(endPeriod, 10),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status: "active"
  });

  // 9. Cập nhật trạng thái lớp thành scheduled nếu là draft
  if (classSection.status === "draft") {
    await ClassSection.findByIdAndUpdate(classSectionId, { status: "scheduled" });
  }

  return schedule;
}

/**
 * Cập nhật lịch học
 * @param {String} scheduleId - ID của lịch học
 * @param {Object} scheduleData - Dữ liệu lịch học mới
 * @returns {Object} - Lịch học đã cập nhật
 */
async function updateSchedule(scheduleId, scheduleData) {
  const { roomId, dayOfWeek, startPeriod, endPeriod, startDate, endDate } = scheduleData;

  // 1. Kiểm tra lịch tồn tại
  const existingSchedule = await repo.findScheduleById(scheduleId);
  if (!existingSchedule) {
    throw new Error("Không tìm thấy lịch học");
  }

  const classSectionId = existingSchedule.classSection._id || existingSchedule.classSection;

  // 2. Kiểm tra lớp có thể sửa không
  const classSection = await ClassSection.findById(classSectionId);
  if (!classSection) {
    throw new Error("Không tìm thấy lớp học phần");
  }

  if (classSection.status === "locked") {
    throw new Error("Lớp học phần đã bị khóa, không thể thay đổi lịch");
  }

  // 3. Validate ngày
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
  }

  // 4. Validate tiết học
  if (startPeriod > endPeriod) {
    throw new Error("Tiết bắt đầu phải trước tiết kết thúc");
  }

  // 5. Kiểm tra sức chứa phòng (nếu đổi phòng)
  const targetRoomId = roomId || existingSchedule.room._id;
  const room = await Room.findById(targetRoomId);
  if (!room) {
    throw new Error("Không tìm thấy phòng học");
  }

  if (room.capacity < classSection.maxCapacity) {
    throw new Error(
      `Phòng ${room.roomCode} có sức chứa ${room.capacity}, nhỏ hơn sĩ số tối đa của lớp (${classSection.maxCapacity})`
    );
  }

  // 6. Kiểm tra trùng phòng
  const roomConflicts = await repo.checkRoomConflict({
    roomId: targetRoomId,
    dayOfWeek: parseInt(dayOfWeek, 10) || existingSchedule.dayOfWeek,
    startPeriod: parseInt(startPeriod, 10) || existingSchedule.startPeriod,
    endPeriod: parseInt(endPeriod, 10) || existingSchedule.endPeriod,
    classSectionId
  });

  if (roomConflicts.length > 0) {
    throw new Error(`Phòng ${room.roomCode} đã được đặt vào thời gian này`);
  }

  // 7. Kiểm tra trùng giảng viên
  const teacherConflicts = await repo.checkTeacherConflict({
    teacherId: classSection.teacher,
    dayOfWeek: parseInt(dayOfWeek, 10) || existingSchedule.dayOfWeek,
    startPeriod: parseInt(startPeriod, 10) || existingSchedule.startPeriod,
    endPeriod: parseInt(endPeriod, 10) || existingSchedule.endPeriod,
    classSectionId
  });

  if (teacherConflicts.length > 0) {
    throw new Error(`Giảng viên đã có lịch dạy vào thời gian này`);
  }

  // 8. Cập nhật lịch học
  const updates = {};
  if (roomId) updates.room = roomId;
  if (dayOfWeek) updates.dayOfWeek = parseInt(dayOfWeek, 10);
  if (startPeriod) updates.startPeriod = parseInt(startPeriod, 10);
  if (endPeriod) updates.endPeriod = parseInt(endPeriod, 10);
  if (startDate) updates.startDate = new Date(startDate);
  if (endDate) updates.endDate = new Date(endDate);

  return await repo.updateScheduleById(scheduleId, updates);
}

/**
 * Xóa lịch học
 * @param {String} scheduleId - ID của lịch học
 */
async function deleteSchedule(scheduleId) {
  const existingSchedule = await repo.findScheduleById(scheduleId);
  if (!existingSchedule) {
    throw new Error("Không tìm thấy lịch học");
  }

  const classSectionId = existingSchedule.classSection._id || existingSchedule.classSection;
  const classSection = await ClassSection.findById(classSectionId);

  if (classSection && classSection.status === "locked") {
    throw new Error("Lớp học phần đã bị khóa, không thể xóa lịch");
  }

  return await repo.deleteScheduleById(scheduleId);
}

/**
 * Lấy lịch học của một lớp
 * @param {String} classSectionId - ID của lớp học phần
 */
async function getSchedulesByClassId(classSectionId) {
  return await repo.findSchedulesByClassId(classSectionId);
}

/**
 * Kiểm tra xung đột lịch học
 * @param {Object} data - Dữ liệu cần kiểm tra
 */
async function checkScheduleConflict(data) {
  const { roomId, teacherId, dayOfWeek, startPeriod, endPeriod, classSectionId } = data;

  const conflicts = {
    room: [],
    teacher: []
  };

  // Check room conflict
  if (roomId) {
    const roomConflicts = await repo.checkRoomConflict({
      roomId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      startPeriod: parseInt(startPeriod, 10),
      endPeriod: parseInt(endPeriod, 10),
      classSectionId
    });
    conflicts.room = roomConflicts;
  }

  // Check teacher conflict
  if (teacherId) {
    const teacherConflicts = await repo.checkTeacherConflict({
      teacherId,
      dayOfWeek: parseInt(dayOfWeek, 10),
      startPeriod: parseInt(startPeriod, 10),
      endPeriod: parseInt(endPeriod, 10),
      classSectionId
    });
    conflicts.teacher = teacherConflicts;
  }

  return conflicts;
}

/**
 * Publish lớp học (chuyển từ scheduled -> published)
 * @param {String} classSectionId - ID của lớp học phần
 */
async function publishClassSchedule(classSectionId) {
  const classSection = await ClassSection.findById(classSectionId);
  if (!classSection) {
    throw new Error("Không tìm thấy lớp học phần");
  }

  // Kiểm tra lớp đã có lịch chưa
  const schedules = await repo.findSchedulesByClassId(classSectionId);
  if (schedules.length === 0) {
    throw new Error("Lớp học chưa có lịch học, không thể công bố");
  }

  // Kiểm tra lớp có giảng viên chưa
  if (!classSection.teacher) {
    throw new Error("Lớp học chưa có giảng viên, không thể công bố");
  }

  // Cập nhật trạng thái
  return await ClassSection.findByIdAndUpdate(
    classSectionId,
    { status: "published" },
    { new: true }
  );
}

/**
 * Lock lớp học (không cho phép chỉnh sửa)
 * @param {String} classSectionId - ID của lớp học phần
 */
async function lockClassSchedule(classSectionId) {
  const classSection = await ClassSection.findById(classSectionId);
  if (!classSection) {
    throw new Error("Không tìm thấy lớp học phần");
  }

  if (classSection.status !== "published") {
    throw new Error("Chỉ có thể khóa lớp học đã được công bố");
  }

  return await ClassSection.findByIdAndUpdate(
    classSectionId,
    { status: "locked" },
    { new: true }
  );
}

module.exports = {
  assignScheduleToClass,
  updateSchedule,
  deleteSchedule,
  getSchedulesByClassId,
  checkScheduleConflict,
  publishClassSchedule,
  lockClassSchedule
};
