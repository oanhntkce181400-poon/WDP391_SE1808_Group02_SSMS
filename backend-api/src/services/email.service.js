/**
 * Email Service - Mock implementation
 * In production, replace with actual email provider (SendGrid, AWS SES, etc.)
 */

class EmailService {
  
  /**
   * Send payment reminder email
   */
  async sendPaymentReminder({ to, studentName, amount, deadline, message }) {
    console.log(`[EMAIL] Sending payment reminder to: ${to}`);
    console.log(`  Student: ${studentName}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Deadline: ${deadline}`);
    console.log(`  Message: ${message?.substring(0, 50)}...`);
    
    // Simulate sending email
    return {
      success: true,
      messageId: `EMAIL_${Date.now()}`,
      to,
      timestamp: new Date()
    };
  }

  /**
   * Send general email
   */
  async sendEmail({ to, subject, body, html }) {
    console.log(`[EMAIL] Sending email to: ${to}`);
    console.log(`  Subject: ${subject}`);
    
    return {
      success: true,
      messageId: `EMAIL_${Date.now()}`,
      to,
      timestamp: new Date()
    };
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, { subject, body }) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient,
          subject,
          body
        });
        results.push({ email: recipient, status: 'sent', ...result });
      } catch (error) {
        results.push({ email: recipient, status: 'failed', error: error.message });
      }
    }
    return results;
  }
}

module.exports = new EmailService();
