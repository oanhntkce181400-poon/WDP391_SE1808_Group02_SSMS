const mongoose = require('mongoose');

const feedbackSubmissionSchema = new mongoose.Schema(
  {
    feedbackTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedbackTemplate',
      required: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    evaluatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    evaluationType: {
      type: String,
      enum: ['teacher', 'course', 'program'],
      required: true,
    },

    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      default: null,
    },

    responses: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        questionText: String,
        questionType: {
          type: String,
          enum: ['rating', 'text', 'multipleChoice'],
        },
        answer: mongoose.Schema.Types.Mixed,
        answeredAt: Date,
      },
    ],

    status: {
      type: String,
      enum: ['submitted', 'draft'],
      default: 'submitted',
    },

    submissionScore: {
      type: Number,
      default: 0,
    },

    submissionIp: String,
    submissionUserAgent: String,
  },
  {
    timestamps: true,
    collection: 'feedbackSubmissions',
  },
);

feedbackSubmissionSchema.index(
  { feedbackTemplate: 1, submittedBy: 1, evaluatedEntity: 1, classSection: 1 },
  { unique: true },
);
feedbackSubmissionSchema.index({ evaluatedEntity: 1, evaluationType: 1 });
feedbackSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });
feedbackSubmissionSchema.index({ classSection: 1, createdAt: -1 });

module.exports = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema);
