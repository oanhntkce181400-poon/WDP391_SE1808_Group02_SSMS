const mongoose = require('mongoose');

const prerequisiteSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
});

const majorRequirementSchema = new mongoose.Schema({
  majorCode: { type: String, required: true },
  isRequired: { type: Boolean, default: true },
});

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, unique: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true },
    tuitionFee: { type: Number, default: 0 }, // Học phí (VNĐ) - 630,000 VNĐ/tín chỉ
    majorCode: { type: String, trim: true }, // Single department (backward compatibility)
    majorCodes: [{ type: String, trim: true }], // Multiple departments (backward compatibility)
    isCommon: { type: Boolean, default: false }, // Môn chung cho toàn khoa
    facultyCode: { type: String, trim: true }, // New: Mã khoa quản lý môn học
    majorRequirements: [majorRequirementSchema], // Danh sách chuyên ngành áp dụng với yêu cầu (bắt buộc/tự chọn)
    description: { type: String, trim: true }, // Mô tả môn học
    prerequisites: [prerequisiteSchema],
  },
  { timestamps: true },
);

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
