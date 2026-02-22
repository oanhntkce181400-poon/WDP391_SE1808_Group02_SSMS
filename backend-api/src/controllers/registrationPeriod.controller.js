// registrationPeriod.controller.js
// Controller xử lý HTTP requests cho Registration Period

const registrationPeriodService = require('../services/registrationPeriod.service');

/**
 * POST /api/registration-periods - Tạo đợt đăng ký mới
 */
const createPeriod = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const payload = req.body;

    const period = await registrationPeriodService.createRegistrationPeriod(payload, userId);

    return res.status(201).json({
      success: true,
      message: 'Tạo đợt đăng ký thành công',
      data: period,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] createPeriod error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * GET /api/registration-periods - Lấy danh sách đợt đăng ký
 * Query params: ?status=active&semesterId=xxx
 */
const getPeriods = async (req, res) => {
  try {
    const filters = {
      status: req.query.status || 'all',
      semesterId: req.query.semesterId || null,
    };

    const periods = await registrationPeriodService.getRegistrationPeriods(filters);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đợt đăng ký thành công',
      data: periods,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] getPeriods error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * GET /api/registration-periods/current - Lấy đợt đăng ký đang active
 */
const getCurrentPeriod = async (req, res) => {
  try {
    const period = await registrationPeriodService.getCurrentActivePeriod();

    return res.status(200).json({
      success: true,
      message: period ? 'Lấy đợt đăng ký hiện tại thành công' : 'Không có đợt đăng ký nào đang mở',
      data: period,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] getCurrentPeriod error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * GET /api/registration-periods/:id - Lấy chi tiết đợt đăng ký
 */
const getPeriodById = async (req, res) => {
  try {
    const { id } = req.params;

    const period = await registrationPeriodService.getRegistrationPeriodById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết đợt đăng ký thành công',
      data: period,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] getPeriodById error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * PUT /api/registration-periods/:id - Cập nhật đợt đăng ký
 */
const updatePeriod = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { id } = req.params;
    const payload = req.body;

    const period = await registrationPeriodService.updateRegistrationPeriod(id, payload, userId);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật đợt đăng ký thành công',
      data: period,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] updatePeriod error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * PATCH /api/registration-periods/:id/status - Toggle trạng thái
 * Body: { status: 'active' | 'closed' | 'upcoming' | 'cancelled' }
 */
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu trạng thái (status)',
      });
    }

    const period = await registrationPeriodService.togglePeriodStatus(id, status);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: period,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] toggleStatus error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * DELETE /api/registration-periods/:id - Xóa đợt đăng ký
 */
const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await registrationPeriodService.deleteRegistrationPeriod(id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[RegistrationPeriodController] deletePeriod error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  createPeriod,
  getPeriods,
  getCurrentPeriod,
  getPeriodById,
  updatePeriod,
  toggleStatus,
  deletePeriod,
};
