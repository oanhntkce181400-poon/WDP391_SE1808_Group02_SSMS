const express = require('express');
const examController = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Admin Routes (require authentication + admin/staff role)
 */

// GET /api/exams - Get all exams with filtering and pagination
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.getAllExams
);

/**
 * Student Routes (require authentication)
 */

// GET /api/exams/me - Get exam schedule for current student
router.get('/me', authMiddleware, rbacMiddleware(['student']), examController.getMyExams);

// GET /api/exams/my-exams - Alias for student exam schedule
router.get('/my-exams', authMiddleware, rbacMiddleware(['student']), examController.getMyExams);

// GET /api/exams/lecturer/my-exams - Get exam schedule for current lecturer
router.get('/lecturer/my-exams', authMiddleware, rbacMiddleware(['lecturer']), examController.getMyLecturerExams);

// GET /api/exams/:examId - Get exam details
router.get('/:examId', authMiddleware, examController.getExamDetails);

/**
 * Admin Routes (require authentication + admin/staff role)
 */

// POST /api/exams - Create new exam
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.createExam
);

// PATCH /api/exams/:examId - Update exam
router.patch(
  '/:examId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.updateExam
);

// PATCH /api/exams/:id/assign-invigilator - Assign teacher(s) as invigilator
router.patch(
  '/:id/assign-invigilator',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.assignInvigilator
);

// DELETE /api/exams/:examId - Delete exam
router.delete(
  '/:examId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.deleteExam
);

// POST /api/exams/:examId/register-student - Register student for exam
router.post(
  '/:examId/register-student',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  examController.registerStudentForExam
);

module.exports = router;
