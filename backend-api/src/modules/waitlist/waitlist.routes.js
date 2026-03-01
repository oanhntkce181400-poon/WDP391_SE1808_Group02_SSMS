// waitlist.routes.js
// Routes cho module waitlist
const { Router } = require("express");
const ctrl = require("./waitlist.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");

const router = Router();

// Role definitions
const STUDENT = rbacMiddleware(["student", "admin", "staff"]);
const ADMIN_STAFF = rbacMiddleware(["admin", "staff", "academic-admin"]);
const ADMIN_ONLY = rbacMiddleware(["admin", "academic-admin"]);

// ============================================
// STUDENT ROUTES
// ============================================

// POST /waitlist - Join waitlist (Student)
router.post(
  "/",
  authMiddleware,
  STUDENT,
  ctrl.joinWaitlist
);

// GET /waitlist/my - Get my waitlist (Student)
router.get(
  "/my",
  authMiddleware,
  STUDENT,
  ctrl.getMyWaitlist
);

// DELETE /waitlist/:id - Cancel my waitlist (Student)
router.delete(
  "/:id",
  authMiddleware,
  STUDENT,
  ctrl.cancelWaitlist
);

// ============================================
// ADMIN ROUTES
// ============================================

// GET /waitlist/admin/all - Get all waitlist (Admin)
router.get(
  "/admin/all",
  authMiddleware,
  ADMIN_STAFF,
  ctrl.getWaitlist
);

// DELETE /waitlist/:id/admin - Delete waitlist (Admin)
router.delete(
  "/:id/admin",
  authMiddleware,
  ADMIN_ONLY,
  ctrl.deleteWaitlist
);

module.exports = router;
