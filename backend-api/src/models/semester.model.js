// semester.model.js
// Model học kỳ - dùng để xác định học kỳ hiện tại và tra cứu theo ID
const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    // Mã định danh duy nhất, VD: "2025-2026_1"
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Tên hiển thị, VD: "Kỳ 1 - 2025/2026" hoặc "Kỳ học lại - 2025/2026"
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Loại học kỳ: regular (chính), summer (hè), repeat (học lại), supplementary (phụ)
    semesterType: {
      type: String,
      enum: ['regular', 'summer', 'repeat', 'supplementary'],
      default: 'regular',
    },

    // Số thứ tự học kỳ trong năm: 1, 2, 3, 4, 5...
    semesterNum: {
      type: Number,
      required: true,
      min: 1,
    },

    // Năm học, VD: "2025-2026"
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    // Ngày bắt đầu và kết thúc
    startDate: { type: Date },
    endDate:   { type: Date },

    // Mô tả thêm
    description: { type: String },

    // Học kỳ hiện tại không? Chỉ có 1 bản ghi có isCurrent = true
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Trạng thái: active, inactive
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Semester = mongoose.model('Semester', semesterSchema);

module.exports = Semester;
