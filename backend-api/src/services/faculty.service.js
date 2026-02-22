const Faculty = require('../models/faculty.model');
const Major = require('../models/major.model');
const Student = require('../models/student.model');

class FacultyService {
  async getFaculties({ keyword = '', isActive } = {}) {
    const query = {};

    if (typeof isActive === 'boolean') {
      query.isActive = isActive;
    }

    if (keyword) {
      query.$or = [
        { facultyCode: { $regex: keyword, $options: 'i' } },
        { facultyName: { $regex: keyword, $options: 'i' } },
      ];
    }

    const faculties = await Faculty.find(query).sort({ facultyName: 1 }).lean();

    // Count majors and students for each faculty
    const facultiesWithCount = await Promise.all(
      faculties.map(async (faculty) => {
        // Find majors belonging to this faculty
        // Note: Major model doesn't have faculty reference, so we count all majors for now
        // In future, if Major has facultyCode field, we can filter by it
        const majorCount = await Major.countDocuments();
        
        // Count students - same limitation
        const studentCount = await Student.countDocuments();
        
        return {
          ...faculty,
          majorCount,
          studentCount,
        };
      })
    );

    return facultiesWithCount;
  }

  async getFacultyById(id) {
    return Faculty.findById(id);
  }

  async createFaculty(data) {
    const faculty = new Faculty(data);
    return faculty.save();
  }

  async updateFaculty(id, data) {
    return Faculty.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteFaculty(id) {
    return Faculty.findByIdAndDelete(id);
  }

  async toggleFacultyStatus(id) {
    const faculty = await Faculty.findById(id);
    if (!faculty) return null;
    
    faculty.isActive = !faculty.isActive;
    return faculty.save();
  }
}

module.exports = new FacultyService();
