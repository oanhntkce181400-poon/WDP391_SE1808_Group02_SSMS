const { Router } = require("express");
const ctrl = require("./classSection.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");

const router = Router();

const ADMIN_STAFF = rbacMiddleware(["admin", "staff"]);

// ─── UC22 & UC39 - Student Registration Features ────────────────────

// UC22 - Search Available Classes
router.get("/search", authMiddleware, ctrl.searchClasses);

// UC39 - View Class List with Capacity
router.get("/list", authMiddleware, ctrl.getClassList);

// ─── Admin Routes ────────────────────

// Bulk update status - PHẢI ĐẶT TRƯỚC /:classId
router.patch(
  "/bulk-status",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.bulkUpdateStatus
);

// Check schedule conflict
router.post(
  "/check-conflict",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.checkConflict
);

// Reassign class - chuyển sinh viên giữa các lớp
router.post(
  "/reassign",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.reassignClass
);

// Enrollment endpoints
router.post(
  "/enrollment/create",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.enrollStudent,
);
router.post("/enrollment/:enrollmentId/drop", authMiddleware, ctrl.dropCourse);
router.get(
  "/student/:studentId/enrollments",
  authMiddleware,
  ctrl.getStudentEnrollments
);
router.get("/:classId/enrollments", authMiddleware, ctrl.getClassEnrollments);

// Class Details for Student - xem chi tiết lớp học phần (KHÔNG cần auth)
router.get("/:classId/details", ctrl.getClassDetails);

// Class Section CRUD - PHẢI ĐẶT SAU các route cụ thể
router.get("/", authMiddleware, ctrl.getAll);
router.get("/:classId", authMiddleware, ctrl.getById);
router.post("/", authMiddleware, ADMIN_STAFF, ctrl.create);
router.patch("/:classId", authMiddleware, ADMIN_STAFF, ctrl.update);
router.delete("/:classId", authMiddleware, ADMIN_STAFF, ctrl.remove);

module.exports = router;
