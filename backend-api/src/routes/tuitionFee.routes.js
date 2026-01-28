// Tuition Fee Routes
const express = require('express');
const router = express.Router();
const tuitionFeeController = require('../controllers/tuitionFee.controller');

// Lấy danh sách học phí
router.get('/', tuitionFeeController.getTuitionFees);

// Lấy summary theo cohort
router.get('/summary', tuitionFeeController.getSummaryByCohort);

// Lấy chi tiết học phí
router.get('/:id', tuitionFeeController.getTuitionFeeById);

// Tạo học phí mới
router.post('/', tuitionFeeController.createTuitionFee);

// Cập nhật học phí
router.put('/:id', tuitionFeeController.updateTuitionFee);

// Thêm discount
router.post('/:id/discounts', tuitionFeeController.addDiscount);

// Xóa discount
router.delete('/:id/discounts/:discountId', tuitionFeeController.removeDiscount);

// Xóa học phí
router.delete('/:id', tuitionFeeController.deleteTuitionFee);

module.exports = router;
