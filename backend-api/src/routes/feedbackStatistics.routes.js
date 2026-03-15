const express = require('express');
const router = express.Router();
const feedbackStatisticsController = require('../controllers/feedbackStatistics.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Lấy thống kê giáo viên
router.get(
  '/teacher/:teacherId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackStatisticsController.getTeacherStatistics.bind(feedbackStatisticsController)
);

// Lấy thống kê template
router.get(
  '/template/:templateId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackStatisticsController.getTemplateStatistics.bind(feedbackStatisticsController)
);

// So sánh giáo viên
router.get(
  '/teachers/top',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackStatisticsController.getTeacherComparison.bind(feedbackStatisticsController)
);

// Lấy thống kê theo khoảng thời gian
router.get(
  '/range',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackStatisticsController.getStatisticsByDateRange.bind(feedbackStatisticsController)
);

// Phân tích câu hỏi
router.get(
  '/question/:templateId/:questionId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackStatisticsController.analyzeQuestion.bind(feedbackStatisticsController)
);

module.exports = router;
