const mongoose = require('mongoose');

/**
 * ScoreComponent Schema
 * Định nghĩa các thành phần điểm và trọng số của một môn học
 * 
 * Ví dụ:
 * {
 *   subject: "69c41734...",
 *   components: [
 *     { code: "PT1", name: "Kiểm tra 1", weight: 0.15 },
 *     { code: "PT2", name: "Kiểm tra 2", weight: 0.15 },
 *     { code: "GK", name: "Giữa kỳ", weight: 0.30 },
 *     { code: "CK", name: "Cuối kỳ", weight: 0.40 }
 *   ]
 * }
 */
const scoreComponentSchema = new mongoose.Schema(
  {
    // Reference đến Subject
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },

    // Các thành phần điểm của môn học
    components: [
      {
        // Mã thành phần (PT1, PT2, GK, CK, BT, QT, ...)
        code: {
          type: String,
          required: true,
          trim: true,
          uppercase: true
        },

        // Tên thành phần (Kiểm tra 1, Giữa kỳ, Bài tập, ...)
        name: {
          type: String,
          required: true,
          trim: true
        },

        // Trọng số (0.2 = 20%)
        weight: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
          default: 0.1
        },

        // Mô tả thêm
        description: {
          type: String,
          trim: true
        },

        // Điểm tối thiểu (0-10)
        minScore: {
          type: Number,
          default: 0,
          min: 0,
          max: 10
        },

        // Điểm tối đa (0-10)
        maxScore: {
          type: Number,
          default: 10,
          min: 0,
          max: 10
        },

        // Số lần đánh giá
        numberOfAttempts: {
          type: Number,
          default: 1,
          min: 1
        },

        // Có bắt buộc không
        isRequired: {
          type: Boolean,
          default: true
        },

        // Thứ tự hiển thị
        order: {
          type: Number,
          default: 0
        }
      }
    ],

    // Tổng trọng số (nên = 1.0)
    totalWeight: {
      type: Number,
      default: 1.0
    },

    // Ghi chú
    note: {
      type: String,
      trim: true
    },

    // Lưu trữ công thức (ví dụ: "SUM" = cộng, "AVG" = trung bình)
    calculationType: {
      type: String,
      enum: ['SUM', 'AVG', 'WEIGHTED_AVG', 'CUSTOM'],
      default: 'WEIGHTED_AVG'
    },

    // Active/Inactive
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

// Index khôngcho phép trùng lặp thành phần trong một môn
scoreComponentSchema.index({ subject: 1, 'components.code': 1 }, { unique: false });

// Validate tổng trọng số khi lưu
scoreComponentSchema.pre('save', function(next) {
  if (this.components && this.components.length > 0) {
    this.totalWeight = this.components.reduce((sum, comp) => sum + (comp.weight || 0), 0);
  }
  next();
});

const ScoreComponent = mongoose.model('ScoreComponent', scoreComponentSchema);

module.exports = ScoreComponent;
