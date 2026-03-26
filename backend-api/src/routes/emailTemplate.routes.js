const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
const emailTemplateController = require('../controllers/emailTemplate.controller');

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.getEmailTemplates,
);

router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.getEmailTemplateById,
);

router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.createEmailTemplate,
);

router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.updateEmailTemplate,
);

router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.updateEmailTemplate,
);

router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  emailTemplateController.deleteEmailTemplate,
);

module.exports = router;
