const feedbackTemplateService = require('../services/feedbackTemplate.service');

class FeedbackTemplateController {
  /**
   * POST /api/feedback-templates
   * Tạo mẫu đánh giá mới
   */
  async createFeedbackTemplate(req, res) {
    try {
      const {
        templateName,
        description,
        questions,
        feedbackStartDate,
        feedbackEndDate,
        status,
        evaluationTarget,
        subject,
        classSection
      } = req.body;

      // Validation
      if (!templateName || !feedbackStartDate || !feedbackEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: templateName, feedbackStartDate, feedbackEndDate'
        });
      }

      // Parse and validate dates
      const startDate = new Date(feedbackStartDate);
      const endDate = new Date(feedbackEndDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD or ISO string)'
        });
      }

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date'
        });
      }

      const data = {
        templateName: templateName.trim(),
        description: description ? description.trim() : '',
        questions: Array.isArray(questions) ? questions : [],
        feedbackStartDate: startDate,
        feedbackEndDate: endDate,
        status: status || 'draft',
        evaluationTarget: evaluationTarget || 'teacher',
        subject: subject || null,
        classSection: classSection || null
      };

      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token'
        });
      }

      const feedbackTemplate = await feedbackTemplateService.createFeedbackTemplate(data, userId);

      res.status(201).json({
        success: true,
        message: 'Feedback template created successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error creating feedback template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-templates
   * Lấy danh sách mẫu đánh giá
   */
  async getFeedbackTemplates(req, res) {
    try {
      const { page = 1, limit = 10, keyword = '', status, evaluationTarget } = req.query;

      const result = await feedbackTemplateService.getFeedbackTemplates({
        page: parseInt(page),
        limit: parseInt(limit),
        keyword,
        status,
        evaluationTarget
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching feedback templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-templates/:id
   * Lấy chi tiết mẫu đánh giá
   */
  async getFeedbackTemplateById(req, res) {
    try {
      const { id } = req.params;

      const feedbackTemplate = await feedbackTemplateService.getFeedbackTemplateById(id);

      res.json({
        success: true,
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error fetching feedback template:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Feedback template not found'
      });
    }
  }

  /**
   * PATCH /api/feedback-templates/:id
   * Cập nhật mẫu đánh giá
   */
  async updateFeedbackTemplate(req, res) {
    try {
      const { id } = req.params;
      const {
        templateName,
        description,
        questions,
        feedbackStartDate,
        feedbackEndDate,
        status,
        evaluationTarget,
        subject,
        classSection
      } = req.body;

      // Validation and date parsing
      const data = {
        templateName: templateName ? templateName.trim() : undefined,
        description: description ? description.trim() : undefined,
        questions: Array.isArray(questions) ? questions : undefined,
        status,
        evaluationTarget,
        subject: subject || null,
        classSection: classSection || null
      };

      // Parse and validate dates if provided
      if (feedbackStartDate || feedbackEndDate) {
        if (feedbackStartDate && feedbackEndDate) {
          const startDate = new Date(feedbackStartDate);
          const endDate = new Date(feedbackEndDate);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid date format. Use ISO 8601 format'
            });
          }

          if (startDate >= endDate) {
            return res.status(400).json({
              success: false,
              message: 'Start date must be before end date'
            });
          }

          data.feedbackStartDate = startDate;
          data.feedbackEndDate = endDate;
        }
      }

      const userId = req.auth?.sub;
      const feedbackTemplate = await feedbackTemplateService.updateFeedbackTemplate(id, data, userId);

      res.json({
        success: true,
        message: 'Feedback template updated successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error updating feedback template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/feedback-templates/:id
   * Xóa mẫu đánh giá
   */
  async deleteFeedbackTemplate(req, res) {
    try {
      const { id } = req.params;

      await feedbackTemplateService.deleteFeedbackTemplate(id);

      res.json({
        success: true,
        message: 'Feedback template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting feedback template:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * POST /api/feedback-templates/:id/questions
   * Thêm câu hỏi vào mẫu đánh giá
   */
  async addQuestion(req, res) {
    try {
      const { id } = req.params;
      const {
        questionText,
        questionType,
        ratingScale,
        options,
        isRequired,
        maxLength
      } = req.body;

      if (!questionText || !questionType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: questionText, questionType'
        });
      }

      const questionData = {
        questionText,
        questionType,
        ratingScale,
        options,
        isRequired,
        maxLength
      };

      const feedbackTemplate = await feedbackTemplateService.addQuestionToTemplate(id, questionData);

      res.json({
        success: true,
        message: 'Question added successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/feedback-templates/:templateId/questions/:questionId
   * Xóa câu hỏi từ mẫu đánh giá
   */
  async removeQuestion(req, res) {
    try {
      const { templateId, questionId } = req.params;

      const feedbackTemplate = await feedbackTemplateService.removeQuestionFromTemplate(templateId, questionId);

      res.json({
        success: true,
        message: 'Question removed successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error removing question:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * PATCH /api/feedback-templates/:templateId/questions/:questionId
   * Cập nhật câu hỏi trong mẫu đánh giá
   */
  async updateQuestion(req, res) {
    try {
      const { templateId, questionId } = req.params;
      const {
        questionText,
        questionType,
        ratingScale,
        options,
        isRequired,
        maxLength,
        displayOrder
      } = req.body;

      const questionData = {
        questionText,
        questionType,
        ratingScale,
        options,
        isRequired,
        maxLength,
        displayOrder
      };

      const feedbackTemplate = await feedbackTemplateService.updateQuestionInTemplate(
        templateId,
        questionId,
        questionData
      );

      res.json({
        success: true,
        message: 'Question updated successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-templates/active
   * Lấy các mẫu đánh giá đang hoạt động
   */
  async getActiveFeedbackTemplates(req, res) {
    try {
      const feedbackTemplates = await feedbackTemplateService.getActiveFeedbackTemplates();

      res.json({
        success: true,
        data: feedbackTemplates
      });
    } catch (error) {
      console.error('Error fetching active feedback templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * PATCH /api/feedback-templates/:id/status
   * Thay đổi trạng thái mẫu đánh giá
   */
  async changeFeedbackTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const feedbackTemplate = await feedbackTemplateService.changeFeedbackTemplateStatus(id, status);

      res.json({
        success: true,
        message: 'Feedback template status updated successfully',
        data: feedbackTemplate
      });
    } catch (error) {
      console.error('Error updating feedback template status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new FeedbackTemplateController();
