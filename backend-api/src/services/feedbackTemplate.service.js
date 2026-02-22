const FeedbackTemplate = require('../models/feedbackTemplate.model');
const FeedbackSubmission = require('../models/feedbackSubmission.model');

class FeedbackTemplateService {
  /**
   * Tạo mẫu đánh giá mới
   */
  async createFeedbackTemplate(data, userId) {
    try {
      const feedbackTemplate = new FeedbackTemplate({
        templateName: data.templateName,
        description: data.description || '',
        questions: data.questions || [],
        feedbackPeriod: {
          startDate: data.feedbackStartDate,
          endDate: data.feedbackEndDate
        },
        status: data.status || 'draft',
        evaluationTarget: data.evaluationTarget || 'teacher',
        subject: data.subject || null,
        classSection: data.classSection || null,
        createdBy: userId
      });

      await feedbackTemplate.save();
      return feedbackTemplate;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả mẫu đánh giá
   */
  async getFeedbackTemplates({ 
    page = 1, 
    limit = 10, 
    keyword = '', 
    status = null,
    evaluationTarget = null 
  } = {}) {
    try {
      const query = {};

      if (keyword) {
        query.$or = [
          { templateName: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ];
      }

      if (status) {
        query.status = status;
      }

      if (evaluationTarget) {
        query.evaluationTarget = evaluationTarget;
      }

      const templates = await FeedbackTemplate.find(query)
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className')
        .populate('createdBy', 'email fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await FeedbackTemplate.countDocuments(query);

      return {
        data: templates,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy chi tiết mẫu đánh giá
   */
  async getFeedbackTemplateById(id) {
    try {
      const template = await FeedbackTemplate.findById(id)
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className')
        .populate('createdBy', 'email fullName');

      if (!template) {
        throw new Error('Feedback template not found');
      }

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật mẫu đánh giá
   */
  async updateFeedbackTemplate(id, data, userId) {
    try {
      const updateData = {
        templateName: data.templateName,
        description: data.description || '',
        questions: data.questions || [],
        feedbackPeriod: {
          startDate: data.feedbackStartDate,
          endDate: data.feedbackEndDate
        },
        status: data.status,
        evaluationTarget: data.evaluationTarget,
        subject: data.subject || null,
        classSection: data.classSection || null,
        updatedBy: userId
      };

      const template = await FeedbackTemplate.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className')
        .populate('createdBy', 'email fullName');

      if (!template) {
        throw new Error('Feedback template not found');
      }

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xóa mẫu đánh giá
   */
  async deleteFeedbackTemplate(id) {
    try {
      // Kiểm tra có feedback submission nào không
      const submissionCount = await FeedbackSubmission.countDocuments({
        feedbackTemplate: id
      });

      if (submissionCount > 0) {
        throw new Error('Cannot delete template with existing submissions. Archive it instead.');
      }

      const result = await FeedbackTemplate.findByIdAndDelete(id);

      if (!result) {
        throw new Error('Feedback template not found');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Thêm câu hỏi vào mẫu đánh giá
   */
  async addQuestionToTemplate(templateId, questionData) {
    try {
      const template = await FeedbackTemplate.findById(templateId);

      if (!template) {
        throw new Error('Feedback template not found');
      }

      const newQuestion = {
        questionText: questionData.questionText,
        questionType: questionData.questionType || 'rating',
        ratingScale: questionData.ratingScale || 5,
        options: questionData.options || [],
        isRequired: questionData.isRequired || false,
        maxLength: questionData.maxLength || 500,
        displayOrder: template.questions.length + 1
      };

      template.questions.push(newQuestion);
      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xóa câu hỏi từ mẫu đánh giá
   */
  async removeQuestionFromTemplate(templateId, questionId) {
    try {
      const template = await FeedbackTemplate.findById(templateId);

      if (!template) {
        throw new Error('Feedback template not found');
      }

      template.questions = template.questions.filter(
        q => q._id.toString() !== questionId.toString()
      );

      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật câu hỏi trong mẫu đánh giá
   */
  async updateQuestionInTemplate(templateId, questionId, questionData) {
    try {
      const template = await FeedbackTemplate.findById(templateId);

      if (!template) {
        throw new Error('Feedback template not found');
      }

      const questionIndex = template.questions.findIndex(
        q => q._id.toString() === questionId.toString()
      );

      if (questionIndex === -1) {
        throw new Error('Question not found in template');
      }

      template.questions[questionIndex] = {
        ...template.questions[questionIndex],
        questionText: questionData.questionText,
        questionType: questionData.questionType || 'rating',
        ratingScale: questionData.ratingScale || 5,
        options: questionData.options || [],
        isRequired: questionData.isRequired || false,
        maxLength: questionData.maxLength || 500,
        displayOrder: questionData.displayOrder || template.questions[questionIndex].displayOrder
      };

      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy các mẫu đánh giá đang hoạt động (trong thời gian)
   */
  async getActiveFeedbackTemplates() {
    try {
      const now = new Date();
      const templates = await FeedbackTemplate.find({
        status: 'active',
        'feedbackPeriod.startDate': { $lte: now },
        'feedbackPeriod.endDate': { $gte: now }
      })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className');

      return templates;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Thay đổi trạng thái mẫu đánh giá
   */
  async changeFeedbackTemplateStatus(id, status) {
    try {
      const validStatuses = ['draft', 'active', 'closed', 'archived'];

      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const template = await FeedbackTemplate.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!template) {
        throw new Error('Feedback template not found');
      }

      return template;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new FeedbackTemplateService();
