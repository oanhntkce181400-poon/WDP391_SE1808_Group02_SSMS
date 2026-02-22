const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentCode: { type: String, required: true, unique: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    majorCode: { type: String, required: true, trim: true, index: true },
    cohort: { type: Number, required: true, index: true }, // K18, K19, K20...
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum', required: true },
    
    // Thông tin cá nhân
    identityNumber: { type: String, unique: true, sparse: true, trim: true, index: true }, // CCCD/CMND
    dateOfBirth: { type: Date },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    
    // Thông tin học tập
    classSection: { type: String, trim: true }, // Lớp sinh hoạt: SE1808, AI1801...
    academicStatus: { 
      type: String, 
      enum: ['enrolled', 'on-leave', 'dropped', 'graduated'], 
      default: 'enrolled',
      index: true
    }, // Đang học, Bảo lưu, Thôi học, Tốt nghiệp
    enrollmentYear: { type: Number }, // Năm nhập học
    
    // Liên kết tài khoản
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    
    // Trạng thái
    isActive: { type: Boolean, default: true, index: true },
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Indexes for search and filter
studentSchema.index({ studentCode: 1, fullName: 1 });
studentSchema.index({ majorCode: 1, cohort: 1 });
studentSchema.index({ academicStatus: 1, isActive: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
