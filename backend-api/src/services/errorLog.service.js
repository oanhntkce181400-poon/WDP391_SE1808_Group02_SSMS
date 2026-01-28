const ErrorLog = require('../models/errorLog.model');

class ErrorLogService {
  /**
   * Lấy danh sách error logs với filter và pagination
   */
  async getErrorLogs({ statusCode, errorType, startDate, endDate, page = 1, limit = 10 }) {
    const query = {};

    // Filter theo status code
    if (statusCode) {
      query.statusCode = Number(statusCode);
    }

    // Filter theo error type
    if (errorType && errorType !== 'all') {
      query.errorType = errorType;
    }

    // Filter theo date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [errorLogs, total] = await Promise.all([
      ErrorLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-stack -requestBody -requestQuery') // Exclude sensitive data
        .lean(),
      ErrorLog.countDocuments(query),
    ]);

    return {
      errorLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy chi tiết một error log
   */
  async getErrorLogById(id) {
    const errorLog = await ErrorLog.findById(id).lean();
    if (!errorLog) {
      throw new Error('Error log not found');
    }
    return errorLog;
  }

  /**
   * Lấy thống kê errors
   */
  async getErrorStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, errorsByType, errorsByStatus] = await Promise.all([
      ErrorLog.countDocuments({ createdAt: { $gte: today } }),
      ErrorLog.aggregate([
        { $group: { _id: '$errorType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ErrorLog.aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $gte: ['$statusCode', 500] },
                'server',
                { $cond: [{ $gte: ['$statusCode', 400] }, 'client', 'other'] },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      totalToday,
      errorsByType: errorsByType.map((e) => ({ type: e._id, count: e.count })),
      errorsByStatus: {
        server: errorsByStatus.find((e) => e._id === 'server')?.count || 0,
        client: errorsByStatus.find((e) => e._id === 'client')?.count || 0,
      },
    };
  }

  /**
   * Xóa error logs cũ
   */
  async clearOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ErrorLog.deleteMany({ createdAt: { $lt: cutoffDate } });
    return { deleted: result.deletedCount };
  }
}

module.exports = new ErrorLogService();
