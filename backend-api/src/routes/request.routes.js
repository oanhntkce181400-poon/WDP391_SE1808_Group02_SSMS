const express = require('express');
const requestController = require('../controllers/request.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authMiddleware, requestController.getMyRequests);

router.post('/', authMiddleware, requestController.createRequest);

router.get('/:id', authMiddleware, requestController.getRequestById);

router.put('/:id', authMiddleware, requestController.updateRequest);

router.post('/:id/cancel', authMiddleware, requestController.cancelRequest);

const rbacMiddleware = require('../middlewares/rbac.middleware');

router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  requestController.getAllRequests,
);

router.patch(
  '/:id/review',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  requestController.reviewRequest,
);

module.exports = router;
