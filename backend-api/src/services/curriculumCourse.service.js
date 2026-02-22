// CurriculumCourse Service - Database operations for CurriculumCourse
const CurriculumCourse = require('../models/curriculumCourse.model');
const CurriculumSemester = require('../models/curriculumSemester.model');

class CurriculumCourseService {
  // Get all courses for a semester
  async getCoursesBySemester(semesterId) {
    try {
      const courses = await CurriculumCourse.find({ semester: semesterId })
        .populate('subject', 'code name')
        .sort({ subjectCode: 1 })
        .lean();
      return courses;
    } catch (error) {
      throw error;
    }
  }

  // Get single course by ID
  async getCourseById(id) {
    try {
      const course = await CurriculumCourse.findById(id)
        .populate('subject', 'code name');
      if (!course) {
        throw new Error('CurriculumCourse not found');
      }
      return course;
    } catch (error) {
      throw error;
    }
  }

  // Add course to semester
  async addCourseToSemester(semesterId, data) {
    try {
      // Verify semester exists
      const semester = await CurriculumSemester.findById(semesterId);
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }

      const course = new CurriculumCourse({
        semester: semesterId,
        subject: data.subjectId,
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        credits: data.credits,
        hasPrerequisite: data.hasPrerequisite || false,
      });

      await course.save();

      // Recalculate semester credits
      await this.recalculateSemesterCredits(semesterId);

      return course;
    } catch (error) {
      throw error;
    }
  }

  // Update course
  async updateCourse(id, data) {
    try {
      const oldCourse = await CurriculumCourse.findById(id);
      if (!oldCourse) {
        throw new Error('CurriculumCourse not found');
      }

      const course = await CurriculumCourse.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );

      // Recalculate credits if credits changed
      if (data.credits && data.credits !== oldCourse.credits) {
        await this.recalculateSemesterCredits(oldCourse.semester);
      }

      return course;
    } catch (error) {
      throw error;
    }
  }

  // Delete course
  async deleteCourse(id) {
    try {
      const course = await CurriculumCourse.findById(id);
      if (!course) {
        throw new Error('CurriculumCourse not found');
      }

      const semesterId = course.semester;
      await CurriculumCourse.findByIdAndDelete(id);

      // Recalculate semester credits
      await this.recalculateSemesterCredits(semesterId);

      return course;
    } catch (error) {
      throw error;
    }
  }

  // Move course to another semester
  async moveCourseToSemester(courseId, newSemesterId) {
    try {
      const course = await CurriculumCourse.findById(courseId);
      if (!course) {
        throw new Error('CurriculumCourse not found');
      }

      const oldSemesterId = course.semester;

      // Verify new semester exists
      const newSemester = await CurriculumSemester.findById(newSemesterId);
      if (!newSemester) {
        throw new Error('CurriculumSemester not found');
      }

      // Update course's semester
      course.semester = newSemesterId;
      await course.save();

      // Recalculate credits for both semesters
      await this.recalculateSemesterCredits(oldSemesterId);
      await this.recalculateSemesterCredits(newSemesterId);

      return course;
    } catch (error) {
      throw error;
    }
  }

  // Batch add courses to semester
  async addCoursesToSemester(semesterId, courses) {
    try {
      // Verify semester exists
      const semester = await CurriculumSemester.findById(semesterId);
      if (!semester) {
        throw new Error('CurriculumSemester not found');
      }

      const courseDocs = courses.map(c => ({
        semester: semesterId,
        subject: c.subjectId,
        subjectCode: c.subjectCode,
        subjectName: c.subjectName,
        credits: c.credits,
        hasPrerequisite: c.hasPrerequisite || false,
      }));

      await CurriculumCourse.insertMany(courseDocs);

      // Recalculate semester credits
      await this.recalculateSemesterCredits(semesterId);

      return this.getCoursesBySemester(semesterId);
    } catch (error) {
      throw error;
    }
  }

  // Recalculate and update semester credits
  async recalculateSemesterCredits(semesterId) {
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

  // Check if subject already exists in curriculum
  async isSubjectInCurriculum(curriculumId, subjectCode) {
    try {
      const semesters = await CurriculumSemester.find({ curriculum: curriculumId });
      const semesterIds = semesters.map(s => s._id);

      const existing = await CurriculumCourse.findOne({
        semester: { $in: semesterIds },
        subjectCode: subjectCode,
      });

      return !!existing;
    } catch (error) {
      throw error;
    }
  }

  // Get all courses in curriculum
  async getCoursesByCurriculum(curriculumId) {
    try {
      const semesters = await CurriculumSemester.find({ curriculum: curriculumId });
      const semesterIds = semesters.map(s => s._id);

      const courses = await CurriculumCourse.find({ semester: { $in: semesterIds } })
        .populate('subject', 'code name')
        .populate({
          path: 'semester',
          select: 'name semesterOrder',
        })
        .lean();

      return courses;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CurriculumCourseService();
