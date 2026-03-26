const PaymentReminder = require('../models/paymentReminder.model');
const Student = require('../models/student.model');
const TuitionBill = require('../models/tuitionBill.model');
const emailService = require('./email.service');

class PaymentReminderService {
  
  /**
   * Lấy danh sách sinh viên có nợ học phí
   */
  async getStudentsWithOutstandingFees(filters = {}) {
    const { semesterId, majorCode, cohort } = filters;

    // Find unpaid bills
    const bills = await TuitionBill.find({
      $expr: { $gt: ['$totalAmount', '$paidAmount'] },
      status: { $in: ['pending', 'overdue'] }
    })
    .populate('student', 'studentCode fullName majorCode cohort email phone userId')
    .populate('semester', 'code name');

    // Group by student
    const studentMap = new Map();
    
    bills.forEach(bill => {
      const studentId = bill.student._id.toString();
      
      // Apply filters
      if (majorCode && bill.student.majorCode !== majorCode) return;
      if (cohort && bill.student.cohort !== cohort) return;
      if (semesterId && bill.semester?._id.toString() !== semesterId) return;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: bill.student._id,
          studentCode: bill.student.studentCode,
          fullName: bill.student.fullName,
          email: bill.student.email,
          phone: bill.student.phone,
          majorCode: bill.student.majorCode,
          cohort: bill.student.cohort,
          totalOutstanding: bill.totalAmount - bill.paidAmount,
          billsCount: 1,
          latestDueDate: bill.dueDate
        });
      } else {
        const existing = studentMap.get(studentId);
        existing.totalOutstanding += bill.totalAmount - bill.paidAmount;
        existing.billsCount++;
        if (bill.dueDate > existing.latestDueDate) {
          existing.latestDueDate = bill.dueDate;
        }
      }
    });

    return Array.from(studentMap.values());
  }

  /**
   * Kiểm tra có thể gửi reminder không (prevent spam - 24h)
   */
  async canSendReminder(studentId) {
    const lastReminder = await PaymentReminder.findOne({
      student: studentId,
      status: 'sent'
    }).sort({ sentAt: -1 });

    if (!lastReminder) return { canSend: true };

    const hoursSinceLastReminder = (Date.now() - lastReminder.sentAt) / (1000 * 60 * 60);
    
    if (hoursSinceLastReminder < 24) {
      return { 
        canSend: false, 
        hoursRemaining: Math.ceil(24 - hoursSinceLastReminder)
      };
    }

    return { canSend: true };
  }

  /**
   * Gửi reminder cho một sinh viên
   */
  async sendReminder(studentId, options = {}) {
    const { type = 'all', template = 'default', customMessage, sentBy } = options;
    
    const student = await Student.findById(studentId).populate('userId');
    if (!student) throw new Error('Không tìm thấy sinh viên');

    const user = student.userId;
    
    // Get unpaid bills
    const unpaidBills = await TuitionBill.find({
      student: studentId,
      $expr: { $gt: ['$totalAmount', '$paidAmount'] }
    });

    const totalOutstanding = unpaidBills.reduce(
      (sum, bill) => sum + (bill.totalAmount - bill.paidAmount), 
      0
    );

    // Create reminder record
    const reminder = new PaymentReminder({
      student: studentId,
      semester: unpaidBills[0]?.semester,
      reminderType: type,
      template,
      customMessage,
      sentBy,
      status: 'pending'
    });

    const results = { email: 'skipped', sms: 'skipped', inapp: 'skipped' };

    try {
      const messageContent = customMessage || this.generateMessage(student, totalOutstanding, unpaidBills[0]?.dueDate);

      // Send Email
      if (['email', 'all'].includes(type) && user?.email) {
        try {
          await emailService.sendPaymentReminder({
            to: user.email,
            studentName: student.fullName,
            amount: totalOutstanding,
            deadline: unpaidBills[0]?.dueDate,
            message: messageContent
          });
          results.email = 'sent';
        } catch (error) {
          results.email = 'failed';
        }
      }

      // Send SMS (mock - integrate SMS gateway)
      if (['sms', 'all'].includes(type) && user?.phone) {
        try {
          await this.sendSMS(user.phone, messageContent);
          results.sms = 'sent';
        } catch (error) {
          results.sms = 'failed';
        }
      }

      // Send In-app notification via Socket.IO
      if (['inapp', 'all'].includes(type)) {
        try {
          const io = require('../configs/socket.config').getIO();
          io.to(user._id.toString()).emit('notification', {
            type: 'payment_reminder',
            title: 'Nhắc nhở thanh toán học phí',
            message: messageContent,
            data: { amount: totalOutstanding }
          });
          results.inapp = 'sent';
        } catch (error) {
          results.inapp = 'failed';
        }
      }

      reminder.status = 'sent';
      reminder.sentAt = new Date();
      reminder.results = results;
      await reminder.save();

      return { success: true, reminder, results };
    } catch (error) {
      reminder.status = 'failed';
      reminder.errorMessage = error.message;
      await reminder.save();
      throw error;
    }
  }

  /**
   * Gửi batch reminders
   */
  async sendBatchReminders(studentIds, options = {}) {
    const results = {
      total: studentIds.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    for (const studentId of studentIds) {
      try {
        // Check spam prevention
        const canSend = await this.canSendReminder(studentId);
        if (!canSend.canSend) {
          results.skipped++;
          results.details.push({
            studentId,
            status: 'skipped',
            reason: `Đã gửi reminder cách đây ${24 - canSend.hoursRemaining} giờ`
          });
          continue;
        }

        const result = await this.sendReminder(studentId, options);
        results.sent++;
        results.details.push({
          studentId,
          status: 'sent',
          results: result.results
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          studentId,
          status: 'failed',
          error: error.message
        });
      }

      // Delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Lấy lịch sử reminders
   */
  async getReminderHistory(filters = {}) {
    const { studentId, from, to, status, page = 1, limit = 20 } = filters;
    
    const query = {};
    if (studentId) query.student = studentId;
    if (status) query.status = status;
    if (from || to) {
      query.sentAt = {};
      if (from) query.sentAt.$gte = new Date(from);
      if (to) query.sentAt.$lte = new Date(to);
    }

    const [reminders, total] = await Promise.all([
      PaymentReminder.find(query)
        .populate('student', 'studentCode fullName')
        .populate('sentBy', 'fullName email')
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      PaymentReminder.countDocuments(query)
    ]);

    return {
      reminders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Tạo nội dung reminder
   */
  generateMessage(student, amount, deadline) {
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
    const formattedDate = deadline ? new Date(deadline).toLocaleDateString('vi-VN') : 'không xác định';
    
    return `Chào ${student.fullName},

Bạn có khoản học phí còn nợ: ${formattedAmount} VND.
Hạn thanh toán: ${formattedDate}.

Vui lòng thanh toán sớm để tránh ảnh hưởng đến việc đăng ký học phần.

Trân trọng,
Phòng Tài chính - Trường Đại học FPT`;
  }

  /**
   * Mock SMS sending
   */
  async sendSMS(phone, message) {
    console.log(`[SMS] To: ${phone}, Message: ${message.substring(0, 50)}...`);
    return { success: true, messageId: `SMS_${Date.now()}` };
  }
}

module.exports = new PaymentReminderService();
