// waitlist.model.js
// Model cho bảng chờ (waitlist) - lưu trữ yêu cầu bảo lưu môn của sinh viên
const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  targetSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  targetAcademicYear: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['WAITING', 'ENROLLED', 'CANCELLED'],
    default: 'WAITING'
  },
  enrolledClassSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSection'
  },
  enrolledAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String
  }
}, { timestamps: true });

// Compound unique index - một sinh viên chỉ có thể có 1 waitlist active cho 1 môn
waitlistSchema.index({ student: 1, subject: 1, status: 1 }, { unique: true });

// Index cho việc tìm kiếm waitlist theo môn và kỳ
waitlistSchema.index({ subject: 1, targetSemester: 1, targetAcademicYear: 1, status: 1 });

// Index cho việc lấy danh sách waitlist của 1 sinh viên
waitlistSchema.index({ student: 1, status: 1 });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
