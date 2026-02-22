// curriculumSemester.model.js
// Model học kỳ trong khung chương trình - tách riêng để hỗ trợ reorder
const mongoose = require('mongoose');

const curriculumSemesterSchema = new mongoose.Schema(
  {
    // Curriculum reference
    curriculum: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Curriculum',
      required: true,
    },

    // Tên hiển thị, VD: "Học kỳ 1", "Học kỳ 2"
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Thứ tự hiển thị - dùng cho việc reorder (1, 2, 3...)
    semesterOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    // Tổng tín chỉ trong học kỳ này
    credits: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index để query nhanh theo curriculum và order
curriculumSemesterSchema.index({ curriculum: 1, semesterOrder: 1 });
curriculumSemesterSchema.index({ curriculum: 1 });

const CurriculumSemester = mongoose.model('CurriculumSemester', curriculumSemesterSchema);

module.exports = CurriculumSemester;
