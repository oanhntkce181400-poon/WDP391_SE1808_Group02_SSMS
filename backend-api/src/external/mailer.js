const nodemailer = require('nodemailer');

function boolFromEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function getMailConfig() {
  return {
    enabled: boolFromEnv(process.env.MAIL_ENABLED, true),
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: boolFromEnv(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.MAIL_FROM_NAME || 'SchoolSys',
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER,
  };
}

let cachedTransporter = null;

function getTransporter() {
  const { host, port, secure, user, pass, enabled } = getMailConfig();
  if (!enabled || !host || !user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return cachedTransporter;
}

function buildOtpEmailTemplate({ otp }) {
  const brandColor = '#2563EB';
  const codeStyle = [
    'letter-spacing: 6px;',
    'font-size: 24px;',
    'font-weight: 700;',
    'color: #0F172A;',
    'padding: 12px 18px;',
    'background: #EFF6FF;',
    'border-radius: 12px;',
    'display: inline-block;',
  ].join(' ');

  const containerStyle = [
    'font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;',
    'background: #F0F7FF;',
    'padding: 32px;',
  ].join(' ');

  return `
    <div style="${containerStyle}">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); overflow: hidden;">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #F0F7FF 0%, #E0E7FF 100%);">
            <div style="width: 40px; height: 40px; background: ${brandColor}; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: #FFFFFF; font-weight: 700;">SS</span>
            </div>
            <h2 style="margin: 16px 0 4px; font-size: 20px; color: #0F172A;">Your verification code</h2>
            <p style="margin: 0; color: #64748B; font-size: 14px;">Use the OTP below to reset your password.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <div style="text-align: center; margin: 12px 0 24px;">
              <span style="${codeStyle}">${otp}</span>
            </div>
            <p style="margin: 0 0 12px; color: #0F172A; font-size: 14px;">
              This code will expire soon. If you did not request this change, you can ignore this email.
            </p>
            <p style="margin: 0; color: #94A3B8; font-size: 12px;">
              SchoolSys Security Team
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

module.exports = {
  async sendOtpMail(to, otp) {
    const config = getMailConfig();
    const transporter = getTransporter();
    if (!transporter) {
      // eslint-disable-next-line no-console
      console.log(`[mailer] OTP for ${to}: ${otp}`);
      return { sent: false, reason: 'mailer-not-configured' };
    }

    const html = buildOtpEmailTemplate({ otp });
    const subject = 'SchoolSys Password Reset OTP';

    try {
      const info = await transporter.sendMail({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject,
        text: `Your OTP: ${otp}. This code will expire soon.`,
        html,
      });
      return { sent: true, messageId: info?.messageId };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mailer] Failed to send email:', err?.message || err);
      return { sent: false, reason: 'send-failed' };
    }
  },
};
