const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    examCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    classCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    slot: {
      type: String,
      required: true,
      trim: true,
    },
    examDate: {
      type: Date,
      required: true,
      index: true,
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
    // SBD (Số báo danh) - Student ID number for exam
    sbd: {
      type: String,
      trim: true,
    },
    // Students enrolled in this exam (via class registration)
    enrolledStudents: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        studentCode: String,
        fullName: String,
        sbd: String, // Individual seat number for this student
      },
    ],
    examRules: {
      type: String,
      default: 'Quy chế thi chung của nhà trường',
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for finding exams by date
examSchema.index({ examDate: 1, status: 1 });
// Index for finding exams by class
examSchema.index({ classCode: 1, examDate: -1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
