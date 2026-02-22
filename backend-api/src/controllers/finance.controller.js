// finance.controller.js
// Controller xử lý request HTTP cho tính năng Học phí sinh viên

const financeService = require('../services/finance.service');

// ─────────────────────────────────────────────────────────────
// GET /api/finance/tuition/me?semesterId=...
// Trả về tổng quan học phí của sinh viên đang đăng nhập
//
// Input:  JWT token (student role) + query param semesterId? (tuỳ chọn)
// Output: 200 + TuitionSummaryDTO
//         401 chưa đăng nhập
//         403 không phải sinh viên
//         404 không tìm thấy học kỳ
//         422 chưa cấu hình học phí
//         500 lỗi server
// ─────────────────────────────────────────────────────────────
async function getMyTuitionSummary(req, res) {
  try {
    // Lấy userId từ JWT (authMiddleware đã gán req.auth)
    const userId = req.auth.sub;

    // Lấy semesterId từ query string (tuỳ chọn)
    const semesterId = req.query.semesterId || null;

    // Gọi service để tính toán
    const summary = await financeService.getMyTuitionSummary(userId, semesterId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Lỗi hệ thống',
    });
  }
}

module.exports = {
  getMyTuitionSummary,
};
