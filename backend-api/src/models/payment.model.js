// payment.model.js
// Model lưu lịch sử nộp học phí của sinh viên
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Sinh viên nộp tiền
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    // Mã học kỳ, VD: "2025-2026_1" — khớp với Semester.code
    semesterCode: {
      type: String,
      required: true,
      index: true,
    },

    // Số tiền đã nộp (VNĐ)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Ngày giờ nộp tiền
    paidAt: {
      type: Date,
      default: Date.now,
    },

    // Ghi chú (VD: mã giao dịch, hình thức thanh toán)
    note: {
      type: String,
      trim: true,
      default: '',
    },

    // Phương thức thanh toán
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'online', 'other'],
      default: 'bank_transfer',
    },
  },
  { timestamps: true },
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
