const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
const announcementUpload = require('../middlewares/announcementUpload.middleware');

/**
 * Routes cho Announcement
 */

// ============= STUDENT ROUTES (Public/Student only) =============

// GET /api/announcements/active - Lấy announcements active cho student
// Phải đặt TRƯỚC route /:id để tránh conflict
router.get(
  '/active',
  authMiddleware,
  rbacMiddleware(['student']),
  announcementController.getActiveAnnouncements.bind(announcementController)
);

// ============= ADMIN/STAFF ROUTES =============

// POST /api/announcements - Tạo announcement mới
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  announcementUpload.single('file'), // Upload 1 file với field name 'file'
  announcementController.createAnnouncement.bind(announcementController)
);

// GET /api/announcements - Lấy danh sách announcements (có filter, pagination)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  announcementController.getAnnouncements.bind(announcementController)
);

// GET /api/announcements/:id - Lấy chi tiết một announcement
router.get(
  '/:id',
  authMiddleware,
  announcementController.getAnnouncementById.bind(announcementController)
);

// PUT /api/announcements/:id - Cập nhật announcement
router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  announcementUpload.single('file'), // Upload file mới nếu có
  announcementController.updateAnnouncement.bind(announcementController)
);

// DELETE /api/announcements/:id - Xóa announcement vĩnh viễn (hard delete)
router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  announcementController.deleteAnnouncement.bind(announcementController)
);

module.exports = router;
