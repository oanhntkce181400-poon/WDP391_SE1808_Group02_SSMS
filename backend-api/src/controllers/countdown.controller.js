const RegistrationPeriod = require('../models/registrationPeriod.model');
const TuitionBill = require('../models/tuitionBill.model');
const Student = require('../models/student.model');
const financeService = require('../services/finance.service');
const paymentValidation = require('../services/paymentValidation.service');

/**
 * @route   GET /api/finance/countdown
 * @desc    Lấy thông tin countdown deadline thanh toán
 * @access  Private
 */
exports.getFeeCountdown = async (req, res) => {
  try {
    const userId = req.auth.sub;
    
    // Lấy thông tin sinh viên
    const student = await Student.findOne({ userId }).select('_id cohort');
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin sinh viên' 
      });
    }

    const now = new Date();

    // Còn nợ: dựa trên số tiền (totalAmount > paidAmount), không chỉ dựa status.
    // Tránh báo "đã thanh toán" khi bill đang processing/pending nhưng chưa nộp đủ.
    const outstandingFilter = {
      student: student._id,
      status: { $ne: 'cancelled' },
      $expr: { $gt: ['$totalAmount', '$paidAmount'] },
    };

    const outstandingBill = await TuitionBill.findOne(outstandingFilter)
      .sort({ dueDate: 1 })
      .select('totalAmount paidAmount dueDate semesterCode status');

    // Trang /student/finance dùng học phí kỳ khung (getCurriculumPaymentStatus / ví) — mã Payment là K{n}_CURRICULUM.
    // getMyTuitionSummary() theo học kỳ hệ thống (semester.code) nên có thể vẫn báo còn nợ dù đã nộp đủ qua ví.
    let semPay = null;
    try {
      semPay = await paymentValidation.checkSemesterPaymentRequirement(student._id);
    } catch (semErr) {
      console.error('getFeeCountdown curriculum payment:', semErr.message);
    }
    const curriculumHasPaid = !!(semPay && semPay.hasPaid);

    // Luồng học phí trên trang Học phí dùng Payment + tổng tín chỉ (finance.service),
    // có thể không có TuitionBill hoặc bill chưa đồng bộ → không được coi là "đã thanh toán"
    // chỉ vì không tìm thấy bill nợ.
    let financeRemaining = 0;
    let financeSummaryOk = false;
    try {
      const summary = await financeService.getMyTuitionSummary(userId);
      financeRemaining = Math.max(0, Number(summary?.remainingDebt) || 0);
      financeSummaryOk = true;
    } catch (financeErr) {
      console.error('getFeeCountdown finance summary:', financeErr.message);
    }

    const billDebt = outstandingBill
      ? Math.max(0, (outstandingBill.totalAmount || 0) - (outstandingBill.paidAmount || 0))
      : 0;
    // Đồng bộ với trang Học phí: khi tóm tắt Payment + tín chỉ báo hết nợ thì coi như đã thanh toán,
    // không để TuitionBill chưa đồng bộ làm banner "còn nợ" / countdown sai.
    let hasDebt = financeSummaryOk ? financeRemaining > 0 : billDebt > 0;
    let totalOutstanding = financeSummaryOk ? financeRemaining : billDebt;
    if (curriculumHasPaid) {
      hasDebt = false;
      totalOutstanding = 0;
    }

    // Cùng logic trang /student/payment: hạn học phí theo kỳ khung (startDate kỳ) có thể đã quá
    // trong khi đợt đăng ký (RegistrationPeriod) vẫn còn → không hiển thị countdown “còn X giờ” sai.
    let curriculumPaymentLapsed = !!(semPay && semPay.mustPay && semPay.isOverdue);

    // Thanh toán qua ví / mã kỳ khác với semesterCode khung — tóm tắt học phí đã 0 thì không ép cảnh báo quá hạn khung.
    if (curriculumPaymentLapsed && financeSummaryOk && financeRemaining === 0) {
      curriculumPaymentLapsed = false;
    }

    if (curriculumPaymentLapsed) {
      return res.json({
        success: true,
        data: {
          hasUpcomingDeadline: false,
          status: 'curriculum_payment_lapsed',
          message:
            'Bạn đã không thanh toán học phí đúng hạn nên hiện không được xếp lớp. Vui lòng kiểm tra và theo dõi kỳ đăng ký mới được mở để đăng ký học lại.',
          outstandingAmount: totalOutstanding,
        },
      });
    }

    if (!hasDebt) {
      return res.json({
        success: true,
        data: {
          hasUpcomingDeadline: false,
          status: 'paid',
          message: 'Bạn đã thanh toán tất cả học phí!',
        },
      });
    }

    // Tìm registration period với deadline trong tương lai
    const currentPeriod = await RegistrationPeriod.findOne({
      status: 'active',
      endDate: { $gte: now },
      $or: [
        { allowedCohorts: { $size: 0 } },
        { allowedCohorts: student.cohort },
      ],
    })
      .sort({ endDate: 1 })
      .select('periodName endDate startDate');

    // Có nợ nhưng không có đợt đăng ký / deadline áp dụng
    if (!currentPeriod) {
      return res.json({
        success: true,
        data: {
          hasUpcomingDeadline: false,
          status: 'no_deadline',
          message: 'Bạn còn học phí chưa thanh toán. Vui lòng xem chi tiết tại mục Học phí.',
          outstandingAmount: totalOutstanding,
        },
      });
    }

    // Tính thời gian còn lại
    const timeRemaining = currentPeriod.endDate - now;
    const isOverdue = timeRemaining < 0;
    const isUrgent = timeRemaining > 0 && timeRemaining <= (3 * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      data: {
        hasUpcomingDeadline: true,
        deadline: {
          date: currentPeriod.endDate,
          formattedDate: new Date(currentPeriod.endDate).toLocaleDateString('vi-VN'),
          periodName: currentPeriod.periodName
        },
        timeRemaining: {
          days: Math.floor(Math.abs(timeRemaining) / (1000 * 60 * 60 * 24)),
          hours: Math.floor((Math.abs(timeRemaining) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((Math.abs(timeRemaining) % (1000 * 60 * 60)) / (1000 * 60)),
          isUrgent
        },
        status: isOverdue ? 'overdue' : 'active',
        outstandingAmount: totalOutstanding,
      }
    });
  } catch (error) {
    console.error('getFeeCountdown error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể tải thông tin deadline' 
    });
  }
};

/**
 * @route   GET /api/finance/countdown/all
 * @desc    Lấy tất cả deadline (cho admin)
 * @access  Private/Admin
 */
exports.getAllDeadlines = async (req, res) => {
  try {
    const now = new Date();
    
    const periods = await RegistrationPeriod.find({
      endDate: { $gte: now }
    })
    .sort({ endDate: 1 })
    .select('periodName endDate startDate status allowedCohorts');

    res.json({
      success: true,
      data: periods
    });
  } catch (error) {
    console.error('getAllDeadlines error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể tải danh sách deadline' 
    });
  }
};
