const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const controller = require('./autoEnrollment.controller');

const router = Router();

// Endpoint này dùng cho admin/staff kích hoạt batch auto-enrollment cho một học kỳ.
// Đây là điểm vào từ FE/Admin Dashboard trước khi luồng chuyển sang controller -> service.
router.post(
  '/trigger',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.trigger,
);

// Cùng filter với trigger — trả về toàn bộ SV ứng viên (không cắt theo limit) để chọn tay.
router.post(
  '/eligible-students',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.listEligibleStudents,
);

// Gán SV đã chọn vào một lớp học (một môn / một section).
router.post(
  '/assign-to-class',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.assignToClass,
);

// Tạo lớp học phần mới (đúng nhóm lọc) rồi gán SV đã chọn — không dùng lớp có sẵn.
router.post(
  '/create-class-and-assign',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.createClassAndAssign,
);

// ── Enrollment Management ────────────────────────────────────────────────────────

// GET /api/auto-enrollment/status?semesterNum=1&academicYear=2025-2026&classGroup=SE1808-01
// Xem trạng thái enrolled + waitlist của sinh viên cho một HK (trước khi reset / promote)
router.get(
  '/status',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.getEnrollmentStatus,
);

// DELETE /api/auto-enrollment/enrollments?semesterNum=1&academicYear=2025-2026&classGroup=SE1808-01
// Xóa enrollment theo HK + classGroup (tùy chọn) để reset trạng thái
router.delete(
  '/enrollments',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.deleteEnrollments,
);

// DELETE /api/auto-enrollment/waitlists?semesterNum=1&academicYear=2025-2026&classGroup=SE1808-01
// Xóa waitlist theo HK + classGroup (tùy chọn) để reset trạng thái
router.delete(
  '/waitlists',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.deleteWaitlists,
);

// PATCH /api/auto-enrollment/waitlists/:waitlistId/promote
// Kéo sinh viên từ waitlist lên enrolled (tự tìm lớp trống hoặc chỉ định lớp)
router.patch(
  '/waitlists/:waitlistId/promote',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.promoteWaitlist,
);

module.exports = router;
