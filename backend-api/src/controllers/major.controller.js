const majorService = require('../services/major.service');

exports.getMajors = async (req, res) => {
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

    res.json({
      success: true,
      data: majors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
