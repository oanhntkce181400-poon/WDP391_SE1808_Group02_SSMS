// Curriculum Routes - Define API endpoints for Curriculum
const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculum.controller');

// Get all curriculums
router.get('/', curriculumController.getCurriculums);

// Get single curriculum by ID
router.get('/:id', curriculumController.getCurriculumById);

// Get curriculum semesters
router.get('/:id/semesters', curriculumController.getCurriculumSemesters);

// Create new curriculum
router.post('/', curriculumController.createCurriculum);

// Update curriculum semesters
router.put('/:id/semesters', curriculumController.updateCurriculumSemesters);

// Update existing curriculum
router.put('/:id', curriculumController.updateCurriculum);

// Delete curriculum
router.delete('/:id', curriculumController.deleteCurriculum);

module.exports = router;

