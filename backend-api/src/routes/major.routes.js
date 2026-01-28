const express = require('express');
const majorController = require('../controllers/major.controller');

const router = express.Router();

// GET /api/majors/export - Phải đặt trước /:id
router.get('/export', majorController.exportMajors);

// GET /api/majors
router.get('/', majorController.getMajors);

// GET /api/majors/:id
router.get('/:id', majorController.getMajorById);

// POST /api/majors
router.post('/', majorController.createMajor);

// PUT /api/majors/:id
router.put('/:id', majorController.updateMajor);

// DELETE /api/majors/:id
router.delete('/:id', majorController.deleteMajor);

module.exports = router;
