const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const scheduleController = require('../controllers/schedule.controller');

router.get('/my', authMiddleware, scheduleController.getMyWeekSchedule);
router.get('/me', authMiddleware, scheduleController.getMyWeekSchedule);

module.exports = router;
