const express = require('express');
const feedbackTemplateController = require('../controllers/feedbackTemplate.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Admin Routes
 * Yêu cầu xác thực và quyền admin/staff
 */

// POST /api/feedback-templates - Tạo mẫu đánh giá
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.createFeedbackTemplate
);

// GET /api/feedback-templates - Lấy danh sách mẫu đánh giá
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.getFeedbackTemplates
);

// GET /api/feedback-templates/active - Lấy các mẫu đánh giá đang hoạt động
router.get(
  '/active',
  authMiddleware,
  feedbackTemplateController.getActiveFeedbackTemplates
);

// GET /api/feedback-templates/:id - Lấy chi tiết mẫu đánh giá
router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.getFeedbackTemplateById
);

// PATCH /api/feedback-templates/:id - Cập nhật mẫu đánh giá
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.updateFeedbackTemplate
);

// DELETE /api/feedback-templates/:id - Xóa mẫu đánh giá
router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.deleteFeedbackTemplate
);

// POST /api/feedback-templates/:id/questions - Thêm câu hỏi
router.post(
  '/:id/questions',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.addQuestion
);

// DELETE /api/feedback-templates/:templateId/questions/:questionId - Xóa câu hỏi
router.delete(
  '/:templateId/questions/:questionId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.removeQuestion
);

// PATCH /api/feedback-templates/:templateId/questions/:questionId - Cập nhật câu hỏi
router.patch(
  '/:templateId/questions/:questionId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.updateQuestion
);

// PATCH /api/feedback-templates/:id/status - Thay đổi trạng thái
router.patch(
  '/:id/status',
  authMiddleware,
  rbacMiddleware(['admin', 'staff', 'academicAdmin']),
  feedbackTemplateController.changeFeedbackTemplateStatus
);

module.exports = router;
