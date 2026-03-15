const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const financeController = require('../controllers/finance.controller');

router.get(
  '/tuition/me',
  authMiddleware,
  financeController.getMyTuitionSummary,
);

// Xác nhận thanh toán PayOS và lưu vào DB
router.post(
  '/payments/confirm',
  authMiddleware,
  financeController.confirmPayment,
);

// Lấy lịch sử thanh toán của sinh viên
router.get(
  '/payments/history',
  authMiddleware,
  financeController.getPaymentHistory,
);

// Tổng hợp thanh toán của tất cả sinh viên (admin)
router.get(
  '/payments/all-students',
  authMiddleware,
  financeController.getAllStudentsPaymentSummary,
);

// Lấy trạng thái thanh toán theo kỳ của khung chương trình
router.get(
  '/payments/curriculum-status',
  authMiddleware,
  financeController.getMyCurriculumPaymentStatus,
);

// Tạo thanh toán theo kỳ của khung chương trình
router.post(
  '/payments/create-curriculum',
  authMiddleware,
  financeController.createCurriculumPayment,
);

// Xác nhận thanh toán và tự động đăng ký môn học
router.post(
  '/payments/confirm-with-enrollment',
  authMiddleware,
  financeController.confirmPaymentWithEnrollment,
);

// Số tiền nộp thừa học phí (để chuyển vào ví)
router.get(
  '/tuition-excess',
  authMiddleware,
  financeController.getTuitionExcess,
);

// ─────────────────────────────────────────────────────────────
// NEW: Tuition Auto Service Routes
// ─────────────────────────────────────────────────────────────

// Tính học phí cho sinh viên hiện tại theo kỳ
router.post(
  '/tuition/calculate',
  authMiddleware,
  async (req, res) => {
    try {
      const tuitionAuto = require('../services/tuitionAuto.service');
      const userId = req.auth.sub;
      
      const studentService = require('../services/student.service');
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Sinh viên không tìm thấy' });
      }
      
      const semesterId = req.body.semesterId;
      if (!semesterId) {
        return res.status(400).json({ success: false, message: 'Thiếu semesterId' });
      }
      
      const bill = await tuitionAuto.calculateTuitionByCurriculum(student._id, semesterId);
      return res.status(200).json({ success: true, data: bill });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Admin: Tạo học phí cho tất cả sinh viên trong kỳ
router.post(
  '/tuition/generate/:semesterId',
  authMiddleware,
  async (req, res) => {
    try {
      const tuitionAuto = require('../services/tuitionAuto.service');
      const { semesterId } = req.params;
      
      const result = await tuitionAuto.generateAllTuitionForSemester(semesterId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Lấy bill học phí của sinh viên theo kỳ
router.get(
  '/tuition/bill/:semesterId',
  authMiddleware,
  async (req, res) => {
    try {
      const tuitionAuto = require('../services/tuitionAuto.service');
      const studentService = require('../services/student.service');
      const userId = req.auth.sub;
      const { semesterId } = req.params;
      
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Sinh viên không tìm thấy' });
      }
      
      const bill = await tuitionAuto.getTuitionBill(student._id, semesterId);
      return res.status(200).json({ success: true, data: bill });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Lấy tất cả bills của sinh viên
router.get(
  '/tuition/bills',
  authMiddleware,
  async (req, res) => {
    try {
      const tuitionAuto = require('../services/tuitionAuto.service');
      const studentService = require('../services/student.service');
      const userId = req.auth.sub;
      const { status } = req.query;
      
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Sinh viên không tìm thấy' });
      }
      
      const bills = await tuitionAuto.getStudentTuitionBills(student._id, { status });
      return res.status(200).json({ success: true, data: bills });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
);

module.exports = router;
