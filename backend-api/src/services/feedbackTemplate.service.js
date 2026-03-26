const FeedbackTemplate = require('../models/feedbackTemplate.model');
const FeedbackSubmission = require('../models/feedbackSubmission.model');
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const DEFAULT_FEEDBACK_TEMPLATE_DEFINITIONS = [
  {
    templateCode: 'DEFAULT_TEACHER_FEEDBACK',
    templateName: 'Mẫu mặc định: Đánh giá giảng viên',
    description:
      'Bộ câu hỏi mặc định dành cho sinh viên đánh giá giảng viên vào cuối kỳ. Các câu hỏi sử dụng thang điểm 1-5 sao và có một câu góp ý mở.',
    evaluationTarget: 'teacher',
    questions: [
      'Giảng viên đúng giờ và đảm bảo thời lượng giảng dạy của từng buổi học.',
      'Giảng viên truyền đạt dễ hiểu, phương pháp giảng dạy phù hợp với môn học.',
      'Giảng viên bao quát đầy đủ nội dung theo đề cương hoặc kế hoạch giảng dạy.',
      'Giảng viên hỗ trợ giải đáp thắc mắc và hướng dẫn học tập kịp thời.',
      'Bạn hài lòng với chất lượng giảng dạy và cố vấn học tập của giảng viên.',
    ],
    openComment:
      'Góp ý thêm cho giảng viên để cải thiện chất lượng giảng dạy và hỗ trợ sinh viên.',
  },
  {
    templateCode: 'DEFAULT_COURSE_FEEDBACK',
    templateName: 'Mẫu mặc định: Đánh giá khóa học',
    description:
      'Bộ câu hỏi mặc định để sinh viên đánh giá chất lượng môn học, tài liệu, bài tập và mức độ đáp ứng mục tiêu học tập.',
    evaluationTarget: 'course',
    questions: [
      'Nội dung môn học phù hợp với mục tiêu học tập và đầu ra mong đợi.',
      'Khối lượng kiến thức và bài tập của môn học được phân bổ hợp lý.',
      'Tài liệu, slide và nguồn học liệu hỗ trợ tốt cho việc tự học.',
      'Hoạt động kiểm tra, đánh giá phản ánh đúng kiến thức và kỹ năng của môn học.',
      'Môn học mang lại giá trị thực tiễn và giúp bạn phát triển năng lực chuyên môn.',
    ],
    openComment:
      'Góp ý thêm cho môn học để cải thiện nội dung, tài liệu và cách tổ chức lớp học.',
  },
  {
    templateCode: 'DEFAULT_PROGRAM_FEEDBACK',
    templateName: 'Mẫu mặc định: Đánh giá chương trình đào tạo',
    description:
      'Bộ câu hỏi mặc định để sinh viên phản hồi về cấu trúc chương trình, tính liên kết giữa các học phần và mức độ phù hợp với định hướng nghề nghiệp.',
    evaluationTarget: 'program',
    questions: [
      'Chương trình đào tạo có lộ trình học rõ ràng và cấu trúc hợp lý.',
      'Sự liên kết giữa các môn học trong chương trình giúp bạn học tập liền mạch.',
      'Nội dung chương trình được cập nhật theo nhu cầu thực tế của ngành nghề.',
      'Chương trình hỗ trợ tốt cho định hướng nghề nghiệp và kỹ năng làm việc sau tốt nghiệp.',
      'Bạn hài lòng với chất lượng tổng thể của chương trình đào tạo hiện tại.',
    ],
    openComment:
      'Góp ý thêm cho chương trình đào tạo để nhà trường có thể cải thiện nội dung và lộ trình học.',
  },
];

