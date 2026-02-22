// attendance.routes.js
// Định nghĩa các route cho tính năng điểm danh
// Tương ứng AttendanceRouter trong class diagram:
//   GET  /api/attendance/classes
//   POST /api/attendance/bulk

const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// Tất cả route yêu cầu đăng nhập + role admin hoặc staff
// (Khi thêm role teacher về sau thì thêm 'teacher' vào mảng)

// ─ GET /api/attendance/classes ─────────────────────────────
// Lấy danh sách lớp học kèm thống kê điểm danh nhanh
// AttendanceRouter → AttendanceController.getClasses()
router.get(
  '/classes',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  attendanceController.getClasses,
);

// ─ GET /api/attendance/classes/:classId/slots ──────────────
// Lấy danh sách buổi học (slots) đã có điểm danh
router.get(
  '/classes/:classId/slots',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  attendanceController.getClassSlots,
);

// ─ GET /api/attendance/classes/:classId/slots/:slotId ──────
// Lấy bảng điểm danh của một buổi cụ thể
router.get(
  '/classes/:classId/slots/:slotId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  attendanceController.getSlotAttendance,
);

// ─ POST /api/attendance/bulk ───────────────────────────────
// Lưu điểm danh hàng loạt (BulkAttendancePayload)
// AttendanceRouter → AttendanceController.bulkSave(payload)
router.post(
  '/bulk',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  attendanceController.bulkSave,
);

module.exports = router;
