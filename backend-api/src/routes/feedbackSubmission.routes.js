const express = require('express');
const router = express.Router();
const feedbackSubmissionController = require('../controllers/feedbackSubmission.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Sinh viên gửi đánh giá
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackSubmissionController.submitFeedback.bind(feedbackSubmissionController)
);

// Lấy thống kê đánh giá cho một template
router.get(
  '/:templateId/statistics',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackSubmissionController.getStatistics.bind(feedbackSubmissionController)
);

// Lấy tóm tắt đánh giá của giáo viên
router.get(
  '/teacher/:teacherId/summary',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackSubmissionController.getTeacherFeedbackSummary.bind(feedbackSubmissionController)
);

module.exports = router;
