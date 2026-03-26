const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const pushTokenController = require('../controllers/pushToken.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/register', pushTokenController.register);
router.post('/unregister', pushTokenController.unregister);

module.exports = router;
