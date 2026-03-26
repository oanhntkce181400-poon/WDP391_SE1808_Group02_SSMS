const mongoose = require('mongoose');

const prerequisiteSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
});

const majorRequirementSchema = new mongoose.Schema({
  majorCode: { type: String, required: true },
  isRequired: { type: Boolean, default: true },
});

// Cấu hình trọng số tính điểm cho từng môn học
const gradingWeightsSchema = new mongoose.Schema({
  GK: { // Điểm Giữa Kỳ
    type: Number,
    min: 0,
    max: 100,
    default: 30
  },
  CK: { // Điểm Cuối Kỳ
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  BT: { // Điểm Bài Tập/Thực Hành (optional)
    type: Number,
    min: 0,
    max: 100,
    default: 20
  },
  PT: { // Điểm Kiểm Tra Thường Xuyên (optional, tính trung bình)
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  QT: { // Điểm Quá Trình/Liên Tục (optional)
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: false });

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, unique: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true },
    tuitionFee: { type: Number, default: 0 }, // Học phí (VNĐ) - 100 VNĐ/tín chỉ
    majorCode: { type: String, trim: true }, // Single department (backward compatibility)
    majorCodes: [{ type: String, trim: true }], // Multiple departments (backward compatibility)
    isCommon: { type: Boolean, default: false }, // Môn chung cho toàn khoa
    facultyCode: { type: String, trim: true }, // New: Mã khoa quản lý môn học
    majorRequirements: [majorRequirementSchema], // Danh sách chuyên ngành áp dụng với yêu cầu (bắt buộc/tự chọn)
    description: { type: String, trim: true }, // Mô tả môn học
    prerequisites: [prerequisiteSchema],
    // Giáo viên phụ trách môn học (hỗ trợ xếp lịch giảng dạy)
    teachers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    }],
    
    // Học kỳ đề xuất (dùng để gợi ý khi thiết lập khung chương trình)
    suggestedSemester: { type: Number, min: 1, max: 9, default: 1 },

    // Cấu hình trọng số tính điểm cho môn học này
    // Nếu không cấu hình, sẽ dùng giá trị mặc định: GK 30%, CK 50%, BT 20%
    gradingWeights: {
      type: gradingWeightsSchema,
      default: () => ({
        GK: 30, // Giữa kỳ 30%
        CK: 50, // Cuối kỳ 50%
        BT: 20, // Bài tập 20%
        PT: 0,  // Kiểm tra thường xuyên (tính trung bình nếu có)
        QT: 0   // Quá trình (tùy chọn)
      })
    }
  },
  { timestamps: true },
);

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
