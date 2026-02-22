// registrationPeriod.routes.js
// Routes cho Registration Period API

const express = require('express');
const registrationPeriodController = require('../controllers/registrationPeriod.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// Tất cả routes đều cần authentication và admin/staff role
router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));

// GET /api/registration-periods/current - Lấy đợt đăng ký hiện tại
router.get('/current', registrationPeriodController.getCurrentPeriod);

// POST /api/registration-periods - Tạo đợt đăng ký mới
router.post('/', registrationPeriodController.createPeriod);

// GET /api/registration-periods - Lấy danh sách
router.get('/', registrationPeriodController.getPeriods);

// GET /api/registration-periods/:id - Lấy chi tiết
router.get('/:id', registrationPeriodController.getPeriodById);

// PUT /api/registration-periods/:id - Cập nhật
router.put('/:id', registrationPeriodController.updatePeriod);

// PATCH /api/registration-periods/:id/status - Toggle trạng thái
router.patch('/:id/status', registrationPeriodController.toggleStatus);

// DELETE /api/registration-periods/:id - Xóa
router.delete('/:id', registrationPeriodController.deletePeriod);

module.exports = router;
