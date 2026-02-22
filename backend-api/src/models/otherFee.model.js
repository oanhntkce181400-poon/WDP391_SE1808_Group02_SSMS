// otherFee.model.js
// Model lưu các khoản phí khác của sinh viên trong học kỳ
// VD: phí ký túc xá, phí bảo hiểm, phí hoạt động...
const mongoose = require('mongoose');

const otherFeeSchema = new mongoose.Schema(
  {
    // Sinh viên chịu khoản phí này
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

    // Tên loại phí, VD: "Phí bảo hiểm", "Phí ký túc xá"
    feeName: {
      type: String,
      required: true,
      trim: true,
    },

    // Số tiền (VNĐ)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

const OtherFee = mongoose.model('OtherFee', otherFeeSchema);

module.exports = OtherFee;
