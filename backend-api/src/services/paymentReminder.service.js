const PaymentReminder = require('../models/paymentReminder.model');
const Student = require('../models/student.model');
const TuitionBill = require('../models/tuitionBill.model');
const emailService = require('./email.service');
const paymentValidation = require('./paymentValidation.service');

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

    // Luồng học phí trên portal: ví / Payment theo mã kỳ khung — thường không có TuitionBill.
    // Bổ sung SV chưa thanh toán kỳ khung hiện tại (cùng logic trang Học phí).
    if (!semesterId) {
      const studentQuery = { isActive: true, academicStatus: 'enrolled' };
      if (majorCode) studentQuery.majorCode = majorCode;
      if (cohort !== undefined && cohort !== null && String(cohort).trim() !== '') {
        const c = parseInt(String(cohort).replace(/^K/i, ''), 10);
        if (!Number.isNaN(c)) studentQuery.cohort = c;
      }

      const candidates = await Student.find(studentQuery)
        .select('_id studentCode fullName majorCode cohort email phoneNumber userId')
        .lean();

      const CHUNK = 20;
      for (let i = 0; i < candidates.length; i += CHUNK) {
        const chunk = candidates.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (st) => {
            const idStr = st._id.toString();
            if (studentMap.has(idStr)) return;
            try {
              const semPay = await paymentValidation.checkSemesterPaymentRequirement(st._id);
              if (semPay.hasPaid) return;
              const totalOutstanding = semPay.tuitionFee?.finalTuitionFee ?? 0;
              if (totalOutstanding <= 0) return;
              studentMap.set(idStr, {
                studentId: st._id,
                studentCode: st.studentCode,
                fullName: st.fullName,
                email: st.email,
                phone: st.phoneNumber,
                majorCode: st.majorCode,
                cohort: st.cohort,
                totalOutstanding,
                billsCount: 0,
                latestDueDate: semPay.deadline || null,
              });
            } catch (_) {
              /* bỏ qua SV lỗi dữ liệu kỳ học */
            }
          }),
        );
      }
    }

    return Array.from(studentMap.values());
  }

  /**
   * Kiểm tra có thể gửi reminder không (prevent spam)
   * @param {string} studentId
   * @param {object} options
   * @param {boolean} [options.overrideCooldown=false] - Bỏ qua giới hạn thời gian
   */
  async canSendReminder(studentId, options = {}) {
    const { overrideCooldown = false } = options;

    if (overrideCooldown) return { canSend: true };

    const lastReminder = await PaymentReminder.findOne({
      student: studentId,
      status: 'sent'
    }).sort({ sentAt: -1 });

    if (!lastReminder) return { canSend: true };

    const hoursSinceLastReminder = (Date.now() - lastReminder.sentAt) / (1000 * 60 * 60);
    const COOLDOWN_HOURS = parseInt(process.env.PAYMENT_REMINDER_COOLDOWN_HOURS || '24', 10);

    if (hoursSinceLastReminder < COOLDOWN_HOURS) {
      return {
        canSend: false,
        hoursRemaining: Math.ceil(COOLDOWN_HOURS - hoursSinceLastReminder)
      };
    }

    return { canSend: true };
  }

  /**
   * Gửi reminder cho một sinh viên
   */
  async sendReminder(studentId, options = {}) {
    const { type = 'email', template = 'default', customMessage, sentBy } = options;
    
    const student = await Student.findById(studentId).populate('userId');
    if (!student) throw new Error('Không tìm thấy sinh viên');

    const user = student.userId;
    
    // Get unpaid bills
    const unpaidBills = await TuitionBill.find({
      student: studentId,
      $expr: { $gt: ['$totalAmount', '$paidAmount'] }
    });

    let totalOutstanding = unpaidBills.reduce(
      (sum, bill) => sum + (bill.totalAmount - bill.paidAmount),
      0
    );
    let deadline = unpaidBills[0]?.dueDate;

    if (totalOutstanding <= 0) {
      try {
        const semPay = await paymentValidation.checkSemesterPaymentRequirement(studentId);
        if (!semPay.hasPaid) {
          const due = semPay.tuitionFee?.finalTuitionFee ?? 0;
          if (due > 0) {
            totalOutstanding = due;
            deadline = semPay.deadline || deadline;
          }
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (totalOutstanding <= 0) {
      throw new Error('Sinh viên không còn nợ học phí');
    }

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
      const messageContent = customMessage || this.generateMessage(student, totalOutstanding, deadline);

      // Send Email
      if (['email', 'all'].includes(type) && user?.email) {
        try {
          await emailService.sendPaymentReminder({
            to: user.email,
            studentName: student.fullName,
            amount: totalOutstanding,
            deadline,
            message: messageContent
          });
          results.email = 'sent';
        } catch (error) {
          results.email = 'failed';
        }
      }

      // Send SMS (mock - integrate SMS gateway)
      const smsPhone = user?.phone || student.phoneNumber;
      if (['sms', 'all'].includes(type) && smsPhone) {
        try {
          await this.sendSMS(smsPhone, messageContent);
          results.sms = 'sent';
        } catch (error) {
          results.sms = 'failed';
        }
      }

      // Send In-app notification via Socket.IO (room = user:USER_ID, khớp socket.join trong socket.config)
      if (['inapp', 'all'].includes(type)) {
        try {
          const { getIO } = require('../configs/socket.config');
          const io = getIO();
          const uid = user?._id ? String(user._id) : null;
          if (io && uid) {
            if (typeof io.sendToUser === 'function') {
              io.sendToUser(uid, 'notification', {
                type: 'payment_reminder',
                title: 'Nhắc nhở thanh toán học phí',
                message: messageContent,
                data: { amount: totalOutstanding },
                sentAt: new Date().toISOString(),
              });
            } else {
              io.to(`user:${uid}`).emit('notification', {
                type: 'payment_reminder',
                title: 'Nhắc nhở thanh toán học phí',
                message: messageContent,
                data: { amount: totalOutstanding },
                sentAt: new Date().toISOString(),
              });
            }
            results.inapp = 'sent';
          } else {
            results.inapp = user ? 'failed' : 'skipped';
          }
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
        // Check spam prevention (hoặc override nếu admin cho phép)
        const canSend = await this.canSendReminder(studentId, {
          overrideCooldown: options.overrideCooldown,
        });
        if (!canSend.canSend) {
          results.skipped++;
          const skipReason = `Giới hạn ${process.env.PAYMENT_REMINDER_COOLDOWN_HOURS || 24}h: đã gửi nhắc gần đây; thử lại sau khoảng ${canSend.hoursRemaining} giờ nữa.`;
          await PaymentReminder.create({
            student: studentId,
            reminderType: options.type || 'email',
            template: options.template || 'default',
            customMessage: options.customMessage,
            sentBy: options.sentBy,
            status: 'skipped',
            sentAt: new Date(),
            errorMessage: skipReason,
          });
          results.details.push({
            studentId,
            status: 'skipped',
            reason: skipReason,
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
