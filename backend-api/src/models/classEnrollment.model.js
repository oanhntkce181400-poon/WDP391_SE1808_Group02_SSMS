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
    grade: { 
      type: Number,
      min: 0,
      max: 10 
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
