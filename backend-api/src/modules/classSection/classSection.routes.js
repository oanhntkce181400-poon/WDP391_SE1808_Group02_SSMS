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

// Student-only literal route. It must stay before `/:classId`, otherwise the
// string "my-classes" is treated as a class id and hits the wrong handler.
router.get(
  "/my-classes",
  authMiddleware,
  rbacMiddleware(["student"]),
  ctrl.getMyClasses
);

// ─── Admin Routes ────────────────────

// Nhóm lớp (classGroup) + danh sách học phần trong nhóm — đặt trước /groups để path cụ thể
router.get(
  "/groups/overview",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.listClassGroupsOverview,
);

// Get distinct classGroups for filtering
router.get("/groups", authMiddleware, ADMIN_STAFF, ctrl.getDistinctClassGroups);

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

// Class Details for Student - xem chi tiết lớp học phần (cần auth)
router.get("/:classId/details", authMiddleware, ctrl.getClassDetails);
router.post(
  "/:classId/self-enroll",
  authMiddleware,
  rbacMiddleware(["student"]),
  ctrl.selfEnroll,
);

// Assign lecturer to class section
router.patch(
  "/:classId/assign-lecturer",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.assignLecturer,
);

// Class Section CRUD - PHẢI ĐẶT SAU các route cụ thể
router.get("/", authMiddleware, ctrl.getAll);
router.get("/:classId", authMiddleware, ctrl.getById);
router.post("/", authMiddleware, ADMIN_STAFF, ctrl.create);
router.patch("/:classId", authMiddleware, ADMIN_STAFF, ctrl.update);
router.delete("/:classId", authMiddleware, ADMIN_STAFF, ctrl.remove);

// Bulk create class sections from curriculum
router.post("/bulk-create", authMiddleware, ADMIN_STAFF, ctrl.bulkCreate);

// Bulk create class sections from curriculum with classGroup
router.post("/bulk-create-from-curriculum", authMiddleware, ADMIN_STAFF, ctrl.bulkCreateFromCurriculum);

// Bulk assign classGroup to multiple existing class sections
router.post("/bulk-assign-group", authMiddleware, ADMIN_STAFF, ctrl.bulkAssignGroup);

module.exports = router;
