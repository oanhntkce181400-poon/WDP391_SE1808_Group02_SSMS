const express = require('express');
const router = express.Router();
const revenueReportController = require('../controllers/revenueReport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));

router.get('/summary', revenueReportController.getSummary);
router.get('/trend', revenueReportController.getTrend);
router.get('/by-major', revenueReportController.getByMajor);
router.get('/by-payment-method', revenueReportController.getByPaymentMethod);
router.get('/status-distribution', revenueReportController.getStatusDistribution);
router.get('/transactions', revenueReportController.getTransactions);

module.exports = router;
