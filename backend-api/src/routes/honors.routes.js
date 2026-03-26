// honors.routes.js
// Định tuyến các API liên quan đến danh sách ngoài ra sinh viên xuất sắc

const express = require('express');
const router = express.Router();

const honorsController = require('../controllers/honors.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

/**
 * GET /api/honors/honor-roll
 * Lấy danh sách sinh viên xuất sắc theo kỳ học
 * Query: semesterId | semesterCode | academicYear
 * Auth: Admin only
 */
router.get(
  '/honor-roll',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  honorsController.getHonorRoll
);

/**
 * GET /api/honors/semesters
 * Lấy danh sách tất cả các kỳ học
 * Auth: Admin only
 */
router.get(
  '/semesters',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  honorsController.getAllSemesters
);

module.exports = router;
