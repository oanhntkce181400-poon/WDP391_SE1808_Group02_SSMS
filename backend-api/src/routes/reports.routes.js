// reports.routes.js
// Routes cho Reports API
// Tác giả: Group02 - WDP391

const express = require('express');
const reportsController = require('../controllers/reports.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// ANALYTICS ROUTES (/api/reports/*)
// ─────────────────────────────────────────────────────────────

// GET /api/reports/grade-distribution
// Lấy báo cáo phân bố điểm
// Query params: semester, academicYear, classSection, major
router.get(
  '/grade-distribution',
  authMiddleware,
  reportsController.getGradeDistribution
);

module.exports = router;
