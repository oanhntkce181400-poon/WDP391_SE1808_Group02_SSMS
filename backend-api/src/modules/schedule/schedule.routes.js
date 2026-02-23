const { Router } = require("express");
const ctrl = require("./schedule.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");

const router = Router();

const ADMIN_STAFF = rbacMiddleware(["admin", "staff"]);

// Routes cho schedule (gán phòng và lịch học)
// /api/classes/:classId/schedules

// GET /api/classes/:classId/schedules - Lấy tất cả lịch học của lớp
router.get("/:classId/schedules", authMiddleware, ctrl.getClassSchedules);

// POST /api/classes/:classId/schedules - Gán lịch học cho lớp
router.post("/:classId/schedules", authMiddleware, ADMIN_STAFF, ctrl.assignSchedule);

// PUT /api/classes/:classId/schedules/:scheduleId - Cập nhật lịch học
router.put("/:classId/schedules/:scheduleId", authMiddleware, ADMIN_STAFF, ctrl.updateSchedule);

// DELETE /api/classes/:classId/schedules/:scheduleId - Xóa lịch học
router.delete("/:classId/schedules/:scheduleId", authMiddleware, ADMIN_STAFF, ctrl.deleteSchedule);

// POST /api/classes/:classId/schedules/check-conflict - Kiểm tra xung đột
router.post("/:classId/schedules/check-conflict", authMiddleware, ADMIN_STAFF, ctrl.checkConflict);

// POST /api/classes/:classId/schedules/publish - Công bố lịch học
router.post("/:classId/schedules/publish", authMiddleware, ADMIN_STAFF, ctrl.publishSchedule);

// POST /api/classes/:classId/schedules/lock - Khóa lịch học
router.post("/:classId/schedules/lock", authMiddleware, ADMIN_STAFF, ctrl.lockSchedule);

module.exports = router;
