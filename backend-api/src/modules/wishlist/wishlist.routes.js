const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const rbacMiddleware = require('../../middlewares/rbac.middleware');
const ctrl = require('./wishlist.controller');

const router = Router();

const STUDENT_ONLY = rbacMiddleware(['student']);
const ADMIN_STAFF = rbacMiddleware(['admin', 'staff', 'academic-admin']);

router.post('/', authMiddleware, STUDENT_ONLY, ctrl.createWishlist);
router.get('/my-wishlist', authMiddleware, STUDENT_ONLY, ctrl.getMyWishlist);
router.get('/semester/:semesterId/breakdown', authMiddleware, STUDENT_ONLY, ctrl.getMySemesterBreakdown);
router.get('/semester/:semesterId', authMiddleware, ADMIN_STAFF, ctrl.getWishlistBySemester);
router.patch('/:id/approve', authMiddleware, ADMIN_STAFF, ctrl.approveWishlist);
router.patch('/:id/reject', authMiddleware, ADMIN_STAFF, ctrl.rejectWishlist);

module.exports = router;
