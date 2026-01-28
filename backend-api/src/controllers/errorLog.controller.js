const errorLogService = require('../services/errorLog.service');

class ErrorLogController {
  /**
   * GET /api/error-logs
   * Lấy danh sách error logs
   */
  async getErrorLogs(req, res, next) {
    try {
      const { statusCode, errorType, startDate, endDate, page, limit } = req.query;

      const result = await errorLogService.getErrorLogs({
        statusCode,
        errorType,
        startDate,
        endDate,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.errorLogs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/error-logs/:id
   * Lấy chi tiết error log
   */
  async getErrorLogById(req, res, next) {
    try {
      const { id } = req.params;
      const errorLog = await errorLogService.getErrorLogById(id);

      res.json({
        success: true,
        data: errorLog,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/error-logs/stats
   * Lấy thống kê errors
   */
  async getErrorStats(req, res, next) {
    try {
      const stats = await errorLogService.getErrorStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/error-logs/clear
   * Xóa error logs cũ
   */
  async clearOldLogs(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const result = await errorLogService.clearOldLogs(Number(days));

      res.json({
        success: true,
        data: result,
        message: `Deleted ${result.deleted} old error logs`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ErrorLogController();
