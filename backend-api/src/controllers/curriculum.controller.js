// Curriculum Controller - Handle HTTP requests for Curriculum
const curriculumService = require('../services/curriculum.service');
const curriculumSemesterService = require('../services/curriculumSemester.service');
const curriculumCourseService = require('../services/curriculumCourse.service');
const Curriculum = require('../models/curriculum.model');

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
    // Delete all semesters and courses associated with this curriculum first
    const semesters = await curriculumSemesterService.getSemestersByCurriculum(req.params.id);
    for (const semester of semesters) {
      await curriculumSemesterService.deleteSemester(semester._id);
    }
    
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

// ========== NEW RELATIONAL STRUCTURE ENDPOINTS ==========

// Get curriculum with semesters and courses (new structure)
exports.getCurriculumWithDetails = async (req, res) => {
  try {
    const curriculum = await curriculumService.getCurriculumById(req.params.id);
    const semesters = await curriculumSemesterService.getCurriculumWithSemestersAndCourses(req.params.id);
    
    res.json({
      success: true,
      data: {
        ...curriculum.toObject(),
        semesters,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----- Semester Endpoints -----

// Get all semesters for a curriculum
exports.getSemesters = async (req, res) => {
  try {
    const semesters = await curriculumSemesterService.getSemestersByCurriculum(req.params.curriculumId);
    res.json({
      success: true,
      data: semesters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single semester by ID
exports.getSemesterById = async (req, res) => {
  try {
    const semester = await curriculumSemesterService.getSemesterWithCourses(req.params.semesterId);
    res.json({
      success: true,
      data: semester,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new semester
exports.createSemester = async (req, res) => {
  try {
    const semester = await curriculumSemesterService.createSemester(req.params.curriculumId, req.body);
    
    // Mark curriculum as using relational structure
    await Curriculum.findByIdAndUpdate(req.params.curriculumId, {
      $set: { useRelationalStructure: true }
    });
    
    res.status(201).json({
      success: true,
      message: 'Semester created successfully',
      data: semester,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update semester
exports.updateSemester = async (req, res) => {
  try {
    const semester = await curriculumSemesterService.updateSemester(req.params.semesterId, req.body);
    res.json({
      success: true,
      message: 'Semester updated successfully',
      data: semester,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete semester
exports.deleteSemester = async (req, res) => {
  try {
    await curriculumSemesterService.deleteSemester(req.params.semesterId);
    res.json({
      success: true,
      message: 'Semester deleted successfully',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Reorder semesters (drag-drop)
exports.reorderSemesters = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const semesters = await curriculumSemesterService.reorderSemesters(req.params.curriculumId, orderedIds);
    res.json({
      success: true,
      message: 'Semesters reordered successfully',
      data: semesters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----- Course Endpoints -----

// Get all courses for a semester
exports.getCourses = async (req, res) => {
  try {
    const courses = await curriculumCourseService.getCoursesBySemester(req.params.semesterId);
    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add course to semester
exports.addCourse = async (req, res) => {
  try {
    // Check if subject already exists in curriculum
    const curriculumId = req.params.curriculumId;
    const exists = await curriculumCourseService.isSubjectInCurriculum(curriculumId, req.body.subjectCode);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Môn học đã tồn tại trong khung chương trình',
      });
    }

    const course = await curriculumCourseService.addCourseToSemester(req.params.semesterId, req.body);
    res.status(201).json({
      success: true,
      message: 'Course added successfully',
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const course = await curriculumCourseService.updateCourse(req.params.courseId, req.body);
    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    await curriculumCourseService.deleteCourse(req.params.courseId);
    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Move course to another semester
exports.moveCourse = async (req, res) => {
  try {
    const { newSemesterId } = req.body;
    const course = await curriculumCourseService.moveCourseToSemester(req.params.courseId, newSemesterId);
    res.json({
      success: true,
      message: 'Course moved successfully',
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Legacy endpoints (backward compatibility)
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
