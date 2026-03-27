const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Student submits feedback
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackController.submitFeedback.bind(feedbackController)
);

// Get all pending feedbacks (admin/staff) - MUST be before /:id routes
router.get(
  '/pending',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackController.getPendingFeedback.bind(feedbackController)
);

// Get student's own feedbacks
router.get(
  '/my-feedbacks',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackController.getMyFeedback.bind(feedbackController)
);

// Get current lecturer-feedback availability for student portal
router.get(
  '/availability',
  authMiddleware,
  rbacMiddleware(['student', 'admin', 'staff']),
  feedbackController.getFeedbackAvailability.bind(feedbackController)
);

// Authenticated approved-feedback feed for student/admin/staff viewers.
router.get(
  '/class/:classSectionId',
  authMiddleware,
  rbacMiddleware(['student', 'admin', 'staff']),
  feedbackController.getClassFeedback.bind(feedbackController)
);

// Aggregated stats for the same authenticated viewers as the class feed.
router.get(
  '/class/:classSectionId/stats',
  authMiddleware,
  rbacMiddleware(['student', 'admin', 'staff']),
  feedbackController.getClassFeedbackStats.bind(feedbackController)
);

// Get feedback window info (remaining time to edit)
router.get(
  '/:id/window',
  authMiddleware,
  feedbackController.getFeedbackWindowInfo.bind(feedbackController)
);

// Student updates their feedback (if within feedback window)
router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware(['student']),
  feedbackController.updateFeedback.bind(feedbackController)
);

// Approve feedback (admin/staff)
router.patch(
  '/:feedbackId/approve',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackController.approveFeedback.bind(feedbackController)
);

// Reject feedback (admin/staff)
router.patch(
  '/:feedbackId/reject',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackController.rejectFeedback.bind(feedbackController)
);

// Delete feedback (student can delete if within window, admin can always delete)
router.delete(
  '/:id',
  authMiddleware,
  feedbackController.deleteFeedback.bind(feedbackController)
);

module.exports = router;
