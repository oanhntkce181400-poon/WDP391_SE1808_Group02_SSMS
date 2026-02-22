const mongoose = require('mongoose');

/**
 * Feedback Template Schema
 * Định nghĩa bộ câu hỏi đánh giá chất lượng giảng dạy
 * Lưu cấu hình thời gian mở cổng đánh giá
 */
const feedbackTemplateSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    templateName: {
      type: String,
      required: true,
      trim: true,
      example: 'Đánh giá chất lượng giảng dạy - Học kỳ 1'
    },
    
    description: {
      type: String,
      trim: true,
      default: ''
    },

    // Các câu hỏi trong template
    questions: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true
        },
        questionText: {
          type: String,
          required: true,
          trim: true,
          example: 'Thầy/cô có truyền tải nội dung đầy đủ và rõ ràng?'
        },
        questionType: {
          type: String,
          required: true,
          enum: ['rating', 'text', 'multipleChoice'],
          default: 'rating',
          description: 'rating: 1-5 sao, text: ý kiến tự luận, multipleChoice: chọn một lựa chọn'
        },
        // Cho các câu hỏi rating
        ratingScale: {
          type: Number,
          default: 5,
          enum: [3, 4, 5],
          description: 'Thang đánh giá (3, 4 hoặc 5 sao)'
        },
        // Cho các câu hỏi multipleChoice
        options: [
          {
            _id: {
              type: mongoose.Schema.Types.ObjectId,
              auto: true
            },
            label: String,
            value: String
          }
        ],
        // Cho text
        isRequired: {
          type: Boolean,
          default: false
        },
        maxLength: {
          type: Number,
          default: 500
        },
        displayOrder: {
          type: Number,
          default: 0
        }
      }
    ],

    // Cấu hình thời gian
    feedbackPeriod: {
      startDate: {
        type: Date,
        required: true,
        description: 'Ngày bắt đầu mở cổng đánh giá'
      },
      endDate: {
        type: Date,
        required: true,
        description: 'Ngày kết thúc cổng đánh giá'
      }
    },

    // Trạng thái
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'archived'],
      default: 'draft',
      description: 'draft: dự thảo, active: đang mở, closed: đã đóng, archived: lưu trữ'
    },

    // Đối tượng đánh giá
    evaluationTarget: {
      type: String,
      enum: ['teacher', 'course', 'program'],
      default: 'teacher',
      description: 'Đối tượng được đánh giá: giáo viên, khóa học, chương trình'
    },

    // Thông tin liên quan
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null
    },

    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'feedbackTemplates'
  }
);

// Index để tìm kiếm nhanh
feedbackTemplateSchema.index({ status: 1, 'feedbackPeriod.startDate': 1 });
feedbackTemplateSchema.index({ evaluationTarget: 1, status: 1 });

module.exports = mongoose.model('FeedbackTemplate', feedbackTemplateSchema);
