// Curriculum Routes - Define API endpoints for Curriculum
const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculum.controller');

// ========== Curriculum CRUD ==========

// Get all curriculums
router.get('/', curriculumController.getCurriculums);

// Get single curriculum by ID
router.get('/:id', curriculumController.getCurriculumById);

// Get curriculum with all semesters and courses (new relational structure)
router.get('/:id/details', curriculumController.getCurriculumWithDetails);

// Create new curriculum
router.post('/', curriculumController.createCurriculum);

// Update existing curriculum
router.put('/:id', curriculumController.updateCurriculum);

// Delete curriculum
router.delete('/:id', curriculumController.deleteCurriculum);

// ========== Legacy Semester Endpoints (Backward Compatibility) ==========

// Get curriculum semesters (old embedded structure)
router.get('/:id/semesters', curriculumController.getCurriculumSemesters);

// Update curriculum semesters (old embedded structure)
router.put('/:id/semesters', curriculumController.updateCurriculumSemesters);

// ========== NEW RELATIONAL STRUCTURE ENDPOINTS ==========

// ----- Semester Routes -----

// Get all semesters for a curriculum
router.get('/:curriculumId/semesters/list', curriculumController.getSemesters);

// Get single semester with courses
router.get('/semesters/:semesterId', curriculumController.getSemesterById);

// Create new semester
router.post('/:curriculumId/semesters', curriculumController.createSemester);

// Update semester
router.put('/semesters/:semesterId', curriculumController.updateSemester);

// Delete semester
router.delete('/semesters/:semesterId', curriculumController.deleteSemester);

// Reorder semesters (drag-drop)
router.put('/:curriculumId/semesters/reorder', curriculumController.reorderSemesters);

// ----- Course Routes -----

// Get all courses for a semester
router.get('/semesters/:semesterId/courses', curriculumController.getCourses);

// Add course to semester
router.post('/:curriculumId/semesters/:semesterId/courses', curriculumController.addCourse);

// Update course
router.put('/courses/:courseId', curriculumController.updateCourse);

// Delete course
router.delete('/courses/:courseId', curriculumController.deleteCourse);

// Move course to another semester
router.put('/courses/:courseId/move', curriculumController.moveCourse);

module.exports = router;
