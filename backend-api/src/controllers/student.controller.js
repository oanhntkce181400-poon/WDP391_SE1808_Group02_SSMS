// student.controller.js
// Controller xử lý HTTP requests cho Student Management
// Tác giả: Group02 - WDP391

const studentService = require('../services/student.service');

// ─────────────────────────────────────────────────────────────
// POST /api/students - Tạo sinh viên mới
// ─────────────────────────────────────────────────────────────
const createStudent = async (req, res) => {
  try {
    const createdById = req.auth.sub || req.auth.id;
    const payload = req.body;

    const newStudent = await studentService.createStudent(payload, createdById);

    return res.status(201).json({
      success: true,
      message: 'Tạo sinh viên thành công. Mật khẩu mặc định đã được tạo.',
      data: newStudent,
    });
  } catch (error) {
    console.error('[StudentController] createStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students - Lấy danh sách sinh viên (có filter & search)
// Query params: search, majorCode, cohort, academicStatus, page, limit, sortBy, sortOrder
// ─────────────────────────────────────────────────────────────
const getStudents = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      majorCode: req.query.majorCode,
      cohort: req.query.cohort,
      academicStatus: req.query.academicStatus,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sortBy: req.query.sortBy || 'studentCode',
      sortOrder: req.query.sortOrder || 'asc',
    };

    const result = await studentService.getStudents(filters);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sinh viên thành công',
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[StudentController] getStudents error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id - Lấy chi tiết sinh viên
// ─────────────────────────────────────────────────────────────
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin sinh viên thành công',
      data: student,
    });
  } catch (error) {
    console.error('[StudentController] getStudentById error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/students/:id - Cập nhật thông tin sinh viên
// ─────────────────────────────────────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedById = req.auth.sub || req.auth.id;
    const payload = req.body;

    const updatedStudent = await studentService.updateStudent(id, payload, updatedById);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sinh viên thành công',
      data: updatedStudent,
    });
  } catch (error) {
    console.error('[StudentController] updateStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/students/:id - Xóa sinh viên (soft delete)
// ─────────────────────────────────────────────────────────────
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedById = req.auth.sub || req.auth.id;

    const result = await studentService.deleteStudent(id, deletedById);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[StudentController] deleteStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/filters/majors - Lấy danh sách ngành học (cho dropdown)
// ─────────────────────────────────────────────────────────────
const getMajorsForFilter = async (req, res) => {
  try {
    const majors = await studentService.getMajorsForFilter();

    return res.status(200).json({
      success: true,
      data: majors,
    });
  } catch (error) {
    console.error('[StudentController] getMajorsForFilter error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/filters/cohorts - Lấy danh sách khóa (cho dropdown)
// ─────────────────────────────────────────────────────────────
const getCohortsForFilter = async (req, res) => {
  try {
    const cohorts = await studentService.getCohortsForFilter();

    return res.status(200).json({
      success: true,
      data: cohorts,
    });
  } catch (error) {
    console.error('[StudentController] getCohortsForFilter error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/suggest-class - Gợi ý lớp sinh hoạt
// Query: majorCode, cohort
// ─────────────────────────────────────────────────────────────
const getSuggestedClassSection = async (req, res) => {
  try {
    const { majorCode, cohort } = req.query;

    if (!majorCode || !cohort) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số majorCode hoặc cohort',
      });
    }

    const suggestion = await studentService.getSuggestedClassSection(
      majorCode,
      parseInt(cohort)
    );

    return res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    console.error('[StudentController] getSuggestedClassSection error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getMajorsForFilter,
  getCohortsForFilter,
  getSuggestedClassSection,
};
