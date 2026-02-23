const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const financeController = require('../controllers/finance.controller');

router.get(
  '/tuition/me',
  authMiddleware,
  financeController.getMyTuitionSummary,
);

module.exports = router;
