const express = require('express');
const router = express.Router();
const feedbackSubmissionController = require('../controllers/feedbackSubmission.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackSubmissionController.submitFeedback.bind(feedbackSubmissionController),
);

router.get(
  '/me',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackSubmissionController.getMySubmissions.bind(feedbackSubmissionController),
);

router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackSubmissionController.listSubmissions.bind(feedbackSubmissionController),
);

router.get(
  '/teacher/:teacherId/summary',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackSubmissionController.getTeacherFeedbackSummary.bind(feedbackSubmissionController),
);

router.get(
  '/:templateId/statistics',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackSubmissionController.getStatistics.bind(feedbackSubmissionController),
);

module.exports = router;
