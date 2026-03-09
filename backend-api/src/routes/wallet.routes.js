// wallet.routes.js
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// GET /api/wallet - Lấy thông tin ví
router.get('/', authMiddleware, walletController.getMyWallet);

// GET /api/wallet/transactions - Lấy lịch sử giao dịch
router.get('/transactions', authMiddleware, walletController.getMyTransactions);

// POST /api/wallet/deposit - Tạo link nạp tiền
router.post('/deposit', authMiddleware, walletController.createDeposit);

// POST /api/wallet/confirm - Xác nhận nạp tiền
router.post('/confirm', authMiddleware, walletController.confirmDeposit);

// POST /api/wallet/refund-tuition-excess - Chuyển tiền thừa học phí vào ví
router.post('/refund-tuition-excess', authMiddleware, walletController.refundTuitionExcess);

module.exports = router;
