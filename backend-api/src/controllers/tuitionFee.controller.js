// Tuition Fee Controller - Xử lý request/response
const tuitionFeeService = require('../services/tuitionFee.service');

// Lấy danh sách học phí
exports.getTuitionFees = async (req, res) => {
  try {
    const { page = 1, limit = 10, cohort, majorCode, academicYear } = req.query;
    
    const result = await tuitionFeeService.getTuitionFees({
      page: parseInt(page),
      limit: parseInt(limit),
      cohort,
      majorCode,
      academicYear,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy chi tiết học phí
exports.getTuitionFeeById = async (req, res) => {
  try {
    const tuitionFee = await tuitionFeeService.getTuitionFeeById(req.params.id);
    res.json({
      success: true,
      data: tuitionFee,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Tạo học phí mới
exports.createTuitionFee = async (req, res) => {
  try {
    const tuitionFee = await tuitionFeeService.createTuitionFee(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo học phí thành công',
      data: tuitionFee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật học phí
exports.updateTuitionFee = async (req, res) => {
  try {
    const tuitionFee = await tuitionFeeService.updateTuitionFee(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Cập nhật học phí thành công',
      data: tuitionFee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Thêm discount
exports.addDiscount = async (req, res) => {
  try {
    const tuitionFee = await tuitionFeeService.addDiscount(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Thêm giảm giá thành công',
      data: tuitionFee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Xóa discount
exports.removeDiscount = async (req, res) => {
  try {
    const tuitionFee = await tuitionFeeService.removeDiscount(
      req.params.id,
      req.params.discountId
    );
    res.json({
      success: true,
      message: 'Xóa giảm giá thành công',
      data: tuitionFee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Xóa học phí
exports.deleteTuitionFee = async (req, res) => {
  try {
    await tuitionFeeService.deleteTuitionFee(req.params.id);
    res.json({
      success: true,
      message: 'Xóa học phí thành công',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy summary theo cohort
exports.getSummaryByCohort = async (req, res) => {
  try {
    const { cohort, majorCode } = req.query;
    const summary = await tuitionFeeService.getSummaryByCohort(cohort, majorCode);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
