const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');

// Routes for Subject CRUD
router.post('/', subjectController.createSubject);
router.get('/', subjectController.getSubjects);
router.get('/search', subjectController.searchSubjects);
router.get('/:id', subjectController.getSubjectById);
router.put('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

// Routes for Prerequisites
router.get('/:id/prerequisites', subjectController.getPrerequisites);
router.put('/:id/prerequisites', subjectController.updatePrerequisites);

module.exports = router;

