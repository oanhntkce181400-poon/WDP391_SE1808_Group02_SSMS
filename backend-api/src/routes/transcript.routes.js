const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcript.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Student routes - own transcript
router.get('/transcript/preview', authMiddleware, transcriptController.previewTranscript);
router.get('/transcript/generate', authMiddleware, transcriptController.generateTranscript);

// Admin/Staff routes - any student
router.get('/transcript/preview/:studentId', authMiddleware, rbacMiddleware(['admin', 'staff']), transcriptController.previewStudentTranscript);
router.get('/transcript/generate/:studentId', authMiddleware, rbacMiddleware(['admin', 'staff']), transcriptController.generateStudentTranscript);

module.exports = router;
