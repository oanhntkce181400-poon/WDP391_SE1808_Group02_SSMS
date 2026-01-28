const express = require('express');
const router = express.Router();
const majorController = require('../controllers/major.controller');

router.get('/', majorController.getMajors);

module.exports = router;
