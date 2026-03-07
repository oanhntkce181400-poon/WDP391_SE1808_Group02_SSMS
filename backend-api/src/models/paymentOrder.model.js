const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  // Mã đơn hàng từ PayOS
  orderCode: {
    type: Number,
    required: true,
    unique: true,
  },
  
  // Mã sinh viên
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  
  // Mã học kỳ
  semesterCode: {
    type: String,
    required: true,
  },
  
  // Số tiền
  amount: {
    type: Number,
    required: true,
  },
  
  // Nội dung thanh toán
  description: {
    type: String,
    required: true,
  },
  
  // Tên sản phẩm
  productName: {
    type: String,
  },
  
  // Trạng thái: PENDING, PAID, CANCELLED
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'FAILED'],
    default: 'PENDING',
  },
  
  // Link thanh toán PayOS
  checkoutUrl: {
    type: String,
  },
  
  // QR Code
  qrCode: {
    type: String,
  },
  
  // Thông tin ngân hàng
  accountName: {
    type: String,
  },
  accountNumber: {
    type: String,
  },
  bin: {
    type: String,
  },
  
  // Thời gian tạo và cập nhật
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Thời gian thanh toán
  paidAt: {
    type: Date,
  },
}, { timestamps: true });

// Index for faster queries
paymentOrderSchema.index({ studentId: 1, semesterCode: 1 });
paymentOrderSchema.index({ orderCode: 1 });
paymentOrderSchema.index({ status: 1 });

const PaymentOrder = mongoose.model('PaymentOrder', paymentOrderSchema);

module.exports = PaymentOrder;
