// reports.controller.js
// Controller xử lý báo cáo
// Tác giả: Group02 - WDP391

const reportsService = require('../services/reports.service');

class ReportsController {
  /**
   * GET /api/reports/grade-distribution
   * Lấy báo cáo phân bố điểm
   * Query params: semester, academicYear, classSection, major
   */
  async getGradeDistribution(req, res) {
    try {
      const { semester, academicYear, classSection, major } = req.query;

      const filters = {};
      if (semester) filters.semester = semester;
      if (academicYear) filters.academicYear = academicYear;
      if (classSection) filters.classSection = classSection;
      if (major) filters.major = major;

      console.log('[ReportsController] getGradeDistribution filters:', filters);

      const result = await reportsService.getGradeDistribution(filters);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      console.error('[ReportsController] getGradeDistribution error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get grade distribution report'
      });
    }
  }
}

module.exports = new ReportsController();
