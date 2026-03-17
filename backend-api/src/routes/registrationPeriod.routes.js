// registrationPeriod.routes.js
// Routes cho Registration Period API

const express = require('express');
const registrationPeriodController = require('../controllers/registrationPeriod.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// ROUTE CHO SINH VIÊN: CHECK REGISTRATION PERIOD THEO LOẠI ĐƠN
// ─────────────────────────────────────────────────────────────
// GET /api/registration-periods/check-request
// Chỉ cần login và role = student
router.get(
	'/check-request',
	authMiddleware,
	rbacMiddleware(['student']),
	registrationPeriodController.checkRequestRegistrationOpen,
);

router.get(
	'/open-request-types',
	authMiddleware,
	rbacMiddleware(['student']),
	registrationPeriodController.getOpenRequestTypes,
);

// GET /api/registration-periods/current - Cho tất cả user đã đăng nhập
router.get('/current', authMiddleware, registrationPeriodController.getCurrentPeriod);

// ─────────────────────────────────────────────────────────────
// CÁC ROUTE CÒN LẠI: CHỈ DÀNH CHO ADMIN / STAFF
// ─────────────────────────────────────────────────────────────
router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));

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
