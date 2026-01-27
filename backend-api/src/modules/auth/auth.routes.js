const express = require('express');
const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const {
  authLoginLimiter,
  authRefreshLimiter,
  authForgotPasswordLimiter,
  authResetPasswordLimiter,
} = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.post('/google', authLoginLimiter, authController.googleLogin);
router.post('/login', authLoginLimiter, authController.passwordLogin);
router.post('/refresh', authRefreshLimiter, authController.refresh);
router.post('/forgot-password', authForgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authResetPasswordLimiter, authController.resetPassword);

router.use(authMiddleware);

router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.get('/sessions', authController.sessions);
router.post('/sessions/logout-all', authController.logoutAllSessions);
router.post('/sessions/:familyId/revoke', authController.revokeSession);
router.get('/login-history', authController.loginHistory);

module.exports = router;
