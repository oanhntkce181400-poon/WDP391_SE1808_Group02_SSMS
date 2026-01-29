const Major = require('../models/major.model');
const Student = require('../models/student.model');

class MajorService {
  async getMajors({ keyword = '', isActive } = {}) {
    const query = {};

    if (typeof isActive === 'boolean') {
      query.isActive = isActive;
    }

    if (keyword) {
      query.$or = [
        { majorCode: { $regex: keyword, $options: 'i' } },
        { majorName: { $regex: keyword, $options: 'i' } },
      ];
    }

    const majors = await Major.find(query).sort({ majorName: 1 }).lean();

    // Count students for each major
    const majorsWithCount = await Promise.all(
      majors.map(async (major) => {
        const studentCount = await Student.countDocuments({ majorCode: major.majorCode });
        return {
          ...major,
          studentCount,
        };
      })
    );

    return majorsWithCount;
  }

  async createMajor(data) {
    const major = new Major(data);
    return major.save();
  }

  async updateMajor(id, data) {
    return Major.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteMajor(id) {
    return Major.findByIdAndDelete(id);
  }
}

module.exports = new MajorService();
