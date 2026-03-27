const mongoose = require("mongoose");

const classSectionSchema = new mongoose.Schema(
  {
    classCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      // Có thể để trống khi mở lớp theo nhóm từ khung CT rồi phân công GV sau.
      required: false,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false, // Scheduling is done via Schedule model
    },
    timeslot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeslot",
      required: false, // Scheduling is done via Schedule model
    },
    semester: {
      type: Number,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentEnrollment: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "locked", "cancelled", "completed"],
      default: "draft",
    },
    // Ngày học trong tuần: 1=Thứ 2, 2=Thứ 3, ..., 6=Thứ 7, 7=Chủ nhật
    dayOfWeek: {
      type: Number,
      min: 1,
      max: 7,
    },
    // Ngày bắt đầu và kết thúc học phần (giới hạn thời khóa biểu cho sinh viên)
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Nhóm lớp cố định (VD: "SE1808-01", "SE1808-02")
    // Dùng để auto-enrollment gán SV đúng nhóm
    classGroup: {
      type: String,
      trim: true,
      index: true,
    },
    // Thứ tự nhóm trong classGroup (0, 1, 2, 3...)
    groupIndex: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Khung chương trình mà lớp này thuộc về
    curriculum: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",
      required: false,
    },
    // Kỳ trong khung CT mà môn này thuộc về (1, 2, 3...)
    // Dùng để auto-enrollment khớp đúng lớp cho đúng kỳ trong khung
    curriculumSemesterOrder: {
      type: Number,
      min: 1,
      required: false,
    },
  },
  { timestamps: true },
);

// Indexes
classSectionSchema.index({ subject: 1 });
classSectionSchema.index({ teacher: 1 });
classSectionSchema.index({ academicYear: 1, semester: 1 });
classSectionSchema.index({ status: 1 });
classSectionSchema.index({ classGroup: 1, semester: 1, academicYear: 1 });
classSectionSchema.index({ semester: 1, academicYear: 1, timeslot: 1, dayOfWeek: 1 });
classSectionSchema.index({ teacher: 1, timeslot: 1, dayOfWeek: 1 });
classSectionSchema.index({ room: 1, timeslot: 1, dayOfWeek: 1 });
// Index for date range queries
classSectionSchema.index({ startDate: 1, endDate: 1 });
// Index for auto-enrollment matching on curriculum + curriculumSemesterOrder
classSectionSchema.index({ curriculum: 1, curriculumSemesterOrder: 1, semester: 1 });

const ClassSection = mongoose.model("ClassSection", classSectionSchema);

module.exports = ClassSection;
