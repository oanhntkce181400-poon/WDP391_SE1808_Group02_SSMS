const express = require('express');
const examController = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Student Routes (require authentication)
 */

// GET /api/exams/me - Get exam schedule for current student
router.get('/me', authMiddleware, examController.getMyExams);

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
