const feedbackSubmissionService = require('../services/feedbackSubmission.service');
const feedbackStatisticsService = require('../services/feedbackStatistics.service');

class FeedbackSubmissionController {
  async submitFeedback(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const {
        feedbackTemplateId,
        evaluatedEntityId,
        evaluationType,
        classSectionId,
        responses,
      } = req.body;

      if (!feedbackTemplateId || !evaluationType || !Array.isArray(responses)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const submission = await feedbackSubmissionService.submitFeedback(
        {
          feedbackTemplateId,
          evaluatedEntityId,
          evaluationType,
          classSectionId,
          responses,
        },
        userId,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      );

      return res.status(201).json({
        success: true,
        message: 'Feedback saved successfully',
        data: submission,
      });
    } catch (error) {
      console.error('Error submitting feedback submission:', error);

      const message = error.message || 'Internal server error';

      if (
        message.includes('required') ||
        message.includes('already submitted') ||
        message.includes('not active') ||
        message.includes('not open') ||
        message.includes('not match') ||
        message.includes('outside the scope') ||
        message.includes('not enrolled') ||
        message.includes('Invalid') ||
        message.includes('Missing answer') ||
        message.includes('At least one response')
      ) {
        return res.status(400).json({
          success: false,
          message,
        });
      }

      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message,
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'You already submitted feedback for this class in the current feedback campaign',
        });
      }

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }

  async getMySubmissions(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const data = await feedbackSubmissionService.getMySubmissions(userId, req.query);

      return res.json({
        success: true,
        data,
        total: data.length,
      });
    } catch (error) {
      console.error('Error getting my feedback submissions:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async listSubmissions(req, res) {
    try {
      const result = await feedbackSubmissionService.listSubmissions(req.query);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error listing feedback submissions:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const { templateId } = req.params;
      const data = await feedbackStatisticsService.calculateTemplateStatistics(templateId);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error getting feedback submission statistics:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getTeacherFeedbackSummary(req, res) {
    try {
      const { teacherId } = req.params;
      const data = await feedbackStatisticsService.calculateTeacherGPA(teacherId);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error getting teacher feedback summary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}

module.exports = new FeedbackSubmissionController();
