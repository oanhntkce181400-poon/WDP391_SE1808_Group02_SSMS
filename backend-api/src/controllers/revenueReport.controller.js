const revenueReportService = require('../services/revenueReport.service');

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate, majorCode, semesterCode } = req.query;
    const summary = await revenueReportService.getSummary(
      { startDate, endDate },
      { majorCode, semesterCode }
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrend = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const trend = await revenueReportService.getTrend({ startDate, endDate }, groupBy);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByMajor = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const byMajor = await revenueReportService.getRevenueByMajor({ startDate, endDate });
    res.json({ success: true, data: byMajor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByPaymentMethod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const byMethod = await revenueReportService.getRevenueByPaymentMethod({ startDate, endDate });
    res.json({ success: true, data: byMethod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStatusDistribution = async (req, res) => {
  try {
    const { semesterCode } = req.query;
    const distribution = await revenueReportService.getStatusDistribution({ semesterCode });
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const transactions = await revenueReportService.getTransactionDetails(
      { startDate, endDate },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
