const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tạo link thanh toán (sinh viên)
router.post('/create', authMiddleware, paymentController.createPaymentLink);

// Lấy thông tin đơn hàng
router.get('/order/:orderCode', authMiddleware, paymentController.getOrder);

// Hủy đơn hàng
router.post('/order/:orderCode/cancel', authMiddleware, paymentController.cancelOrder);

// Webhook từ PayOS (không cần auth)
router.post('/webhook', paymentController.webhook);

// Lấy lịch sử giao dịch của sinh viên
router.get('/transactions/me', authMiddleware, paymentController.getMyTransactions);

// Lấy tất cả giao dịch (admin)
router.get('/transactions', authMiddleware, paymentController.getAllTransactions);

// Lấy danh sách ngân hàng (proxy để tránh CORS)
router.get('/banks', paymentController.getBanks);

module.exports = router;
