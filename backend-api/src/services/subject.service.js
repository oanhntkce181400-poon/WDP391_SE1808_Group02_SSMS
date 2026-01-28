const Subject = require('../models/subject.model');

class SubjectService {
  // Create new subject
  async createSubject(data) {
    try {
      const subject = new Subject({
        subjectCode: data.code,
        subjectName: data.name,
        credits: data.credits,
        majorCode: data.department?.[0] || null, // Single department (backward compatibility)
        majorCodes: data.department || [], // Multiple departments
        isCommon: data.isCommon || false, // Môn chung cho toàn khoa
      });
      await subject.save();
      return subject;
    } catch (error) {
      throw error;
    }
  }

  // Get all subjects with pagination
  async getSubjects({ page = 1, limit = 10, keyword = '' } = {}) {
    try {
      const query = keyword
        ? {
            $or: [
              { subjectCode: { $regex: keyword, $options: 'i' } },
              { subjectName: { $regex: keyword, $options: 'i' } },
            ],
          }
        : {};

      const subjects = await Subject.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Subject.countDocuments(query);

      return {
        data: subjects,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  // Get single subject by ID
  async getSubjectById(id) {
    try {
      const subject = await Subject.findById(id);
      if (!subject) {
        throw new Error('Subject not found');
      }
      return subject;
    } catch (error) {
      throw error;
    }
  }

  // Update subject
  async updateSubject(id, data) {
    try {
      const updateData = {
        subjectCode: data.code,
        subjectName: data.name,
        credits: data.credits,
        majorCode: data.department?.[0] || null,
        majorCodes: data.department || [],
        isCommon: data.isCommon || false,
      };

      const subject = await Subject.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!subject) {
        throw new Error('Subject not found');
      }

      return subject;
    } catch (error) {
      throw error;
    }
  }

  // Delete subject
  async deleteSubject(id) {
    try {
      const subject = await Subject.findByIdAndDelete(id);
      if (!subject) {
        throw new Error('Subject not found');
      }
      return subject;
    } catch (error) {
      throw error;
    }
  }

  // Search subjects
  async searchSubjects(keyword) {
    try {
      const subjects = await Subject.find({
        $or: [
          { subjectCode: { $regex: keyword, $options: 'i' } },
          { subjectName: { $regex: keyword, $options: 'i' } },
        ],
      }).limit(20);
      return subjects;
    } catch (error) {
      throw error;
    }
  }

  // Update subject prerequisites
  async updatePrerequisites(id, prerequisites) {
    try {
      const subject = await Subject.findByIdAndUpdate(
        id,
        { prerequisites: prerequisites },
        { new: true, runValidators: true }
      );

      if (!subject) {
        throw new Error('Subject not found');
      }

      return subject;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SubjectService();

