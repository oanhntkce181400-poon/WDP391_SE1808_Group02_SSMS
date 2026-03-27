/**
 * Email Service - Nodemailer implementation
 * Sử dụng SMTP đã cấu hình trong .env
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

class EmailService {
  constructor() {
    this.fromName = process.env.MAIL_FROM_NAME || 'SchoolSys';
    this.fromEmail = process.env.MAIL_FROM_EMAIL || 'noreply@schoolsys.com';
    this.enabled = process.env.MAIL_ENABLED === 'true';
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder({ to, studentName, amount, deadline, message }) {
    const deadlineStr = deadline
      ? new Date(deadline).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Chưa có hạn';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1A237E; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { padding: 32px 24px; color: #333; }
    .amount-box { background: #FFF3E0; border-left: 4px solid #FF9800; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .amount { font-size: 28px; font-weight: bold; color: #E65100; }
    .deadline { color: #666; margin-top: 8px; }
    .message { background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 20px 0; line-height: 1.6; }
    .btn { display: inline-block; background: #1A237E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
    .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏫 Nhắc nhở thanh toán học phí</h1>
    </div>
    <div class="body">
      <p>Xin chào <strong>${studentName}</strong>,</p>
      <p>Hệ thống phát hiện bạn có khoản học phí chưa thanh toán. Vui lòng kiểm tra và thanh toán sớm để tránh ảnh hưởng đến việc học tập.</p>

      <div class="amount-box">
        <div class="amount">${Number(amount).toLocaleString('vi-VN')} đ</div>
        <div class="deadline">⏰ Hạn thanh toán: <strong>${deadlineStr}</strong></div>
      </div>

      ${message ? `<div class="message">${message}</div>` : ''}

      <p>Vui lòng đăng nhập vào hệ thống SSMS để xem chi tiết và thực hiện thanh toán:</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/finance" class="btn">Thanh toán ngay</a>

      <p style="margin-top: 24px; color: #666; font-size: 13px;">Nếu bạn đã thanh toán, vui lòng bỏ qua email này hoặc liên hệ phòng tài chính để xác nhận.</p>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống SSMS.</p>
      <p>© ${new Date().getFullYear()} SchoolSys - Trường Đại học FPT</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `Nhắc nhở thanh toán học phí

Xin chào ${studentName},

Hệ thống phát hiện bạn có khoản học phí chưa thanh toán.

Số tiền: ${Number(amount).toLocaleString('vi-VN')} đ
Hạn thanh toán: ${deadlineStr}

${message ? `Tin nhắn: ${message}` : ''}

Vui lòng đăng nhập hệ thống SSMS để thanh toán.
${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/finance

Email tự động từ hệ thống SSMS - Trường Đại học FPT`;

    return this.sendEmail({
      to,
      subject: `🏫 Nhắc nhở: Thanh toán ${Number(amount).toLocaleString('vi-VN')} đ học phí`,
      body: textContent,
      html: htmlContent,
    });
  }

  /**
   * Send general email
   */
  async sendEmail({ to, subject, body, html }) {
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject,
      text: body,
      html: html || body,
    };

    if (!this.enabled) {
      console.log(`[EMAIL] (disabled) Sending to: ${to}`);
      console.log(`  Subject: ${subject}`);
      return { success: true, messageId: `DISABLED_${Date.now()}`, to, timestamp: new Date() };
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] ✅ Sent to: ${to}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        to,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[EMAIL] ❌ Failed to send to: ${to}`);
      console.error(`  Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, { subject, body }) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({ to: recipient, subject, body });
        results.push({ email: recipient, status: 'sent', ...result });
      } catch (error) {
        results.push({ email: recipient, status: 'failed', error: error.message });
      }
    }
    return results;
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await transporter.verify();
      console.log('[EMAIL] ✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error(`[EMAIL] ❌ SMTP connection failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EmailService();
