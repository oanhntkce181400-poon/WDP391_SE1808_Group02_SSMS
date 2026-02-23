const service = require("./schedule.service");

function handleError(res, err) {
  const msg = String(err?.message || "");
  if (msg.includes("not found"))
    return res.status(404).json({ success: false, message: msg });
  if (
    msg.includes("required") ||
    msg.includes("already exists") ||
    msg.includes("capacity") ||
    msg.includes("Cannot delete") ||
    msg.includes("trùng") ||
    msg.includes("đã bị khóa") ||
    msg.includes("chưa có") ||
    msg.includes("không đủ")
  )
    return res.status(400).json({ success: false, message: msg });
  console.error("[schedule.controller]", err);
  return res
    .status(500)
    .json({ success: false, message: msg || "Internal server error" });
}

/**
 * GET /api/classes/:classId/schedules
 * Lấy tất cả lịch học của một lớp
 */
async function getClassSchedules(req, res) {
  try {
    const { classId } = req.params;
    const schedules = await service.getSchedulesByClassId(classId);
    return res.json({ success: true, data: schedules });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /api/classes/:classId/schedules
 * Gán lịch học cho lớp
 */
async function assignSchedule(req, res) {
  try {
    const { classId } = req.params;
    const { room_id, day_of_week, start_period, end_period, start_date, end_date } = req.body;

    // Validate required fields
    if (!room_id || !day_of_week || !start_period || !end_period || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: room_id, day_of_week, start_period, end_period, start_date, end_date"
      });
    }

    const schedule = await service.assignScheduleToClass(classId, {
      roomId: room_id,
      dayOfWeek: day_of_week,
      startPeriod: start_period,
      endPeriod: end_period,
      startDate: start_date,
      endDate: end_date
    });

    return res.status(201).json({
      success: true,
      message: "Gán lịch học thành công",
      data: schedule
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * PUT /api/classes/:classId/schedules/:scheduleId
 * Cập nhật lịch học
 */
async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const { room_id, day_of_week, start_period, end_period, start_date, end_date } = req.body;

    const updates = {};
    if (room_id) updates.roomId = room_id;
    if (day_of_week) updates.dayOfWeek = day_of_week;
    if (start_period) updates.startPeriod = start_period;
    if (end_period) updates.endPeriod = end_period;
    if (start_date) updates.startDate = start_date;
    if (end_date) updates.endDate = end_date;

    const schedule = await service.updateSchedule(scheduleId, updates);

    return res.json({
      success: true,
      message: "Cập nhật lịch học thành công",
      data: schedule
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * DELETE /api/classes/:classId/schedules/:scheduleId
 * Xóa lịch học
 */
async function deleteSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    await service.deleteSchedule(scheduleId);
    return res.json({
      success: true,
      message: "Xóa lịch học thành công"
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /api/classes/:classId/schedules/check-conflict
 * Kiểm tra xung đột lịch học
 */
async function checkConflict(req, res) {
  try {
    const { classId } = req.params;
    const { room_id, teacher_id, day_of_week, start_period, end_period } = req.body;

    if (!room_id || !day_of_week || !start_period || !end_period) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const conflicts = await service.checkScheduleConflict({
      roomId: room_id,
      teacherId: teacher_id,
      dayOfWeek: parseInt(day_of_week, 10),
      startPeriod: parseInt(start_period, 10),
      endPeriod: parseInt(end_period, 10),
      classSectionId: classId
    });

    const hasConflict = conflicts.room.length > 0 || conflicts.teacher.length > 0;

    return res.json({
      success: true,
      hasConflict,
      conflicts
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /api/classes/:classId/schedules/publish
 * Công bố lịch lớp học
 */
async function publishSchedule(req, res) {
  try {
    const { classId } = req.params;
    const classSection = await service.publishClassSchedule(classId);
    return res.json({
      success: true,
      message: "Công bố lịch học thành công",
      data: classSection
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * POST /api/classes/:classId/schedules/lock
 * Khóa lịch lớp học
 */
async function lockSchedule(req, res) {
  try {
    const { classId } = req.params;
    const classSection = await service.lockClassSchedule(classId);
    return res.json({
      success: true,
      message: "Khóa lịch học thành công",
      data: classSection
    });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  getClassSchedules,
  assignSchedule,
  updateSchedule,
  deleteSchedule,
  checkConflict,
  publishSchedule,
  lockSchedule
};
