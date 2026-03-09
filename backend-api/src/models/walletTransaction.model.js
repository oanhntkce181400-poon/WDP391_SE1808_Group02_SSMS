// walletTransaction.model.js
// Lịch sử giao dịch ví: nạp tiền, thanh toán học phí, hoàn tiền
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  // Sinh viên
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  },
  
  // Loại giao dịch
  type: {
    type: String,
    enum: ['deposit', 'payment', 'refund', 'withdrawal'],
    required: true,
  },
  
  // Số tiền
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Số dư trước giao dịch
  balanceBefore: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Số dư sau giao dịch
  balanceAfter: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Mô tả
  description: {
    type: String,
    trim: true,
    default: '',
  },
  
  // Liên kết với đơn hàng thanh toán (nếu có)
  orderCode: {
    type: String,
    index: true,
  },
  
  // Liên kết với payment (nếu là thanh toán học phí)
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed',
  },
  
  // Phương thức thanh toán
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'payos', 'cash', 'wallet', 'other'],
    default: 'bank_transfer',
  },

  // Mã kỳ (dùng cho hoàn tiền thừa học phí theo kỳ)
  semesterCode: {
    type: String,
    index: true,
  },
}, { timestamps: true });

// Index cho truy vấn nhanh
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ wallet: 1, type: 1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
