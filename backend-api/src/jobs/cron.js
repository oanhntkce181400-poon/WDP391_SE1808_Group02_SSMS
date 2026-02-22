// cron.js
// Cron jobs để tự động thực hiện các tác vụ theo lịch trình

const registrationPeriodService = require('../services/registrationPeriod.service');

/**
 * Khởi tạo các cron jobs
 */
async function initializeCronJobs() {
  // Chạy ngay 1 lần khi khởi động
  try {
    await registrationPeriodService.autoUpdatePeriodStatuses();
    console.log('[Cron] Initial period status check completed');
  } catch (error) {
    console.error('[Cron] Error in initial status check:', error);
  }

  // Cập nhật trạng thái đợt đăng ký mỗi 1 phút
  setInterval(async () => {
    try {
      await registrationPeriodService.autoUpdatePeriodStatuses();
    } catch (error) {
      console.error('[Cron] Error updating registration period statuses:', error);
    }
  },  30 * 1000); // 30giây

  console.log('[Cron] Cron jobs initialized - checking period statuses every 1 minute');
}

module.exports = { initializeCronJobs };
