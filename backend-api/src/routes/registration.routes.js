const express = require('express');
const registrationController = require('../controllers/registration.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Student Registration Routes
 * Các endpoint validation cho đăng ký học phần
 */

// UC43 - Validate Prerequisites
// POST /api/registrations/validate
router.post(
  '/validate',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validatePrerequisites
);

// UC40 - Validate Class Capacity
// POST /api/registrations/validate-capacity
router.post(
  '/validate-capacity',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateClassCapacity
);

// UC33 - Validate Wallet Balance
// POST /api/registrations/validate-wallet
router.post(
  '/validate-wallet',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateWallet
);

// Combined validation endpoint
// POST /api/registrations/validate-all
router.post(
  '/validate-all',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateAll
);

module.exports = router;
