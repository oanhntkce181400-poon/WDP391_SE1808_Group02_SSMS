const Major = require('../models/major.model');
const Faculty = require('../models/faculty.model');
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

    const majors = await Major.find(query)
      .populate('faculty', 'facultyCode facultyName')
      .sort({ majorName: 1 })
      .lean();

    // Count students for each major
    const majorsWithCount = await Promise.all(
      majors.map(async (major) => {
        const studentCount = await Student.countDocuments({ majorCode: major.majorCode });
        return {
          ...major,
          studentCount,
          facultyCode: major.faculty?.facultyCode,
          facultyName: major.faculty?.facultyName,
        };
      })
    );

    return majorsWithCount;
  }

  async createMajor(data) {
    // Validate faculty exists
    const faculty = await Faculty.findById(data.faculty);
    if (!faculty) {
      throw new Error('Khoa không tồn tại');
    }

    const major = new Major(data);
    const savedMajor = await major.save();

    // Update major count in Faculty
    await Faculty.findByIdAndUpdate(data.faculty, {
      $inc: { majorCount: 1 }
    });

    return savedMajor;
  }

  async updateMajor(id, data) {
    const existingMajor = await Major.findById(id);
    if (!existingMajor) {
      throw new Error('Ngành đào tạo không tồn tại');
    }

    // If faculty is being changed, update counts
    const oldFacultyId = existingMajor.faculty?._id?.toString() || existingMajor.faculty?.toString();
    const newFacultyId = data.faculty?.toString();

    if (data.faculty && oldFacultyId !== newFacultyId) {
      const newFaculty = await Faculty.findById(data.faculty);
      if (!newFaculty) {
        throw new Error('Khoa không tồn tại');
      }

      // Decrement count from old faculty (if exists)
      if (oldFacultyId) {
        await Faculty.findByIdAndUpdate(oldFacultyId, {
          $inc: { majorCount: -1 }
        });
      }

      // Increment count to new faculty
      await Faculty.findByIdAndUpdate(data.faculty, {
        $inc: { majorCount: 1 }
      });
    }

    return Major.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteMajor(id) {
    const major = await Major.findById(id);
    if (major && major.faculty) {
      // Decrement major count from faculty
      await Faculty.findByIdAndUpdate(major.faculty, {
        $inc: { majorCount: -1 }
      });
    }
    return Major.findByIdAndDelete(id);
  }
}

module.exports = new MajorService();
