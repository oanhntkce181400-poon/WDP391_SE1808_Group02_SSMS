const mongoose = require('mongoose');

const studentExamSchema = new mongoose.Schema(
  {
    exam: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Exam', 
      required: true 
    },
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
    },
    sbd: { 
      type: String, 
      required: true,
      trim: true
    }, // Số báo danh
    seatNumber: { 
      type: String,
      trim: true 
    }, // Số ghế thi
    status: { 
      type: String, 
      enum: ['registered', 'attended', 'absent', 'cancelled'], 
      default: 'registered' 
    },
    registrationDate: { 
      type: Date, 
      default: Date.now 
    },
    notes: { 
      type: String, 
      trim: true 
    },
  },
  { timestamps: true }
);

// Compound unique index - một sinh viên chỉ đăng ký một kỳ thi một lần
studentExamSchema.index({ exam: 1, student: 1 }, { unique: true });
studentExamSchema.index({ student: 1 });
studentExamSchema.index({ exam: 1 });
studentExamSchema.index({ sbd: 1 });
studentExamSchema.index({ status: 1 });

const StudentExam = mongoose.model('StudentExam', studentExamSchema);

module.exports = StudentExam;
