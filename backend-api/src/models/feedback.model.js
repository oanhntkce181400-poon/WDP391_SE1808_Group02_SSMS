const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // The class section being evaluated by the student.
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true,
    },

    // We always keep the internal owner reference, even when the feedback is
    // anonymous to other users. That is what allows the mobile app to reopen
    // the student's existing submission for update/delete actions later.
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // This flag only controls what the public UI may reveal.
    isAnonymous: {
      type: Boolean,
      default: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    // Optional criterion-level ratings used by the mobile lecturer feedback
    // form. Each field stays nullable so partial submissions remain valid.
    criteria: {
      teachingQuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      courseContent: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      classEnvironment: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      materialQuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    submissionIp: String,
    submissionUserAgent: String,
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Query patterns used by the feedback feed, ownership lookup and moderation UI.
feedbackSchema.index({ classSection: 1, submittedBy: 1, createdAt: -1 });
feedbackSchema.index({ classSection: 1, status: 1 });
feedbackSchema.index({ rating: 1 });

feedbackSchema.pre('save', function saveFeedback(next) {
  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);
