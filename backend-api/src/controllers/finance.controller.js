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

// ─────────────────────────────────────────────────────────────
// POST /api/finance/payments/confirm
// Xác nhận thanh toán PayOS và lưu vào DB
//
// Input:  JWT token + body { orderCode, amount, status }
// Output: 200 + Payment object
//         400 thanh toán chưa hoàn tất
//         401 chưa đăng nhập
//         500 lỗi server
// ─────────────────────────────────────────────────────────────
async function confirmPayment(req, res) {
  try {
    const userId = req.auth.sub;
    const { orderCode, amount, status } = req.body;

    if (!orderCode || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin orderCode hoặc amount',
      });
    }

    const payment = await financeService.confirmPayment({
      userId,
      orderCode,
      amount,
      status: status || 'PAID',
    });

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Lỗi hệ thống',
    });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/finance/payments/history?semesterId=...
// Lấy lịch sử thanh toán của sinh viên
//
// Input:  JWT token + query param semesterId? (tuỳ chọn)
// Output: 200 + Array các Payment
//         401 chưa đăng nhập
//         500 lỗi server
// ─────────────────────────────────────────────────────────────
async function getPaymentHistory(req, res) {
  try {
    const userId = req.auth.sub;
    const semesterId = req.query.semesterId || null;

    const history = await financeService.getPaymentHistory(userId, semesterId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Lỗi hệ thống',
    });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/finance/payments/all-students?semesterId=&majorCode=&graduationYear=
// Tổng hợp thanh toán của tất cả sinh viên (admin)
//
// Input:  JWT token + query params
// Output: 200 + { summary, students: [...] }
//         401 chưa đăng nhập
//         500 lỗi server
// ─────────────────────────────────────────────────────────────
async function getAllStudentsPaymentSummary(req, res) {
  try {
    const semesterId = req.query.semesterId || null;
    const majorCode = req.query.majorCode || null;
    const graduationYear = req.query.graduationYear || null;

    const result = await financeService.getAllStudentsPaymentSummary(
      semesterId,
      majorCode,
      graduationYear
    );

    return res.status(200).json({
      success: true,
      data: result,
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
  confirmPayment,
  getPaymentHistory,
  getAllStudentsPaymentSummary,
};
