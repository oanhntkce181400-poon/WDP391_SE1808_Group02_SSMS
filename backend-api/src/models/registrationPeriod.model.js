// registrationPeriod.model.js
// Model quản lý đợt đăng ký môn học
// Dùng để cấu hình thời gian đăng ký cho các khóa sinh viên

const mongoose = require('mongoose');

const registrationPeriodSchema = new mongoose.Schema(
  {
    // Tên đợt đăng ký, VD: "Đăng ký môn học Kỳ 1 2025-2026"
    periodName: {
      type: String,
      required: true,
      trim: true,
    },

    // Ngày giờ bắt đầu đăng ký
    startDate: {
      type: Date,
      required: true,
    },

    // Ngày giờ kết thúc đăng ký
    endDate: {
      type: Date,
      required: true,
    },

    // Loại đợt đăng ký / loại đơn
    // Dùng để phân biệt các luồng:
    // - repeat: đăng ký học lại
    // - overload: đăng ký học vượt
    // - change_class: xin chuyển lớp
    // - drop: hủy môn / rút môn
    // - all: áp dụng cho tất cả loại đơn / đăng ký chung
    requestType: {
      type: String,
      enum: ['repeat', 'overload', 'change_class', 'drop', 'all'],
      default: 'all',
      index: true,
    },

    // Học kỳ áp dụng cho đợt đăng ký này
    // Liên kết tới collection Semester
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
    },

    // Các khóa được phép đăng ký (VD: [17, 18, 19, 20])
    // Để trống [] nghĩa là tất cả các khóa
    allowedCohorts: {
      type: [Number],
      default: [],
      set: (cohorts) => {
        if (!Array.isArray(cohorts)) return [];
        return [...new Set(cohorts.map((c) => Number(c)).filter((c) => !Number.isNaN(c)))];
      },
    },

    // Mô tả chi tiết
    description: {
      type: String,
      default: '',
    },

    // Trạng thái đợt đăng ký
    // upcoming: chưa đến thời gian
    // active: đang mở
    // closed: đã đóng
    // cancelled: đã hủy
    status: {
      type: String,
      enum: ['upcoming', 'active', 'closed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Người cập nhật
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

// Index để tìm kiếm nhanh
registrationPeriodSchema.index({ semester: 1, status: 1 });
registrationPeriodSchema.index({ requestType: 1, status: 1 });
registrationPeriodSchema.index({ startDate: 1, endDate: 1 });

// Validate: endDate phải sau startDate
registrationPeriodSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
  } else {
    next();
  }
});

const RegistrationPeriod = mongoose.model('RegistrationPeriod', registrationPeriodSchema);

module.exports = RegistrationPeriod;
