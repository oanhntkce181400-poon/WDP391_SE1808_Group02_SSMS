// honors.controller.js
// Controller xử lý requests liên quan đến danh sách ngoài ra sinh viên xuất sắc

const honorsService = require('../services/honors.service');

/**
 * GET /api/honors/honor-roll
 * Lấy danh sách sinh viên xuất sắc theo kỳ học
 * Query params: semesterId, semesterCode, academicYear
 */
const getHonorRoll = async (req, res) => {
  try {
    const { semesterId, semesterCode, academicYear } = req.query;

    if (!semesterId && !semesterCode && !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp semesterId, semesterCode hoặc academicYear',
      });
    }

    const filters = {};
    if (semesterId) filters.semesterId = semesterId;
    if (semesterCode) filters.semesterCode = semesterCode;
    if (academicYear) filters.academicYear = academicYear;

    const result = await honorsService.getHonorRollStudents(filters);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách xuất sắc thành công',
      data: result,
    });
  } catch (error) {
    console.error('[HonorsController] getHonorRoll error:', error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

/**
 * GET /api/honors/semesters
 * Lấy danh sách tất cả các kỳ học
 */
const getAllSemesters = async (req, res) => {
  try {
    console.log('[HonorsController] getAllSemesters endpoint called');
    const semesters = await honorsService.getAllSemesters();

    console.log('[HonorsController] Returning', semesters.length, 'semesters');
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách kỳ học thành công',
      data: semesters,
    });
  } catch (error) {
    console.error('[HonorsController] getAllSemesters error:', error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  getHonorRoll,
  getAllSemesters,
};
