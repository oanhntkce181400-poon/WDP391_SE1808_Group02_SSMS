const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const actorsController = require('./actors.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/roles', rbacMiddleware(['actors:read']), actorsController.viewRoles);
router.post('/roles', rbacMiddleware(['actors:write']), actorsController.addRole);
router.patch('/roles/:roleId', rbacMiddleware(['actors:write']), actorsController.updateRole);

router.get(
  '/permissions',
  rbacMiddleware(['actors:read']),
  actorsController.viewPermissions,
);
router.post(
  '/permissions',
  rbacMiddleware(['actors:write']),
  actorsController.addPermission,
);
router.patch(
  '/permissions/:permissionId',
  rbacMiddleware(['actors:write']),
  actorsController.updatePermission,
);

module.exports = router;

