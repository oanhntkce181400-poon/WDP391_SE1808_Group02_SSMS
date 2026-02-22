// request.model.js
// Model MongoDB cho đơn từ / yêu cầu của sinh viên
// Sinh viên tạo đơn → staff xử lý → cập nhật trạng thái

const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    // Sinh viên gửi đơn (tham chiếu đến Student)
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    // Loại yêu cầu (VD: "Xin nghỉ học", "Xin bảo lưu", "Khiếu nại điểm"...)
    requestType: {
      type: String,
      required: true,
      trim: true,
    },

    // Ngày bắt đầu nghỉ/thi (tùy chọn)
    startDate: {
      type: Date,
      default: null,
    },

    // Ngày kết thúc (tùy chọn)
    endDate: {
      type: Date,
      default: null,
    },

    // Môn học liên quan (tùy chọn - tên hoặc mã môn)
    relatedSubject: {
      type: String,
      trim: true,
      default: '',
    },

    // Lý do / nội dung chi tiết
    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Danh sách URL tệp đính kèm (minh chứng)
    // Mảng chuỗi URL, có thể rỗng
    attachments: {
      type: [String],
      default: [],
    },

    // Trạng thái xử lý đơn
    // Pending   = chờ xử lý (mới tạo)
    // Processing = đang xử lý
    // Approved  = đã duyệt
    // Rejected  = từ chối
    // Cancelled = sinh viên hủy
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },

    // Ghi chú phản hồi từ staff (tùy chọn)
    staffNote: {
      type: String,
      default: '',
    },
  },
  {
    // Tự động thêm createdAt và updatedAt
    timestamps: true,
  },
);

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
