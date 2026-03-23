const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// Admin/staff analytics for the web dashboard cards.
router.get(
  '/stats',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  dashboardController.getDashboardStats,
);

module.exports = router;
