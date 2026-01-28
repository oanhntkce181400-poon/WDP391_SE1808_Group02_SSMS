// Tuition Fee Model - Quản lý học phí theo kỳ học
const mongoose = require('mongoose');

// Schema cho discount/giảm giá
const discountSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên loại giảm giá (Early Bird, Full Payment, Alumni...)
  type: { type: String, enum: ['percentage', 'fixed'], required: true }, // % hoặc số tiền cố định
  value: { type: Number, required: true }, // Giá trị giảm (5 = 5% hoặc 500000 VNĐ)
  description: { type: String }, // Mô tả
});

// Schema cho môn học trong kỳ
const semesterSubjectSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  credits: { type: Number, required: true },
  tuitionFee: { type: Number, required: true }, // Học phí môn này
});

// Schema chính - Học phí theo kỳ
const tuitionFeeSchema = new mongoose.Schema(
  {
    semester: { type: String, required: true }, // VD: "Kỳ 1", "Semester 1"
    cohort: { type: String, required: true }, // Khóa học (K20, K21...)
    academicYear: { type: String, required: true }, // Năm học (2023-2024)
    majorCode: { type: String, required: true }, // Mã ngành (SE, AI, GD...)
    
    // Danh sách môn học trong kỳ
    subjects: [semesterSubjectSchema],
    
    // Học phí cơ bản (tính từ tổng tín chỉ)
    totalCredits: { type: Number, required: true },
    baseTuitionFee: { type: Number, required: true }, // = totalCredits × 630,000
    
    // Các loại giảm giá
    discounts: [discountSchema],
    
    // Tổng giảm giá (tính được)
    totalDiscount: { type: Number, default: 0 },
    
    // Học phí cuối cùng sau giảm
    finalTuitionFee: { type: Number, required: true },
    
    // Trạng thái
    status: { 
      type: String, 
      enum: ['draft', 'active', 'archived'], 
      default: 'active' 
    },
    
    // Ghi chú
    notes: { type: String },
  },
  { timestamps: true }
);

// Index để query nhanh
tuitionFeeSchema.index({ cohort: 1, semester: 1, majorCode: 1 });
tuitionFeeSchema.index({ academicYear: 1 });

// Method tính tổng discount
tuitionFeeSchema.methods.calculateTotalDiscount = function() {
  let total = 0;
  this.discounts.forEach(discount => {
    if (discount.type === 'percentage') {
      total += (this.baseTuitionFee * discount.value) / 100;
    } else {
      total += discount.value;
    }
  });
  return total;
};

// Method tính học phí cuối
tuitionFeeSchema.methods.calculateFinalFee = function() {
  const totalDiscount = this.calculateTotalDiscount();
  return Math.max(0, this.baseTuitionFee - totalDiscount);
};

const TuitionFee = mongoose.model('TuitionFee', tuitionFeeSchema);

module.exports = TuitionFee;
