// Curriculum Controller - Handle HTTP requests for Curriculum
const curriculumService = require('../services/curriculum.service');

// Get all curriculums
exports.getCurriculums = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword } = req.query;
    const result = await curriculumService.getCurriculums({
      page: parseInt(page),
      limit: parseInt(limit),
      keyword,
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

// Get single curriculum by ID
exports.getCurriculumById = async (req, res) => {
  try {
    const curriculum = await curriculumService.getCurriculumById(req.params.id);
    res.json({
      success: true,
      data: curriculum,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new curriculum
exports.createCurriculum = async (req, res) => {
  try {
    const curriculum = await curriculumService.createCurriculum(req.body);
    res.status(201).json({
      success: true,
      message: 'Curriculum created successfully',
      data: curriculum,
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate curriculum code',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update existing curriculum
exports.updateCurriculum = async (req, res) => {
  try {
    const curriculum = await curriculumService.updateCurriculum(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Curriculum updated successfully',
      data: curriculum,
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate curriculum code',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete curriculum
exports.deleteCurriculum = async (req, res) => {
  try {
    await curriculumService.deleteCurriculum(req.params.id);
    res.json({
      success: true,
      message: 'Curriculum deleted successfully',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update curriculum semesters
exports.updateCurriculumSemesters = async (req, res) => {
  try {
    const { semesters } = req.body;
    const curriculum = await curriculumService.updateCurriculumSemesters(req.params.id, semesters);
    res.json({
      success: true,
      message: 'Curriculum semesters updated successfully',
      data: curriculum,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get curriculum semesters
exports.getCurriculumSemesters = async (req, res) => {
  try {
    const semesters = await curriculumService.getCurriculumSemesters(req.params.id);
    res.json({
      success: true,
      data: semesters,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

