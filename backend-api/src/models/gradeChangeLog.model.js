const mongoose = require('mongoose');

const scoreSnapshotSchema = new mongoose.Schema(
  {
    midtermScore: { type: Number, default: null },
    finalScore: { type: Number, default: null },
    assignmentScore: { type: Number, default: null },
    continuousScore: { type: Number, default: null },
    grade: { type: Number, default: null },
  },
  { _id: false }
);

const gradeChangeLogSchema = new mongoose.Schema(
  {
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassEnrollment',
      required: true,
      index: true,
    },
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedByRole: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    changedFields: {
      type: [String],
      default: [],
    },
    beforeScores: {
      type: scoreSnapshotSchema,
      required: true,
    },
    afterScores: {
      type: scoreSnapshotSchema,
      required: true,
    },
  },
  { timestamps: true }
);

gradeChangeLogSchema.index({ enrollment: 1, createdAt: -1 });
gradeChangeLogSchema.index({ classSection: 1, createdAt: -1 });

const GradeChangeLog = mongoose.model('GradeChangeLog', gradeChangeLogSchema);

module.exports = GradeChangeLog;
