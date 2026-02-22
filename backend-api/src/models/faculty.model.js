// faculty.model.js
// Model Khoa (Faculty) - Đơn vị quản lý các ngành đào tạo
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    facultyCode: { type: String, required: true, unique: true, trim: true },
    facultyName: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true }, // Tên viết tắt
    description: { type: String, trim: true },
    majorCount: { type: Number, default: 0 }, // Số ngành thuộc khoa
    studentCount: { type: Number, default: 0 }, // Tổng số sinh viên
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Faculty = mongoose.model('Faculty', facultySchema);

module.exports = Faculty;
