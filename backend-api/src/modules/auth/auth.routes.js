const express = require('express');
const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;

