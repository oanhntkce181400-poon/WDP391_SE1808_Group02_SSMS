const express = require('express');
const router = express.Router();
const performanceReportController = require('../controllers/performanceReport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));

router.get('/overview', performanceReportController.getOverview);
router.get('/gpa-distribution', performanceReportController.getGPADistribution);
router.get('/gpa-by-semester', performanceReportController.getGPABySemester);
router.get('/top-students', performanceReportController.getTopStudents);
router.get('/at-risk-students', performanceReportController.getAtRiskStudents);

module.exports = router;
