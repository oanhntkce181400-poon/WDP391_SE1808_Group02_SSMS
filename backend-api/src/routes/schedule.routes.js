// schedule.routes.js
// Định nghĩa các route cho lịch học
// Tác giả: HuyHM - Feature/HuyHMSpring2

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const scheduleController = require('../controllers/schedule.controller');

// GET /api/schedules/me?weekStart=2026-02-16
// Lấy lịch học tuần của sinh viên đang đăng nhập
// Cần token hợp lệ (authMiddleware kiểm tra)
router.get('/me', authMiddleware, scheduleController.getMyWeekSchedule);

module.exports = router;
