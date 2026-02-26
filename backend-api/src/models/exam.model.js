const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    examCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: false,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeslot",
      required: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    examRules: {
      type: String,
      trim: true,
      default: "Quy chế thi tiêu chuẩn",
    },
    notes: {
      type: String,
      trim: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    registeredStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true },
);

// Pre-save validation
examSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error("End time must be after start time"));
  }
  next();
});

// Indexes
examSchema.index({ classSection: 1 });
examSchema.index({ subject: 1 });
examSchema.index({ room: 1 });
examSchema.index({ examDate: 1 });
examSchema.index({ status: 1 });

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;
