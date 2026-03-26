const express = require('express');
const feedbackTemplateController = require('../controllers/feedbackTemplate.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.createFeedbackTemplate,
);

router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.getFeedbackTemplates,
);

router.get(
  '/active',
  authMiddleware,
  feedbackTemplateController.getActiveFeedbackTemplates,
);

router.post(
  '/sync-defaults',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.syncDefaultTemplates,
);

router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.getFeedbackTemplateById,
);

router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.updateFeedbackTemplate,
);

router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.deleteFeedbackTemplate,
);

router.post(
  '/:id/questions',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.addQuestion,
);

router.delete(
  '/:templateId/questions/:questionId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.removeQuestion,
);

router.patch(
  '/:templateId/questions/:questionId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.updateQuestion,
);

router.patch(
  '/:id/status',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  feedbackTemplateController.changeFeedbackTemplateStatus,
);

module.exports = router;
