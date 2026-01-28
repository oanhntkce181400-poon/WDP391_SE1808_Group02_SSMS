const mongoose = require('mongoose');

const prerequisiteSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
});

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, unique: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true },
    tuitionFee: { type: Number, default: 0 }, // Học phí (VNĐ) - 630,000 VNĐ/tín chỉ
    majorCode: { type: String, trim: true }, // Single department (backward compatibility)
    majorCodes: [{ type: String, trim: true }], // Multiple departments
    isCommon: { type: Boolean, default: false }, // Môn chung cho toàn khoa
    prerequisites: [prerequisiteSchema],
  },
  { timestamps: true },
);

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
