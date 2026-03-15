const express = require('express');
const registrationController = require('../controllers/registration.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Student Registration Routes
 * Các endpoint validation cho đăng ký học phần
 */

// UC43 - Validate Prerequisites
// POST /api/registrations/validate
router.post(
  '/validate',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validatePrerequisites
);

// UC40 - Validate Class Capacity
// POST /api/registrations/validate-capacity
router.post(
  '/validate-capacity',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateClassCapacity
);

// UC33 - Validate Wallet Balance
// POST /api/registrations/validate-wallet
router.post(
  '/validate-wallet',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateWallet
);

// Combined validation endpoint
// POST /api/registrations/validate-all
router.post(
  '/validate-all',
  authMiddleware,
  rbacMiddleware(['student']),
  registrationController.validateAll
);

// UC44 - Check Pending Tuition (kiểm tra nợ học phí)
// GET /api/registrations/check-pending-tuition?semesterId=...
router.get(
  '/check-pending-tuition',
  authMiddleware,
  rbacMiddleware(['student']),
  async (req, res) => {
    try {
      const paymentValidation = require('../services/paymentValidation.service');
      const studentService = require('../services/student.service');
      const userId = req.auth.sub;
      const { semesterId } = req.query;
      
      if (!semesterId) {
        return res.status(400).json({ success: false, message: 'Thiếu semesterId' });
      }
      
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Sinh viên không tìm thấy' });
      }
      
      const result = await paymentValidation.checkPendingTuition(student._id, semesterId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
