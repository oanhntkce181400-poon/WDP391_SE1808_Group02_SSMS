const express = require('express');
const examController = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// GET /api/student-exams/my-exams - Student exam schedule
router.get('/my-exams', authMiddleware, rbacMiddleware(['student']), examController.getMyExams);

module.exports = router;
