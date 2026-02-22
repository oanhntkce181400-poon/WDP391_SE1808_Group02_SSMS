// finance.routes.js
// Định nghĩa các route cho tính năng Học phí
// Tất cả yêu cầu xác thực JWT

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const financeController = require('../controllers/finance.controller');

// GET /api/finance/tuition/me?semesterId=...
// Sinh viên xem tổng quan học phí của mình
// Chỉ cần authMiddleware - service tự kiểm tra studentProfile
router.get(
  '/tuition/me',
  authMiddleware,
  financeController.getMyTuitionSummary,
);

module.exports = router;