class FeedbackTemplateService {
  formatDateTime(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: VIETNAM_TIMEZONE,
    });
  }

  buildAvailabilityPayload(template, overrides = {}) {
    const currentTime = overrides.currentTime || new Date();

    return {
      isOpen: false,
      state: 'closed',
      message: 'Hiện chưa có đợt đánh giá giảng viên nào đang mở.',
      template: template || null,
      templateId: template?._id || null,
      templateName: template?.templateName || null,
      startsAt: template?.feedbackPeriod?.startDate || null,
      endsAt: template?.feedbackPeriod?.endDate || null,
      startsAtLabel: this.formatDateTime(template?.feedbackPeriod?.startDate),
      endsAtLabel: this.formatDateTime(template?.feedbackPeriod?.endDate),
      currentTime,
      currentTimeLabel: this.formatDateTime(currentTime),
      ...overrides,
    };
  }

  buildDefaultQuestions(definition) {
    const ratingQuestions = definition.questions.map((questionText, index) => ({
      questionText,
      questionType: 'rating',
      ratingScale: 5,
      options: [],
      isRequired: true,
      maxLength: 500,
      displayOrder: index + 1,
    }));

    ratingQuestions.push({
      questionText: definition.openComment,
      questionType: 'text',
      ratingScale: 5,
      options: [],
      isRequired: false,
      maxLength: 1000,
      displayOrder: ratingQuestions.length + 1,
    });

    return ratingQuestions;
  }

  buildDefaultTemplatePayload(definition, now = new Date()) {
    const startDate = new Date(now);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14);

    return {
      templateCode: definition.templateCode,
      templateName: definition.templateName,
      description: definition.description,
      evaluationTarget: definition.evaluationTarget,
      questions: this.buildDefaultQuestions(definition),
      feedbackPeriod: {
        startDate,
        endDate,
      },
      status: 'draft',
      isSystemTemplate: true,
      subject: null,
      classSection: null,
    };
  }

  async createFeedbackTemplate(data, userId) {
    try {
      const feedbackTemplate = new FeedbackTemplate({
        templateName: data.templateName,
        description: data.description || '',
        questions: data.questions || [],
        feedbackPeriod: {
          startDate: data.feedbackStartDate,
          endDate: data.feedbackEndDate,
        },
        status: data.status || 'draft',
        evaluationTarget: data.evaluationTarget || 'teacher',
        subject: data.subject || null,
        classSection: data.classSection || null,
        createdBy: userId,
      });

      await feedbackTemplate.save();
      return feedbackTemplate;
    } catch (error) {
      throw error;
    }
  }

  async getFeedbackTemplates({
    page = 1,
    limit = 10,
    keyword = '',
    status = null,
    evaluationTarget = null,
  } = {}) {
    try {
      const query = {};

      if (keyword) {
        query.$or = [
          { templateName: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
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
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

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

  async updateFeedbackTemplate(id, data, userId) {
    try {
      const updateData = {
        templateName: data.templateName,
        description: data.description || '',
        questions: data.questions || [],
        feedbackPeriod: {
          startDate: data.feedbackStartDate,
          endDate: data.feedbackEndDate,
        },
        status: data.status,
        evaluationTarget: data.evaluationTarget,
        subject: data.subject || null,
        classSection: data.classSection || null,
        updatedBy: userId,
      };

      const template = await FeedbackTemplate.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
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

  async deleteFeedbackTemplate(id) {
    try {
      const submissionCount = await FeedbackSubmission.countDocuments({
        feedbackTemplate: id,
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
        displayOrder: template.questions.length + 1,
      };

      template.questions.push(newQuestion);
      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  async removeQuestionFromTemplate(templateId, questionId) {
    try {
      const template = await FeedbackTemplate.findById(templateId);

      if (!template) {
        throw new Error('Feedback template not found');
      }

      template.questions = template.questions.filter(
        (question) => question._id.toString() !== questionId.toString(),
      );

      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  async updateQuestionInTemplate(templateId, questionId, questionData) {
    try {
      const template = await FeedbackTemplate.findById(templateId);

      if (!template) {
        throw new Error('Feedback template not found');
      }

      const questionIndex = template.questions.findIndex(
        (question) => question._id.toString() === questionId.toString(),
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
        displayOrder:
          questionData.displayOrder || template.questions[questionIndex].displayOrder,
      };

      await template.save();

      return template;
    } catch (error) {
      throw error;
    }
  }

  async getActiveFeedbackTemplates() {
    try {
      const now = new Date();
      const templates = await FeedbackTemplate.find({
        status: 'active',
        'feedbackPeriod.startDate': { $lte: now },
        'feedbackPeriod.endDate': { $gte: now },
      })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className');

      return templates;
    } catch (error) {
      throw error;
    }
  }

  async syncDefaultTemplates(userId) {
    try {
      const now = new Date();
      const results = [];

      for (const definition of DEFAULT_FEEDBACK_TEMPLATE_DEFINITIONS) {
        const payload = this.buildDefaultTemplatePayload(definition, now);
        const existingTemplate = await FeedbackTemplate.findOne({
          templateCode: definition.templateCode,
        });

        if (existingTemplate) {
          existingTemplate.templateName = payload.templateName;
          existingTemplate.description = payload.description;
          existingTemplate.evaluationTarget = payload.evaluationTarget;
          existingTemplate.questions = payload.questions;
          existingTemplate.feedbackPeriod = payload.feedbackPeriod;
          existingTemplate.isSystemTemplate = true;
          existingTemplate.updatedBy = userId || existingTemplate.updatedBy || existingTemplate.createdBy;
          await existingTemplate.save();

          results.push({
            action: 'updated',
            template: existingTemplate,
          });
          continue;
        }

        const createdTemplate = await FeedbackTemplate.create({
          ...payload,
          createdBy: userId,
          updatedBy: userId,
        });

        results.push({
          action: 'created',
          template: createdTemplate,
        });
      }

      return {
        count: results.length,
        results,
      };
    } catch (error) {
      throw error;
    }
  }

  async getTeacherFeedbackAvailability() {
    try {
      const now = new Date();

      const openTemplate = await FeedbackTemplate.findOne({
        evaluationTarget: 'teacher',
        status: 'active',
        'feedbackPeriod.startDate': { $lte: now },
        'feedbackPeriod.endDate': { $gte: now },
      })
        .sort({ 'feedbackPeriod.startDate': 1, createdAt: -1 })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className');

      if (openTemplate) {
        return this.buildAvailabilityPayload(openTemplate, {
          currentTime: now,
          isOpen: true,
          state: 'open',
          message: `Đợt đánh giá giảng viên đang mở đến ${this.formatDateTime(
            openTemplate.feedbackPeriod?.endDate,
          )}.`,
        });
      }

      const nextTemplate = await FeedbackTemplate.findOne({
        evaluationTarget: 'teacher',
        status: 'active',
        'feedbackPeriod.startDate': { $gt: now },
      })
        .sort({ 'feedbackPeriod.startDate': 1, createdAt: -1 })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className');

      if (nextTemplate) {
        return this.buildAvailabilityPayload(nextTemplate, {
          currentTime: now,
          isOpen: false,
          state: 'scheduled',
          message: `Đợt đánh giá giảng viên sẽ mở từ ${this.formatDateTime(
            nextTemplate.feedbackPeriod?.startDate,
          )}.`,
        });
      }

      const latestTemplate = await FeedbackTemplate.findOne({
        evaluationTarget: 'teacher',
      })
        .sort({ 'feedbackPeriod.endDate': -1, createdAt: -1 })
        .populate('subject', 'subjectCode subjectName')
        .populate('classSection', 'classCode className');

      if (!latestTemplate) {
        return this.buildAvailabilityPayload(null, {
          currentTime: now,
          state: 'not_configured',
          message: 'Hiện chưa có đợt đánh giá giảng viên nào được cấu hình.',
        });
      }

      if (latestTemplate.status === 'draft') {
        return this.buildAvailabilityPayload(latestTemplate, {
          currentTime: now,
          state: 'draft',
          message: 'Đợt đánh giá giảng viên đã được tạo nhưng chưa được mở.',
        });
      }

      if (
        latestTemplate.status === 'closed' ||
        latestTemplate.status === 'archived' ||
        new Date(latestTemplate.feedbackPeriod?.endDate) < now
      ) {
        return this.buildAvailabilityPayload(latestTemplate, {
          currentTime: now,
          state: 'closed',
          message: `Đợt đánh giá giảng viên gần nhất đã kết thúc vào ${this.formatDateTime(
            latestTemplate.feedbackPeriod?.endDate,
          )}.`,
        });
      }

      return this.buildAvailabilityPayload(latestTemplate, {
        currentTime: now,
        state: latestTemplate.status || 'closed',
      });
    } catch (error) {
      throw error;
    }
  }

  async changeFeedbackTemplateStatus(id, status) {
    try {
      const validStatuses = ['draft', 'active', 'closed', 'archived'];

      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const template = await FeedbackTemplate.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true },
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
