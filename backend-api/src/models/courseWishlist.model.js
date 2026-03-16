const mongoose = require('mongoose');

const courseWishlistSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    enrolledClassSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

// Only allow one active request per student-subject-semester.
courseWishlistSchema.index(
  { student: 1, subject: 1, semester: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  },
);

courseWishlistSchema.index({ semester: 1, status: 1, priority: -1, createdAt: 1 });
courseWishlistSchema.index({ student: 1, createdAt: -1 });

const CourseWishlist = mongoose.model('CourseWishlist', courseWishlistSchema);

module.exports = CourseWishlist;
