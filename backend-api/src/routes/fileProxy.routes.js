const express = require('express');
const router = express.Router();
const fileProxyController = require('../controllers/fileProxy.controller');

/**
 * @route GET /api/file-proxy/download
 * @desc Proxy download file from Cloudinary with custom filename
 * @query url - Cloudinary file URL
 * @query filename - Desired filename for download
 * @access Public
 */
router.get('/download', fileProxyController.downloadFile);

module.exports = router;
