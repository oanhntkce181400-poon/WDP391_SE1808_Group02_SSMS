const facultyService = require('../services/faculty.service');

exports.getFaculties = async (req, res) => {
  try {
    const { keyword = '', isActive, page = 1, limit = 10 } = req.query;

    let parsedIsActive;
    if (typeof isActive !== 'undefined') {
      if (String(isActive).toLowerCase() === 'true') parsedIsActive = true;
      else if (String(isActive).toLowerCase() === 'false') parsedIsActive = false;
    }

    const faculties = await facultyService.getFaculties({
      keyword,
      isActive: parsedIsActive,
    });

    // Simple pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedFaculties = faculties.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedFaculties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: faculties.length,
        totalPages: Math.ceil(faculties.length / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createFaculty = async (req, res) => {
  try {
    const { facultyCode, facultyName, shortName, description, isActive } = req.body;

    if (!facultyCode || !facultyName) {
      return res.status(400).json({
        success: false,
        message: 'Mã khoa và tên khoa là bắt buộc',
      });
    }

    const newFaculty = await facultyService.createFaculty({
      facultyCode,
      facultyName,
      shortName,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: newFaculty,
      message: 'Thêm khoa thành công',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mã khoa đã tồn tại',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyCode, facultyName, shortName, description, isActive } = req.body;

    const updatedFaculty = await facultyService.updateFaculty(id, {
      facultyCode,
      facultyName,
      shortName,
      description,
      isActive,
    });

    if (!updatedFaculty) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khoa',
      });
    }

    res.json({
      success: true,
      data: updatedFaculty,
      message: 'Cập nhật khoa thành công',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await facultyService.deleteFaculty(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khoa',
      });
    }

    res.json({
      success: true,
      message: 'Xóa khoa thành công',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.exportFaculties = async (req, res) => {
  try {
    const { keyword = '', isActive } = req.query;

    let parsedIsActive;
    if (typeof isActive !== 'undefined') {
      if (String(isActive).toLowerCase() === 'true') parsedIsActive = true;
      else if (String(isActive).toLowerCase() === 'false') parsedIsActive = false;
    }

    const faculties = await facultyService.getFaculties({
      keyword,
      isActive: parsedIsActive,
    });

    // Simple CSV export
    let csv = 'Mã khoa,Tên khoa,Tên viết tắt,Số ngành,Số sinh viên,Trạng thái\n';
    faculties.forEach((faculty) => {
      csv += `${faculty.facultyCode},${faculty.facultyName},${faculty.shortName || ''},${faculty.majorCount || 0},${faculty.studentCount || 0},${faculty.isActive ? 'Hoạt động' : 'Không hoạt động'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=faculties.csv');
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
