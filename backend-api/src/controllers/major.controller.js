const majorService = require('../services/major.service');

class MajorController {
  /**
   * GET /api/majors
   * Lấy danh sách chuyên ngành
   */
  async getMajors(req, res) {
    try {
      const { keyword, faculty, isActive, page, limit } = req.query;

      const result = await majorService.getMajors({
        keyword,
        faculty,
        isActive,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.majors,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error in getMajors:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch majors',
      });
    }
  }

  /**
   * GET /api/majors/:id
   * Lấy chi tiết chuyên ngành
   */
  async getMajorById(req, res) {
    try {
      const { id } = req.params;
      const major = await majorService.getMajorById(id);

      res.json({
        success: true,
        data: major,
      });
    } catch (error) {
      console.error('Error in getMajorById:', error);
      res.status(error.message === 'Major not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch major',
      });
    }
  }

  /**
   * POST /api/majors
   * Tạo chuyên ngành mới
   */
  async createMajor(req, res) {
    try {
      const major = await majorService.createMajor(req.body);

      res.status(201).json({
        success: true,
        data: major,
        message: 'Major created successfully',
      });
    } catch (error) {
      console.error('Error in createMajor:', error);
      res.status(error.message === 'Major code already exists' ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to create major',
      });
    }
  }

  /**
   * PUT /api/majors/:id
   * Cập nhật chuyên ngành
   */
  async updateMajor(req, res) {
    try {
      const { id } = req.params;
      const major = await majorService.updateMajor(id, req.body);

      res.json({
        success: true,
        data: major,
        message: 'Major updated successfully',
      });
    } catch (error) {
      console.error('Error in updateMajor:', error);
      const statusCode =
        error.message === 'Major not found'
          ? 404
          : error.message === 'Major code already exists'
          ? 400
          : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update major',
      });
    }
  }

  /**
   * DELETE /api/majors/:id
   * Xóa chuyên ngành (soft delete)
   */
  async deleteMajor(req, res) {
    try {
      const { id } = req.params;
      const major = await majorService.deleteMajor(id);

      res.json({
        success: true,
        data: major,
        message: 'Major deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteMajor:', error);
      res.status(error.message === 'Major not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to delete major',
      });
    }
  }

  /**
   * GET /api/majors/export
   * Export danh sách chuyên ngành
   */
  async exportMajors(req, res) {
    try {
      // TODO: Implement export logic (Excel/CSV)
      res.json({
        success: false,
        message: 'Export feature not implemented yet',
      });
    } catch (error) {
      console.error('Error in exportMajors:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export majors',
      });
    }
  }
}

module.exports = new MajorController();
