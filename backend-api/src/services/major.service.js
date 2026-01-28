const Major = require('../models/major.model');
const Student = require('../models/student.model');

class MajorService {
  /**
   * Lấy danh sách chuyên ngành với filter và pagination
   */
  async getMajors({ keyword, faculty, isActive, page = 1, limit = 10 }) {
    const query = {};

    // Filter theo keyword (tìm trong code hoặc name)
    if (keyword) {
      query.$or = [
        { majorCode: { $regex: keyword, $options: 'i' } },
        { majorName: { $regex: keyword, $options: 'i' } },
        { majorNameEn: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Filter theo faculty
    if (faculty) {
      query.faculty = faculty;
    }

    // Filter theo trạng thái
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (page - 1) * limit;

    const [majors, total] = await Promise.all([
      Major.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Major.countDocuments(query),
    ]);

    // Đếm số lượng sinh viên cho mỗi ngành từ Student collection
    const majorsWithCount = await Promise.all(
      majors.map(async (major) => {
        const studentCount = await Student.countDocuments({ majorCode: major.majorCode });
        return { ...major, studentCount };
      })
    );

    return {
      majors: majorsWithCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy thông tin chi tiết một chuyên ngành
   */
  async getMajorById(id) {
    const major = await Major.findById(id).lean();
    if (!major) {
      throw new Error('Major not found');
    }
    return major;
  }

  /**
   * Tạo chuyên ngành mới
   */
  async createMajor(data) {
    // Kiểm tra trùng mã chuyên ngành
    const existing = await Major.findOne({ majorCode: data.majorCode });
    if (existing) {
      throw new Error('Major code already exists');
    }

    const major = await Major.create(data);
    return major.toObject();
  }

  /**
   * Cập nhật thông tin chuyên ngành
   */
  async updateMajor(id, data) {
    // Nếu update majorCode, kiểm tra trùng
    if (data.majorCode) {
      const existing = await Major.findOne({
        majorCode: data.majorCode,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Major code already exists');
      }
    }

    const major = await Major.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!major) {
      throw new Error('Major not found');
    }

    return major;
  }

  /**
   * Xóa chuyên ngành (soft delete - set isActive = false)
   */
  async deleteMajor(id) {
    const major = await Major.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!major) {
      throw new Error('Major not found');
    }

    return major;
  }

  /**
   * Xóa vĩnh viễn (hard delete)
   */
  async hardDeleteMajor(id) {
    const major = await Major.findByIdAndDelete(id);
    if (!major) {
      throw new Error('Major not found');
    }
    return major;
  }
}

module.exports = new MajorService();
