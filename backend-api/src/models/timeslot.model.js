const mongoose = require("mongoose");

const timeslotSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
    // Một ca = đúng một tiết (luôn có startPeriod === endPeriod; giữ cả hai field để tương thích schema cũ)
    startPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    endPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "timeslots",
  }
);

// Indexes
timeslotSchema.index({ status: 1 });

const Timeslot = mongoose.model("Timeslot", timeslotSchema);

module.exports = Timeslot;
