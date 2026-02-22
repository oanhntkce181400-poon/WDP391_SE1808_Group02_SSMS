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

    // Tên hiển thị, VD: "Kỳ 1 - 2025/2026"
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Số thứ tự học kỳ trong năm: 1, 2, 3
    semesterNum: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
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

    // Học kỳ hiện tại không? Chỉ có 1 bản ghi có isCurrent = true
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

const Semester = mongoose.model('Semester', semesterSchema);

module.exports = Semester;
