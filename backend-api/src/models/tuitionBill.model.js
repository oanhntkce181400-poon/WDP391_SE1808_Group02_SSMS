// TuitionBill Model - Lưu học phí cụ thể của từng sinh viên theo kỳ
const mongoose = require('mongoose');

const tuitionBillSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  semester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Semester',
    required: true
  },
  
  // Thông tin kỳ
  semesterCode: { type: String },
  semesterName: { type: String },
  academicYear: { type: String },
  
  // Các khoản tiền
  baseAmount: { type: Number, default: 0 },       // Học phí mặc định (theo tín chỉ)
  overloadAmount: { type: Number, default: 0 },   // Học vượt (đăng ký > số tín chỉ bình thường)
  repeatAmount: { type: Number, default: 0 },    // Học lại (môn đã fail)
  discountAmount: { type: Number, default: 0 },  // Giảm trừ
  
  // Tổng cộng
  totalAmount: { type: Number, default: 0 },
  
  // Số tín chỉ
  baseCredits: { type: Number, default: 0 },      // Tín chỉ mặc định
  overloadCredits: { type: Number, default: 0 }, // Tín chỉ học vượt
  repeatCredits: { type: Number, default: 0 },   // Tín chỉ học lại
  totalCredits: { type: Number, default: 0 },
  
  // Thanh toán
  paidAmount: { type: Number, default: 0 },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  transactionId: { type: String },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  // Hạn thanh toán
  dueDate: { type: Date },
  
  // Ghi chú
  notes: { type: String },
  
  // Thông tin curriculum
  curriculumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curriculum'
  },
  curriculumSemester: { type: Number }, // Kỳ trong khung chương trình (1-9)
  
  // Danh sách môn học
  baseSubjects: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectCode: { type: String },
    subjectName: { type: String },
    credits: { type: Number },
    fee: { type: Number }
  }],
  repeatSubjects: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectCode: { type: String },
    subjectName: { type: String },
    credits: { type: Number },
    fee: { type: Number }
  }],
  
  // Loại bill (auto-generated hoặc manual)
  billType: {
    type: String,
    enum: ['auto', 'manual', 'adjustment'],
    default: 'auto'
  },
  
  // Người tạo (cho manual/adjustment)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index
tuitionBillSchema.index({ student: 1, semester: 1 }, { unique: true });
tuitionBillSchema.index({ student: 1, status: 1 });
tuitionBillSchema.index({ semester: 1, status: 1 });
tuitionBillSchema.index({ dueDate: 1 });

// Method tính tổng tiền
tuitionBillSchema.methods.calculateTotal = function() {
  this.totalAmount = this.baseAmount + this.overloadAmount + this.repeatAmount - this.discountAmount;
  this.totalCredits = this.baseCredits + this.overloadCredits + this.repeatCredits;
  return this.totalAmount;
};

// Pre-save middleware
tuitionBillSchema.pre('save', function(next) {
  this.calculateTotal();
  next();
});

const TuitionBill = mongoose.model('TuitionBill', tuitionBillSchema);

module.exports = TuitionBill;
