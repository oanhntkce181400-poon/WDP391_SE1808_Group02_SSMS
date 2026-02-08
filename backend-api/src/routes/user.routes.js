
const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/avatarUpload.middleware');
const excelUpload = require('../middlewares/excelUpload.middleware');

const router = express.Router();

// Get current user profile (must be before /:userId to match /profile)
router.get('/profile', authMiddleware, userController.getUserProfile);

// Update user avatar (must be before /:userId to match /avatar)
router.patch('/avatar', authMiddleware, upload.single('avatar'), userController.updateAvatar);

// Update user profile (must be before /:userId to match /profile)
router.patch('/profile', authMiddleware, userController.updateProfile);

// Import users from Excel (must be before /[userId] pattern)
router.post('/import', authMiddleware, excelUpload.single('file'), userController.importUsers);

// List users (IT Admin)
router.get('/', authMiddleware, userController.listUsers);

// Update user by admin (role, status, block/unblock)
router.patch('/:userId', authMiddleware, userController.updateUser);

// Delete user by admin
router.delete('/:userId', authMiddleware, userController.deleteUser);

module.exports = router;
