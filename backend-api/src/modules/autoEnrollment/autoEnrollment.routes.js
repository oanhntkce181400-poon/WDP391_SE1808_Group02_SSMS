const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const controller = require('./autoEnrollment.controller');

const router = Router();

router.post(
  '/trigger',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.trigger,
);

module.exports = router;
