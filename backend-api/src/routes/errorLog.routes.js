const express = require('express');
const errorLogController = require('../controllers/errorLog.controller');

const router = express.Router();

// GET /api/error-logs/stats - Phải đặt trước /:id
router.get('/stats', errorLogController.getErrorStats);

// DELETE /api/error-logs/clear
router.delete('/clear', errorLogController.clearOldLogs);

// GET /api/error-logs
router.get('/', errorLogController.getErrorLogs);

// GET /api/error-logs/:id
router.get('/:id', errorLogController.getErrorLogById);

module.exports = router;
