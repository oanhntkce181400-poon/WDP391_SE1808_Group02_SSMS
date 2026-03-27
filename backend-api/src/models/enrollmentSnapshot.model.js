const mongoose = require("mongoose");

/**
 * Lưu bản chụp kết quả một lần chạy Auto Enrollment (tra cứu, điểm danh theo lớp).
 * Gắn nhóm lớp (classGroup) với ClassSection; studentLimit = sĩ số tối đa đã cấu hình khi chạy.
 */
const enrollmentSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "" },
    /** Nhóm lớp học phần (trùng ClassSection.classGroup) — xác định “lớp” khi xem lịch sử */
    classGroup: { type: String, trim: true, default: null, index: true },
    /**
     * Giới hạn sĩ số (ô Student limit trên Auto Enrollment).
     * Có thể đã áp dụng lên maxCapacity của ClassSection nếu applyMaxCapacityToClassSections khi lưu.
     */
    studentLimit: { type: Number, default: null },
    /** Đã đồng bộ maxCapacity lên các ClassSection cùng classGroup + HK khi tạo snapshot */
    maxCapacityAppliedToClassSections: { type: Boolean, default: false },
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
enrollmentSnapshotSchema.index({ classGroup: 1, semesterId: 1 });

module.exports = mongoose.model("EnrollmentSnapshot", enrollmentSnapshotSchema);
