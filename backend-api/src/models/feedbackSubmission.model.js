const mongoose = require('mongoose');

/**
 * Feedback Submission Schema
 * Lưu trữ các câu trả lời đánh giá của người dùng
 */
const feedbackSubmissionSchema = new mongoose.Schema(
  {
    // Template được sử dụng
    feedbackTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedbackTemplate',
      required: true
    },

    // Người đánh giá
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    // Đối tượng được đánh giá
    evaluatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: true // Có thể là User (teacher), ClassSection, Subject tùy vào evaluationTarget
    },

    evaluationType: {
      type: String,
      enum: ['teacher', 'course', 'program'],
      required: true
    },

    // Các câu trả lời
    responses: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        questionText: String,
        questionType: {
          type: String,
          enum: ['rating', 'text', 'multipleChoice']
        },
        // Giá trị câu trả lời có thể là number (rating), string (text/choice)
        answer: mongoose.Schema.Types.Mixed,
        // Thời gian trả lời
        answeredAt: Date
      }
    ],

    // Trạng thái
    status: {
      type: String,
      enum: ['submitted', 'draft'],
      default: 'submitted'
    },

    // Điểm cộng (nếu có)
    submissionScore: {
      type: Number,
      default: 0
    },

    // IP và User Agent (cho bảo mật)
    submissionIp: String,
    submissionUserAgent: String
  },
  {
    timestamps: true,
    collection: 'feedbackSubmissions'
  }
);

// Index để tìm kiếm nhanh
feedbackSubmissionSchema.index({ feedbackTemplate: 1, submittedBy: 1 }, { unique: true });
feedbackSubmissionSchema.index({ evaluatedEntity: 1, evaluationType: 1 });
feedbackSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema);
