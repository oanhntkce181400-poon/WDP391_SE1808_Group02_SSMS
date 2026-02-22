const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');

router.get('/', facultyController.getFaculties);
router.post('/', facultyController.createFaculty);
router.put('/:id', facultyController.updateFaculty);
router.delete('/:id', facultyController.deleteFaculty);
router.get('/export', facultyController.exportFaculties);

module.exports = router;
