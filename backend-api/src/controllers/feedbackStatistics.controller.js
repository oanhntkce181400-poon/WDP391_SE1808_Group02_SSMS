const feedbackStatisticsService = require('../services/feedbackStatistics.service');

class FeedbackStatisticsController {
  /**
   * GET /api/feedback-statistics/teacher/:teacherId
   * Lấy tóm tắt GPA và thống kê của giáo viên
   */
  async getTeacherStatistics(req, res) {
    try {
      const { teacherId } = req.params;

      const statistics = await feedbackStatisticsService.calculateTeacherGPA(teacherId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting teacher statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-statistics/template/:templateId
   * Lấy thống kê chi tiết cho một template
   */
  async getTemplateStatistics(req, res) {
    try {
      const { templateId } = req.params;

      const statistics = await feedbackStatisticsService.calculateTemplateStatistics(templateId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting template statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-statistics/teachers/top
   * So sánh giáo viên (top N)
   */
  async getTeacherComparison(req, res) {
    try {
      const { limit = 10 } = req.query;

      const comparison = await feedbackStatisticsService.getTeacherComparison(parseInt(limit));

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error getting teacher comparison:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-statistics/range
   * Lấy thống kê theo khoảng thời gian
   * Query: startDate, endDate (ISO format)
   */
  async getStatisticsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }

      const statistics = await feedbackStatisticsService.getStatisticsByDateRange(startDate, endDate);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting statistics by date range:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-statistics/question/:templateId/:questionId
   * Phân tích câu hỏi cụ thể
   */
  async analyzeQuestion(req, res) {
    try {
      const { templateId, questionId } = req.params;

      const analysis = await feedbackStatisticsService.analyzeQuestion(templateId, questionId);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing question:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new FeedbackStatisticsController();
