// schedule.controller.js
// Controller xử lý request lịch học
// Tác giả: HuyHM - Feature/HuyHMSpring2

const scheduleService = require('../services/schedule.service');

// GET /api/schedules/me?weekStart=2026-02-16
const getMyWeekSchedule = async (req, res) => {
  try {
    // Lấy userId từ token (đã được authMiddleware giải mã vào req.auth.sub)
    const userId = req.auth.sub;

    // Lấy weekStart từ query string (VD: ?weekStart=2026-02-16)
    const { weekStart } = req.query;

    // Gọi service để lấy dữ liệu
    const data = await scheduleService.getMyWeekSchedule(userId, weekStart);

    // Trả về kết quả thành công
    return res.status(200).json({
      success: true,
      message: 'Lấy lịch học thành công',
      data: data,
    });
  } catch (error) {
    // Nếu lỗi do dữ liệu không hợp lệ → trả về 400
    if (
      error.message.includes('weekStart không hợp lệ') ||
      error.message.includes('Không tìm thấy sinh viên') ||
      error.message.includes('Không tìm thấy tài khoản')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Lỗi khác → trả về 500
    console.error('Lỗi lấy lịch học:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server, thử lại sau',
    });
  }
};

module.exports = { getMyWeekSchedule };
