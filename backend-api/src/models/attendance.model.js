// attendance.model.js
// Model lưu trữ điểm danh cho từng buổi học (slot) của lớp học phần
// Mỗi document = 1 sinh viên trong 1 buổi học cụ thể

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    // Lớp học phần chứa buổi học này
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true,
    },

    // slotId = chuỗi định danh buổi học, VD: "2026-02-22" hoặc "slot_1"
    // Dùng ngày thực tế làm slotId cho đơn giản
    slotId: {
      type: String,
      required: true,
      trim: true,
    },

    // Ngày diễn ra buổi học
    slotDate: {
      type: Date,
      required: true,
    },

    // Sinh viên được điểm danh
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    // Trạng thái điểm danh
    // Present = có mặt, Absent = vắng, Late = đi trễ
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      default: 'Present',
    },

    // Ghi chú thêm (tùy chọn, VD: "Có phép", "Bệnh"...)
    note: {
      type: String,
      default: '',
      trim: true,
    },

    // Cờ cảnh báo: sinh viên này có tỷ lệ vắng > 15% không?
    // Được tự động tính lại sau mỗi lần lưu bulk
    absenceWarning: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Tự động thêm createdAt và updatedAt
    timestamps: true,
  },
);

// Index giúp tìm kiếm nhanh theo lớp + buổi học
attendanceSchema.index({ classSection: 1, slotId: 1 });
// Index để tìm tất cả điểm danh của 1 sinh viên
attendanceSchema.index({ student: 1 });
// Unique: mỗi sinh viên chỉ có 1 bản ghi điểm danh / buổi / lớp
attendanceSchema.index(
  { classSection: 1, slotId: 1, student: 1 },
  { unique: true },
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
