// curriculumCourse.model.js
// Model môn học trong học kỳ của khung chương trình
const mongoose = require('mongoose');

const curriculumCourseSchema = new mongoose.Schema(
  {
    // CurriculumSemester reference - KHÔNG lưu semesterNumber
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumSemester',
      required: true,
    },

    // Subject reference
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },

    // Mã môn học (denormalize để dễ truy vấn)
    subjectCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Tên môn học (denormalize để dễ truy vấn)
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    // Số tín chỉ
    credits: {
      type: Number,
      required: true,
      min: 1,
    },

    // Có tiên quyết không?
    hasPrerequisite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index để query nhanh
curriculumCourseSchema.index({ semester: 1, subjectCode: 1 });
curriculumCourseSchema.index({ semester: 1 });

const CurriculumCourse = mongoose.model('CurriculumCourse', curriculumCourseSchema);

module.exports = CurriculumCourse;
