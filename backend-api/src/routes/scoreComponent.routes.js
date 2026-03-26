// scoreComponent.routes.js
// Routes quản lý thành phần điểm của môn học

const express = require('express');
const router = express.Router();
const scoreComponentController = require('../controllers/scoreComponent.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

/**
 * GET /api/score-components/:subjectId
 * Lấy thành phần điểm của một môn học
 */
router.get(
  '/:subjectId',
  authMiddleware,
  scoreComponentController.getScoreComponentBySubject
);

/**
 * POST /api/score-components/:subjectId
 * Tạo hoặc cập nhật thành phần điểm
 * Required: admin hoặc staff
 */
router.post(
  '/:subjectId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  scoreComponentController.createOrUpdateScoreComponent
);

/**
 * GET /api/score-components
 * Lấy danh sách tất cả score components
 */
router.get(
  '/',
  authMiddleware,
  scoreComponentController.getAllScoreComponents
);

/**
 * DELETE /api/score-components/:scoreComponentId
 * Xóa score component
 * Required: admin
 */
router.delete(
  '/:scoreComponentId',
  authMiddleware,
  rbacMiddleware(['admin']),
  scoreComponentController.deleteScoreComponent
);

module.exports = router;
