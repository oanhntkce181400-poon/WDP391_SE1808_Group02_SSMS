const express = require('express');
const examController = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Student routes (authenticated)
// Get my exam schedule
router.get('/me', authMiddleware, examController.getMyExams);

// Admin routes (authenticated)
// Get all exams
router.get('/', authMiddleware, examController.getAllExams);

// Create new exam
router.post('/', authMiddleware, examController.createExam);

// Get single exam by ID
router.get('/:id', authMiddleware, examController.getExamById);

// Update exam
router.patch('/:id', authMiddleware, examController.updateExam);

// Delete exam
router.delete('/:id', authMiddleware, examController.deleteExam);

// Add students to exam
router.post('/:id/add-students', authMiddleware, examController.addStudentsToExam);

module.exports = router;
