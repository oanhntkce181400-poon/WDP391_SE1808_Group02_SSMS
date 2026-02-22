// student.routes.js
// Routes cho Student Management API
// Tác giả: Group02 - WDP391

const express = require('express');
const studentController = require('../controllers/student.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// FILTER ENDPOINTS (đặt trước để tránh conflict với /:id)
// ─────────────────────────────────────────────────────────────

// GET /api/students/filters/majors - Lấy danh sách ngành học
router.get(
  '/filters/majors',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getMajorsForFilter
);

// GET /api/students/filters/cohorts - Lấy danh sách khóa
router.get(
  '/filters/cohorts',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getCohortsForFilter
);

// GET /api/students/suggest-class - Gợi ý lớp sinh hoạt
router.get(
  '/suggest-class',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getSuggestedClassSection
);

// ─────────────────────────────────────────────────────────────
// CRUD ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/students - Lấy danh sách sinh viên (có filter, search, pagination)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudents
);

// POST /api/students - Tạo sinh viên mới
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.createStudent
);

// GET /api/students/:id - Lấy chi tiết sinh viên
router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudentById
);

// PUT /api/students/:id - Cập nhật thông tin sinh viên
router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.updateStudent
);

// DELETE /api/students/:id - Xóa sinh viên (soft delete)
router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.deleteStudent
);

module.exports = router;
