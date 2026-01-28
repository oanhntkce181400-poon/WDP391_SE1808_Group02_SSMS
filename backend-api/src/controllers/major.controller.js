const majorService = require('../services/major.service');

exports.getMajors = async (req, res) => {
  try {
    const { keyword = '', isActive, page = 1, limit = 10 } = req.query;

    let parsedIsActive;
    if (typeof isActive !== 'undefined') {
      if (String(isActive).toLowerCase() === 'true') parsedIsActive = true;
      else if (String(isActive).toLowerCase() === 'false') parsedIsActive = false;
    }

    const majors = await majorService.getMajors({
      keyword,
      isActive: parsedIsActive,
    });

    // Simple pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedMajors = majors.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedMajors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: majors.length,
        totalPages: Math.ceil(majors.length / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createMajor = async (req, res) => {
  try {
    const { majorCode, majorName, majorNameEn, isActive } = req.body;

    if (!majorCode || !majorName) {
      return res.status(400).json({
        success: false,
        message: 'Mã ngành và tên ngành là bắt buộc',
      });
    }

    const newMajor = await majorService.createMajor({
      majorCode,
      majorName,
      majorNameEn,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: newMajor,
      message: 'Thêm ngành đào tạo thành công',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mã ngành đã tồn tại',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { majorCode, majorName, majorNameEn, isActive } = req.body;

    const updatedMajor = await majorService.updateMajor(id, {
      majorCode,
      majorName,
      majorNameEn,
      isActive,
    });

    if (!updatedMajor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngành đào tạo',
      });
    }

    res.json({
      success: true,
      data: updatedMajor,
      message: 'Cập nhật ngành đào tạo thành công',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await majorService.deleteMajor(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngành đào tạo',
      });
    }

    res.json({
      success: true,
      message: 'Xóa ngành đào tạo thành công',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.exportMajors = async (req, res) => {
  try {
    const { keyword = '', isActive } = req.query;

    let parsedIsActive;
    if (typeof isActive !== 'undefined') {
      if (String(isActive).toLowerCase() === 'true') parsedIsActive = true;
      else if (String(isActive).toLowerCase() === 'false') parsedIsActive = false;
    }

    const majors = await majorService.getMajors({
      keyword,
      isActive: parsedIsActive,
    });

    // Simple CSV export
    let csv = 'Mã ngành,Tên ngành,Tên tiếng Anh,Số lượng SV,Trạng thái\n';
    majors.forEach((major) => {
      csv += `${major.majorCode},${major.majorName},${major.majorNameEn || ''},${major.studentCount || 0},${major.isActive ? 'Đang đào tạo' : 'Ngừng tuyển sinh'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=majors.csv');
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
