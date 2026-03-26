const paymentReminderService = require('../services/paymentReminder.service');

/**
 * @route   GET /api/payment-reminders/students-with-outstanding-fees
 * @desc    Lấy danh sách sinh viên có nợ
 * @access  Private/Admin
 */
exports.getStudentsWithOutstandingFees = async (req, res) => {
  try {
    const { semesterId, majorCode, cohort } = req.query;
    
    const students = await paymentReminderService.getStudentsWithOutstandingFees({
      semesterId, majorCode, cohort
    });
    
    res.json({
      success: true,
      data: {
        count: students.length,
        students
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/payment-reminders/send
 * @desc    Gửi reminders
 * @access  Private/Admin
 */
exports.sendReminders = async (req, res) => {
  try {
    const { studentIds, type, template, customMessage } = req.body;
    const sentBy = req.auth.sub;

    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng chọn ít nhất một sinh viên' 
      });
    }

    if (studentIds.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tối đa 100 sinh viên mỗi lần gửi' 
      });
    }

    const results = await paymentReminderService.sendBatchReminders(studentIds, {
      type: type || 'all',
      template: template || 'default',
      customMessage,
      sentBy
    });

    res.json({
      success: true,
      message: `Đã gửi ${results.sent} reminders, ${results.skipped} bị bỏ qua, ${results.failed} thất bại`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/payment-reminders/history
 * @desc    Lấy lịch sử gửi reminders
 * @access  Private/Admin
 */
exports.getReminderHistory = async (req, res) => {
  try {
    const { studentId, from, to, status, page, limit } = req.query;
    const history = await paymentReminderService.getReminderHistory({
      studentId, from, to, status, page, limit
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
