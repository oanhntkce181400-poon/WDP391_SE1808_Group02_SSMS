const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const controller = require('./teachingSchedule.controller');

const router = Router();

router.get(
  '/teaching-schedule',
  authMiddleware,
  rbacMiddleware(['staff', 'admin', 'lecturer']),
  controller.getTeachingSchedule,
);

module.exports = router;
