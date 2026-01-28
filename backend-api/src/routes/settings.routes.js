const express = require('express');
const settingsController = require('../controllers/settings.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/avatarUpload.middleware');

const router = express.Router();

// Get system settings (public)
router.get('/', settingsController.getSettings);

// Update system settings (admin only)
router.patch('/', authMiddleware, upload.single('logo'), settingsController.updateSettings);

module.exports = router;
