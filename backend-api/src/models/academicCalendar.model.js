const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    holidayType: {
      type: String,
      enum: ['holiday', 'exam-break', 'semester-break', 'other'],
      default: 'holiday',
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    color: {
      type: String,
      default: '#f97316',
      trim: true,
      match: /^#([0-9A-Fa-f]{6})$/,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

academicCalendarSchema.index({ year: 1, startDate: 1, endDate: 1 });
academicCalendarSchema.index({ year: 1, isActive: 1 });

const AcademicCalendar = mongoose.model('AcademicCalendar', academicCalendarSchema);

module.exports = AcademicCalendar;
