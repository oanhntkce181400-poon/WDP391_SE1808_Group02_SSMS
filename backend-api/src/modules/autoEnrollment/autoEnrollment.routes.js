const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const controller = require('./autoEnrollment.controller');

const router = Router();

// Endpoint này dùng cho admin/staff kích hoạt batch auto-enrollment cho một học kỳ.
// Đây là điểm vào từ FE/Admin Dashboard trước khi luồng chuyển sang controller -> service.
router.post(
  '/trigger',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.trigger,
);

module.exports = router;
