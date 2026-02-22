// attendance.controller.js
// Controller nhận HTTP request, gọi service, trả response
// Tương ứng AttendanceController trong class diagram:
//   +getClasses(): Response
//   +bulkSave(payload): Response

const attendanceService = require('../services/attendance.service');

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/classes
// Lấy danh sách lớp học kèm thông tin điểm danh nhanh
// Flow: Step 2 → gọi API, Step 3 → validate, Step 4 → lấy danh sách
// ─────────────────────────────────────────────────────────────
const getClasses = async (req, res) => {
  try {
    // Lấy userId từ JWT token (đã được authMiddleware giải mã)
    const userId = req.auth.sub;

    // Gọi service lấy danh sách lớp kèm thông tin chuyên cần
    // getTeachingClasses(user): ClassCard[]
    const classCards = await attendanceService.getTeachingClasses(userId);

    // Bước 4 Exception: No classes found
    if (classCards.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Không có lớp học nào',
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách lớp thành công',
      data: classCards,
    });
  } catch (error) {
    console.error('[AttendanceController] getClasses error:', error);
    // Step 3 Exception – No permission → 403
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/classes/:classId/slots
// Lấy danh sách các buổi học đã điểm danh của một lớp
// ─────────────────────────────────────────────────────────────
const getClassSlots = async (req, res) => {
  try {
    const { classId } = req.params;

    const slots = await attendanceService.getClassSlots(classId);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách buổi học thành công',
      data: slots,
    });
  } catch (error) {
    console.error('[AttendanceController] getClassSlots error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/attendance/classes/:classId/slots/:slotId
// Lấy bảng điểm danh của một buổi học cụ thể
// ─────────────────────────────────────────────────────────────
const getSlotAttendance = async (req, res) => {
  try {
    const { classId, slotId } = req.params;

    const records = await attendanceService.getSlotAttendance(classId, slotId);

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu điểm danh thành công',
      data: records,
    });
  } catch (error) {
    console.error('[AttendanceController] getSlotAttendance error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/attendance/bulk
// Lưu điểm danh hàng loạt cho một buổi học
// Tương ứng bulkSave(payload): Response trong class diagram
// Body: BulkAttendancePayload { classId, slotId, slotDate, records: AttendanceRecord[] }
// ─────────────────────────────────────────────────────────────
const bulkSave = async (req, res) => {
  try {
    // Lấy payload từ body request
    const payload = req.body;

    // Gọi service lưu điểm danh
    // Service sẽ tự động gọi applyWarningRule sau khi lưu
    const result = await attendanceService.bulkSave(payload);

    // Nếu tỷ lệ vắng > 15%, trả về thêm cảnh báo
    const message = result.warningTriggered
      ? `Lưu thành công. ⚠️ Cảnh báo: tỷ lệ vắng buổi này > 15%!`
      : 'Lưu điểm danh thành công';

    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error('[AttendanceController] bulkSave error:', error);
    // Step 6 Exception – No permission → 403
    // Step 7 Exception – Save failed → 500
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  getClasses,
  getClassSlots,
  getSlotAttendance,
  bulkSave,
};
