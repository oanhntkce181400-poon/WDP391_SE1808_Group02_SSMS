const mongoose = require('mongoose');

/**
 * Schema cho Announcement (Thông báo)
 * Dùng để lưu các thông báo từ admin/staff gửi đến sinh viên
 */
const announcementSchema = new mongoose.Schema(
  {
    // Tiêu đề thông báo
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Danh mục thông báo
    category: {
      type: String,
      enum: ['hoc_vu', 'tai_chinh', 'su_kien', 'khac'],
      default: 'khac',
    },

    // Nội dung thông báo (Rich Text - HTML)
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Danh sách file đính kèm (array of objects)
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        cloudinaryId: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
        },
        mimeType: {
          type: String,
        },
      },
    ],

    // Người tạo thông báo (admin/staff)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Index để tìm kiếm nhanh
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ title: 'text', content: 'text' }); // Full-text search

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
