// request.controller.js
// Controller nhận request từ HTTP, gọi service, trả về response
// Tương ứng với RequestController trong class diagram
// Các hàm: createRequest, getMyRequests, getRequestById, updateRequest, cancelRequest

const requestService = require('../services/request.service');

// ─────────────────────────────────────────────────────────────
// POST /api/requests - Tạo đơn mới
// ─────────────────────────────────────────────────────────────
const createRequest = async (req, res) => {
  try {
    // Lấy userId từ JWT token (đã được authMiddleware gán vào req.auth.sub)
    const userId = req.auth.sub;

    // Lấy dữ liệu từ body
    const payload = req.body;

    // Gọi service tạo đơn
    const newRequest = await requestService.createRequest(userId, payload);

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn thành công',
      data: newRequest,
    });
  } catch (error) {
    console.error('[RequestController] createRequest error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/requests/me - Lấy danh sách đơn của sinh viên hiện tại
// ─────────────────────────────────────────────────────────────
const getMyRequests = async (req, res) => {
  try {
    const userId = req.auth.sub;

    const requests = await requestService.getMyRequests(userId);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn thành công',
      data: requests,
    });
  } catch (error) {
    console.error('[RequestController] getMyRequests error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/requests/:id - Lấy chi tiết một đơn
// ─────────────────────────────────────────────────────────────
const getRequestById = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { id } = req.params;

    const requestDoc = await requestService.getRequestById(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết đơn thành công',
      data: requestDoc,
    });
  } catch (error) {
    console.error('[RequestController] getRequestById error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/requests/:id - Cập nhật đơn (chỉ khi Pending)
// Tương ứng updateRequest(id, payload) trong class diagram
// ─────────────────────────────────────────────────────────────
const updateRequest = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { id } = req.params;
    const payload = req.body; // UpdateRequestPayload: các trường + attachments

    const updatedRequest = await requestService.updateRequest(id, userId, payload);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật đơn thành công',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('[RequestController] updateRequest error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/requests/:id/cancel - Hủy đơn (chỉ khi Pending)
// Tương ứng cancelRequest(id) trong class diagram
// ─────────────────────────────────────────────────────────────
const cancelRequest = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { id } = req.params;

    const cancelledRequest = await requestService.cancelRequest(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Hủy đơn thành công',
      data: cancelledRequest,
    });
  } catch (error) {
    console.error('[RequestController] cancelRequest error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN: GET /api/requests - Lấy tất cả đơn (có thể lọc theo ?status=)
// ─────────────────────────────────────────────────────────────
const getAllRequests = async (req, res) => {
  try {
    // Lấy các tham số lọc từ query string
    // VD: GET /api/requests?status=Pending
    const filters = {
      status: req.query.status || 'all',
    };

    const requests = await requestService.getAllRequests(filters);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn thành công',
      data: requests,
    });
  } catch (error) {
    console.error('[RequestController] getAllRequests error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN: PATCH /api/requests/:id/review - Duyệt / từ chối đơn
// Body: { status: 'Approved' | 'Rejected' | 'Processing', staffNote: '' }
// ─────────────────────────────────────────────────────────────
const reviewRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffNote } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu trạng thái (status)',
      });
    }

    const updatedRequest = await requestService.reviewRequest(id, status, staffNote || '');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn thành công',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('[RequestController] reviewRequest error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  updateRequest,
  cancelRequest,
  // Admin
  getAllRequests,
  reviewRequest,
};
