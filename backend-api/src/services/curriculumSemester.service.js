// CurriculumSemester Service - Database operations for CurriculumSemester
const CurriculumSemester = require('../models/curriculumSemester.model');
const CurriculumCourse = require('../models/curriculumCourse.model');

class CurriculumSemesterService {
  // Get all semesters for a curriculum (sorted by semesterOrder)
  async getSemestersByCurriculum(curriculumId) {
    try {
      const semesters = await CurriculumSemester.find({ curriculum: curriculumId })
        .sort({ semesterOrder: 1 })
        .lean();
      
      return semesters;
    } catch (error) {
      throw error;
    }
  }

  // Get single semester by ID
  async getSemesterById(id) {
    try {
      const semester = await CurriculumSemester.findById(id);
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }
      return semester;
    } catch (error) {
      throw error;
    }
  }

  // Create new semester for curriculum
  async createSemester(curriculumId, data) {
    try {
      // Get max semesterOrder for this curriculum
      const maxOrderSemester = await CurriculumSemester.findOne({ curriculum: curriculumId })
        .sort({ semesterOrder: -1 });
      
      const newOrder = maxOrderSemester ? maxOrderSemester.semesterOrder + 1 : 1;

      const semester = new CurriculumSemester({
        curriculum: curriculumId,
        name: data.name,
        semesterOrder: data.semesterOrder || newOrder,
        credits: data.credits || 0,
      });

      await semester.save();
      return semester;
    } catch (error) {
      throw error;
    }
  }

  // Update semester
  async updateSemester(id, data) {
    try {
      const semester = await CurriculumSemester.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }
      return semester;
    } catch (error) {
      throw error;
    }
  }

  // Update semester order (for drag-drop reorder)
  async updateSemesterOrder(id, newOrder) {
    try {
      const semester = await CurriculumSemester.findByIdAndUpdate(
        id,
        { $set: { semesterOrder: newOrder } },
        { new: true }
      );
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }
      return semester;
    } catch (error) {
      throw error;
    }
  }

  // Delete semester (also delete all courses in this semester)
  async deleteSemester(id) {
    try {
      // Delete all courses in this semester first
      await CurriculumCourse.deleteMany({ semester: id });
      
      const semester = await CurriculumSemester.findByIdAndDelete(id);
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }
      return semester;
    } catch (error) {
      throw error;
    }
  }

  // Reorder semesters (batch update order)
  async reorderSemesters(curriculumId, orderedIds) {
    try {
      // orderedIds is array of semester IDs in new order
      const updates = orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, curriculum: curriculumId },
          update: { $set: { semesterOrder: index + 1 } }
        }
      }));

      await CurriculumSemester.bulkWrite(updates);
      
      // Return updated semesters
      return this.getSemestersByCurriculum(curriculumId);
    } catch (error) {
      throw error;
    }
  }

  // Get semester with courses
  async getSemesterWithCourses(semesterId) {
    try {
      const semester = await CurriculumSemester.findById(semesterId);
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }

      const courses = await CurriculumCourse.find({ semester: semesterId })
        .populate('subject', 'code name')
        .lean();

      return {
        ...semester.toObject(),
        courses,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all semesters with courses for a curriculum
  async getCurriculumWithSemestersAndCourses(curriculumId) {
    try {
      const semesters = await CurriculumSemester.find({ curriculum: curriculumId })
        .sort({ semesterOrder: 1 })
        .lean();

      // Get all courses for these semesters
      const semesterIds = semesters.map(s => s._id);
      const courses = await CurriculumCourse.find({ semester: { $in: semesterIds } })
        .populate('subject', 'code name')
        .lean();

      // Group courses by semester
      const coursesBySemester = {};
      courses.forEach(course => {
        const semId = course.semester.toString();
        if (!coursesBySemester[semId]) {
          coursesBySemester[semId] = [];
        }
        coursesBySemester[semId].push(course);
      });

      // Attach courses to semesters
      return semesters.map(semester => ({
        ...semester,
        courses: coursesBySemester[semester._id.toString()] || [],
      }));
    } catch (error) {
      throw error;
    }
  }

  // Calculate and update total credits for semester
  async calculateSemesterCredits(semesterId) {
    try {
      const courses = await CurriculumCourse.find({ semester: semesterId });
      const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

      await CurriculumSemester.findByIdAndUpdate(semesterId, {
        $set: { credits: totalCredits }
      });

      return totalCredits;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CurriculumSemesterService();
