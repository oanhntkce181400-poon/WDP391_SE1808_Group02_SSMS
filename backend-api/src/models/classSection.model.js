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
      required: true,
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
  },
  { timestamps: true },
);

// Indexes
classSectionSchema.index({ subject: 1 });
classSectionSchema.index({ teacher: 1 });
classSectionSchema.index({ academicYear: 1, semester: 1 });
classSectionSchema.index({ status: 1 });
// Index for schedule conflict checking
classSectionSchema.index({ semester: 1, academicYear: 1, timeslot: 1, dayOfWeek: 1 });
classSectionSchema.index({ teacher: 1, timeslot: 1, dayOfWeek: 1 });
classSectionSchema.index({ room: 1, timeslot: 1, dayOfWeek: 1 });

const ClassSection = mongoose.model("ClassSection", classSectionSchema);

module.exports = ClassSection;
