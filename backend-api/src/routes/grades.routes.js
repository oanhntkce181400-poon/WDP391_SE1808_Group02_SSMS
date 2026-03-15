// grades.routes.js
// Routes cho Grades Management API
// Tác giả: Group02 - WDP391

const express = require('express');
const gradesController = require('../controllers/grades.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// STUDENT ROUTES (/api/grades/*)
// ─────────────────────────────────────────────────────────────

// GET /api/grades/my-grades
// Lấy tất cả enrollment có điểm, group by semester
router.get(
  '/my-grades',
  authMiddleware,
  gradesController.getMyGrades
);

// GET /api/grades/:enrollmentId/details
// Lấy chi tiết các thành phần điểm của một enrollment
router.get(
  '/:enrollmentId/details',
  authMiddleware,
  gradesController.getGradeDetails
);

// ─────────────────────────────────────────────────────────────
// ADMIN/STAFF ROUTES
// ─────────────────────────────────────────────────────────────

// POST /api/grades/:enrollmentId/calculate
// Tính điểm cuối cùng dựa trên các thành phần điểm
router.post(
  '/:enrollmentId/calculate',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  gradesController.calculateFinalGrade
);

// PATCH /api/grades/:enrollmentId/component
// Cập nhật một thành phần điểm (GK, CK, BT, Quá trình)
// Body: { componentType: 'midtermScore|finalScore|assignmentScore|continuousScore', score: number }
router.patch(
  '/:enrollmentId/component',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  gradesController.updateGradeComponent
);

// POST /api/grades/class/:classSectionId/calculate-all
// Tính điểm cuối cùng cho tất cả enrollments của một lớp học
router.post(
  '/class/:classSectionId/calculate-all',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  gradesController.calculateFinalGradesForClass
);

module.exports = router;
