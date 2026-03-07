const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const financeController = require('../controllers/finance.controller');

router.get(
  '/tuition/me',
  authMiddleware,
  financeController.getMyTuitionSummary,
);

// Xác nhận thanh toán PayOS và lưu vào DB
router.post(
  '/payments/confirm',
  authMiddleware,
  financeController.confirmPayment,
);

// Lấy lịch sử thanh toán của sinh viên
router.get(
  '/payments/history',
  authMiddleware,
  financeController.getPaymentHistory,
);

// Tổng hợp thanh toán của tất cả sinh viên (admin)
router.get(
  '/payments/all-students',
  authMiddleware,
  financeController.getAllStudentsPaymentSummary,
);

module.exports = router;
