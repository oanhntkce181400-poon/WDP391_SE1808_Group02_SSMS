const express = require('express');
const router = express.Router();
const countdownController = require('../controllers/countdown.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Student route - get own countdown
router.get('/countdown', authMiddleware, countdownController.getFeeCountdown);

// Admin route - get all deadlines
router.get('/countdown/all', authMiddleware, rbacMiddleware(['admin', 'staff']), countdownController.getAllDeadlines);

module.exports = router;
