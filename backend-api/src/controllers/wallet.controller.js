// wallet.controller.js
const walletService = require('../services/wallet.service');

/**
 * GET /api/wallet - Lấy thông tin ví
 */
async function getMyWallet(req, res) {
  try {
    const userId = req.auth.sub;
    const walletInfo = await walletService.getWalletInfo(userId);
    res.json({ success: true, data: walletInfo });
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/wallet/transactions - Lấy lịch sử giao dịch
 */
async function getMyTransactions(req, res) {
  try {
    const userId = req.auth.sub;
    const { limit, skip, type } = req.query;
    const result = await walletService.getTransactions(userId, {
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      type,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/wallet/deposit - Tạo link nạp tiền
 */
async function createDeposit(req, res) {
  try {
    const userId = req.auth.sub;
    const { amount } = req.body;
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }
    const result = await walletService.createDepositPaymentLink(userId, Math.round(numAmount));
    res.json(result);
  } catch (error) {
    console.error('Error creating deposit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/wallet/confirm - Xác nhận nạp tiền (gọi sau khi PayOS xác nhận hoặc "Tôi đã chuyển khoản")
 */
async function confirmDeposit(req, res) {
  try {
    const userId = req.auth.sub;
    const { orderCode, amount } = req.body;
    const code = orderCode != null ? String(orderCode).trim() : '';
    const numAmount = Number(amount);
    if (!code) {
      return res.status(400).json({ success: false, message: 'Mã đơn không hợp lệ' });
    }
    if (!Number.isFinite(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }
    const result = await walletService.confirmDeposit(userId, code, Math.round(numAmount));
    res.json(result);
  } catch (error) {
    console.error('Error confirming deposit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/wallet/refund-tuition-excess - Chuyển tiền thừa học phí vào ví
 */
async function refundTuitionExcess(req, res) {
  try {
    const userId = req.auth.sub;
    const result = await walletService.refundTuitionExcess(userId);
    res.json(result);
  } catch (error) {
    console.error('Error refunding tuition excess:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMyWallet,
  getMyTransactions,
  createDeposit,
  confirmDeposit,
  refundTuitionExcess,
};
