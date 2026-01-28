const subjectService = require('../services/subject.service');

// Create new subject
exports.createSubject = async (req, res) => {
  try {
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all subjects with pagination
exports.getSubjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword } = req.query;
    const result = await subjectService.getSubjects({
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

// Get single subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update subject
exports.updateSubject = async (req, res) => {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete subject
exports.deleteSubject = async (req, res) => {
  try {
    await subjectService.deleteSubject(req.params.id);
    res.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Search subjects
exports.searchSubjects = async (req, res) => {
  try {
    const { keyword } = req.query;
    const subjects = await subjectService.searchSubjects(keyword);
    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subject prerequisites
exports.getPrerequisites = async (req, res) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    res.json({
      success: true,
      data: subject.prerequisites || [],
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update subject prerequisites
exports.updatePrerequisites = async (req, res) => {
  try {
    const { prerequisites } = req.body;
    const subject = await subjectService.updatePrerequisites(req.params.id, prerequisites);
    res.json({
      success: true,
      message: 'Prerequisites updated successfully',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

