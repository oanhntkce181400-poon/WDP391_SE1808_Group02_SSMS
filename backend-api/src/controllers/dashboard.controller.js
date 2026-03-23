const dashboardService = require('../services/dashboard.service');

/**
 * The admin dashboard is intentionally thin: it delegates aggregation work to
 * the service and only normalises the HTTP response shape here.
 */
async function getDashboardStats(req, res) {
  try {
    const stats = await dashboardService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[DashboardController] getDashboardStats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load dashboard stats',
    });
  }
}

module.exports = {
  getDashboardStats,
};
