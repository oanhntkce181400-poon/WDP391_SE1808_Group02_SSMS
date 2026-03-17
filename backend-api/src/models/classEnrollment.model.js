const mongoose = require('mongoose');

const classEnrollmentSchema = new mongoose.Schema(
  {
    classSection: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ClassSection', 
      required: true 
    },
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
    },
    enrollmentDate: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      enum: ['enrolled', 'dropped', 'completed'], 
      default: 'enrolled' 
    },
    // Grade components
    midtermScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },
    finalScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },
    assignmentScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },
    continuousScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },
    // Final grade calculated from components
    grade: { 
      type: Number,
      min: 0,
      max: 10 
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    isOverload: {
      type: Boolean,
      default: false,
      index: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound unique index - một sinh viên chỉ đăng ký một lớp học một lần
classEnrollmentSchema.index({ classSection: 1, student: 1 }, { unique: true });
classEnrollmentSchema.index({ student: 1 });
classEnrollmentSchema.index({ classSection: 1 });
classEnrollmentSchema.index({ status: 1 });

const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema);

module.exports = ClassEnrollment;
