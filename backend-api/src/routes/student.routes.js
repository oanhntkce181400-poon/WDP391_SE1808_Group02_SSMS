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

// GET /api/students/me/curriculum - Lấy khung chương trình của sinh viên hiện tại (qua token)
// Phải đặt TRƯỚC /:id để không bị match nhầm id = "me"
router.get(
  '/me/curriculum',
  authMiddleware,
  rbacMiddleware(['student']),
  studentController.getMyCurriculum
);

// GET /api/students/me/gpa - Lấy GPA của sinh viên hiện tại
router.get(
  '/me/gpa',
  authMiddleware,
  rbacMiddleware(['student']),
  studentController.getMyGPA
);

// GET /api/students/me/semesters - Lấy danh sách kỳ học của sinh viên hiện tại
router.get(
  '/me/semesters',
  authMiddleware,
  rbacMiddleware(['student']),
  studentController.getMySemesterList
);

// GET /api/students/me/gpa/semester/:semesterNumber/:academicYear 
// Lấy GPA kỳ học của sinh viên hiện tại
router.get(
  '/me/gpa/semester/:semesterNumber/:academicYear',
  authMiddleware,
  rbacMiddleware(['student']),
  studentController.getMyGPABySemester
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

// GET /api/students/:id/curriculum - Lấy khung chương trình của sinh viên (admin/staff)
router.get(
  '/:id/curriculum',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudentCurriculum
);

// GET /api/students/:id/gpa - Lấy GPA của sinh viên (admin/staff)
router.get(
  '/:id/gpa',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudentGPA
);

// GET /api/students/:id/semesters - Lấy danh sách kỳ học của sinh viên (admin/staff)
router.get(
  '/:id/semesters',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudentSemesterList
);

// GET /api/students/:id/gpa/semester/:semesterNumber/:academicYear 
// Lấy GPA kỳ học của sinh viên (admin/staff)
router.get(
  '/:id/gpa/semester/:semesterNumber/:academicYear',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  studentController.getStudentGPABySemester
);

module.exports = router;
