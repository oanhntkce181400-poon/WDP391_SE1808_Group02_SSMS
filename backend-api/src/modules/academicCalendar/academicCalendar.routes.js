const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const ctrl = require('./academicCalendar.controller');

const router = Router();

const ADMIN_STAFF = rbacMiddleware(['admin', 'staff', 'academic-admin']);

router.get('/', authMiddleware, ctrl.listEvents);
router.post('/', authMiddleware, ADMIN_STAFF, ctrl.createEvent);
router.patch('/:id', authMiddleware, ADMIN_STAFF, ctrl.updateEvent);
router.delete('/:id', authMiddleware, ADMIN_STAFF, ctrl.deleteEvent);

module.exports = router;
