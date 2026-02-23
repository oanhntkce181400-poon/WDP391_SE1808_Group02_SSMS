const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    // Ngày học trong tuần: 1=Thứ 2, 2=Thứ 3, ..., 6=Thứ 7, 7=Chủ nhật
    dayOfWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    // Tiết bắt đầu (1, 2, 3, ...)
    startPeriod: {
      type: Number,
      required: true,
      min: 1,
    },
    // Tiết kết thúc
    endPeriod: {
      type: Number,
      required: true,
      min: 1,
    },
    // Ngày bắt đầu học
    startDate: {
      type: Date,
      required: true,
    },
    // Ngày kết thúc học
    endDate: {
      type: Date,
      required: true,
    },
    // Trạng thái: active, cancelled
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index cho việc check trùng lịch phòng
scheduleSchema.index({ room: 1, dayOfWeek: 1, startPeriod: 1, endPeriod: 1, status: 1 });
// Index cho việc check trùng lịch giảng viên (qua classSection)
scheduleSchema.index({ classSection: 1, status: 1 });
// Index cho việc tìm lịch theo lớp
scheduleSchema.index({ classSection: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;
