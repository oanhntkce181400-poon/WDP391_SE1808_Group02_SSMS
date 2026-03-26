const mongoose = require("mongoose");

/**
 * Lưu bản chụp kết quả một lần chạy Auto Enrollment (để tra cứu / chỉnh sửa tên ghi chú / xóa).
 * Không thay thế ClassEnrollment — chỉ là bản ghi lịch sử + danh sách log trên UI.
 */
const enrollmentSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "" },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
      index: true,
    },
    curriculumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",
      default: null,
    },
    /** Bản sao nhỏ để hiển thị không cần populate */
    semesterSnapshot: {
      code: String,
      name: String,
      semesterNum: Number,
      academicYear: String,
    },
    curriculumCode: { type: String, trim: true },
    /** Kỳ trong khung chương trình mà batch này xếp (null nếu retake mixed) */
    curriculumSemester: { type: Number, default: null },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    dryRun: { type: Boolean, default: false },
    durationMs: { type: Number },
    summary: { type: mongoose.Schema.Types.Mixed },
    preflight: { type: mongoose.Schema.Types.Mixed },
    /** Mảng log từng sinh viên (cùng shape với triggerAutoEnrollment logs) */
    logs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

enrollmentSnapshotSchema.index({ createdAt: -1 });

module.exports = mongoose.model("EnrollmentSnapshot", enrollmentSnapshotSchema);
