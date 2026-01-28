const express = require('express');
const router = express.Router();
const majorController = require('../controllers/major.controller');

router.get('/', majorController.getMajors);
router.post('/', majorController.createMajor);
router.put('/:id', majorController.updateMajor);
router.delete('/:id', majorController.deleteMajor);
router.get('/export', majorController.exportMajors);

module.exports = router;
