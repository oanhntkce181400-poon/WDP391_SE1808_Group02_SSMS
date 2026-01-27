// Mailer for sending OTP emails
module.exports = {
  async sendOtpMail(to, otp) {
    // Placeholder implementation for dev: log OTP to console.
    // Replace this with a real provider (SendGrid, SES, etc.) in production.
    // eslint-disable-next-line no-console
    console.log(`[mailer] OTP for ${to}: ${otp}`);
  },
};
