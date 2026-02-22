const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // Thông tin lớp học được đánh giá
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true
    },

    // Người gửi feedback (optional - nếu muốn anonymous thì không cần)
    // Nếu anonymous = true thì submittedBy sẽ null
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Flag ẩn danh
    isAnonymous: {
      type: Boolean,
      default: true
    },

    // Đánh giá (1-5 sao)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    // Ý kiến / comment
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },

    // Các tiêu chí đánh giá (optional)
    criteria: {
      teachingQuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      courseContent: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      classEnvironment: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      materialQuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    },

    // Trạng thái
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },

    // Metadata
    submissionIp: String,
    submissionUserAgent: String,
    rejectionReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index để tìm kiếm và validate
feedbackSchema.index({ classSection: 1, submittedBy: 1, createdAt: -1 });
feedbackSchema.index({ classSection: 1, status: 1 });
feedbackSchema.index({ rating: 1 });

// Middleware để lưu IP và user agent
feedbackSchema.pre('save', function (next) {
  // IP và User Agent sẽ được set từ controller
  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);
