const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const rbacMiddleware = require("../middlewares/rbac.middleware");
const classSectionController = require("../modules/classSection/classSection.controller");

const ADMIN_STAFF = rbacMiddleware(["admin", "staff"]);

// Assign lecturer - admin/staff
// PATCH /api/class-sections/:id/assign-lecturer
router.patch(
  "/:id/assign-lecturer",
  authMiddleware,
  ADMIN_STAFF,
  classSectionController.assignLecturer,
);

// UC99 - View Class Roster
// GET /api/class-sections/:id/students
router.get(
  "/:id/students",
  authMiddleware,
  rbacMiddleware(["student"]),
  classSectionController.getClassRoster,
);

module.exports = router;
