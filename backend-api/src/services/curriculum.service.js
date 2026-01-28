// Curriculum Service - Database operations for Curriculum
const Curriculum = require('../models/curriculum.model');

const curriculumService = {
  // Get all curriculums with optional pagination
  async getCurriculums({ page = 1, limit = 10, keyword = '' } = {}) {
    try {
      const query = keyword
        ? {
            $or: [
              { curriculumCode: { $regex: keyword, $options: 'i' } },
              { title: { $regex: keyword, $options: 'i' } },
            ],
          }
        : {};

      const total = await Curriculum.countDocuments(query);
      const curriculums = await Curriculum.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        curriculums,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  },

  // Get single curriculum by ID
  async getCurriculumById(id) {
    try {
      const curriculum = await Curriculum.findById(id);
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Create new curriculum
  async createCurriculum(data) {
    try {
      const curriculum = new Curriculum(data);
      await curriculum.save();
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Update existing curriculum
  async updateCurriculum(id, data) {
    try {
      const curriculum = await Curriculum.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Delete curriculum
  async deleteCurriculum(id) {
    try {
      const curriculum = await Curriculum.findByIdAndDelete(id);
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Update curriculum semesters (courses in each semester)
  async updateCurriculumSemesters(id, semesters) {
    try {
      const curriculum = await Curriculum.findByIdAndUpdate(
        id,
        { $set: { semesters, updatedAt: new Date() } },
        { new: true, runValidators: true }
      );
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum;
    } catch (error) {
      throw error;
    }
  },

  // Get curriculum semesters
  async getCurriculumSemesters(id) {
    try {
      const curriculum = await Curriculum.findById(id).select('semesters');
      if (!curriculum) {
        throw new Error('Curriculum not found');
      }
      return curriculum.semesters || [];
    } catch (error) {
      throw error;
    }
  },
};

module.exports = curriculumService;

