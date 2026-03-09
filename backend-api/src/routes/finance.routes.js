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

// Lấy trạng thái thanh toán theo kỳ của khung chương trình
router.get(
  '/payments/curriculum-status',
  authMiddleware,
  financeController.getMyCurriculumPaymentStatus,
);

// Tạo thanh toán theo kỳ của khung chương trình
router.post(
  '/payments/create-curriculum',
  authMiddleware,
  financeController.createCurriculumPayment,
);

// Xác nhận thanh toán và tự động đăng ký môn học
router.post(
  '/payments/confirm-with-enrollment',
  authMiddleware,
  financeController.confirmPaymentWithEnrollment,
);

// Số tiền nộp thừa học phí (để chuyển vào ví)
router.get(
  '/tuition-excess',
  authMiddleware,
  financeController.getTuitionExcess,
);

module.exports = router;
