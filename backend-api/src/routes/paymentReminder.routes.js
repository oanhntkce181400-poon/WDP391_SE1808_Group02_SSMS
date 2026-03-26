const express = require('express');
const router = express.Router();
const paymentReminderController = require('../controllers/paymentReminder.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// All routes require admin/staff role
router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));

router.get('/students-with-outstanding-fees', paymentReminderController.getStudentsWithOutstandingFees);
router.post('/send', paymentReminderController.sendReminders);
router.get('/history', paymentReminderController.getReminderHistory);

module.exports = router;
