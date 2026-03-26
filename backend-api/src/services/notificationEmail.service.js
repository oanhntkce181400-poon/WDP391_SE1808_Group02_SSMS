const SystemSettings = require('../models/systemSettings.model');
const emailTemplateService = require('./emailTemplate.service');
const mailer = require('../external/mailer');

function buildFrontendUrl(path = '/') {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `${value.toLocaleString('vi-VN')} VNĐ`;
}

function formatDate(value) {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
}

async function isAutomatedEmailEnabled() {
  try {
    const settings = await SystemSettings.findOne().select('emailNotificationsEnabled').lean();
    if (!settings) return true;
    return settings.emailNotificationsEnabled !== false;
  } catch (_error) {
    return true;
  }
}

async function renderTemplate(templateCode, variables, fallback) {
  try {
    return await emailTemplateService.renderTemplateByCode(templateCode, variables);
  } catch (_error) {
    if (typeof fallback === 'function') {
      return fallback();
    }

    return emailTemplateService.renderSystemTemplateFallback(templateCode, variables);
  }
}

async function sendTemplateEmail({ to, templateCode, variables = {}, fallback }) {
  if (!to) {
    return { sent: false, reason: 'missing-recipient' };
  }

  const enabled = await isAutomatedEmailEnabled();
  if (!enabled) {
    return { sent: false, reason: 'email-notifications-disabled' };
  }

  const rendered = await renderTemplate(templateCode, variables, fallback);

  return mailer.sendMail({
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

async function sendRegistrationSuccessEmail({ studentEmail, studentName, classCode, subjectName, semesterName }) {
  const variables = {
    studentName: studentName || 'Sinh viên',
    classCode: classCode || 'N/A',
    subjectName: subjectName || 'Môn học',
    semesterName: semesterName || 'Học kỳ hiện tại',
    registrationUrl: buildFrontendUrl('/student/registration'),
  };

  return sendTemplateEmail({
    to: studentEmail,
    templateCode: 'REGISTRATION_SUCCESS',
    variables,
  });
}

async function sendRequestStatusEmail({
  studentEmail,
  studentName,
  requestType,
  requestStatus,
  processedBy,
  responseNote,
}) {
  const variables = {
    studentName: studentName || 'Sinh viên',
    requestType: requestType || 'Đơn từ',
    requestStatus: requestStatus || 'Đang xử lý',
    processedBy: processedBy || 'Phòng CTSV',
    responseNote: responseNote || 'Không có ghi chú thêm',
    requestUrl: buildFrontendUrl('/student/applications'),
  };

  return sendTemplateEmail({
    to: studentEmail,
    templateCode: 'REQUEST_STATUS_UPDATED',
    variables,
  });
}

async function sendTuitionReminderEmail({ studentEmail, studentName, bill }) {
  const variables = {
    studentName: studentName || 'Sinh viên',
    semesterName: bill?.semesterName || bill?.semesterCode || 'Học kỳ hiện tại',
    amountDue: formatCurrency(bill?.totalAmount),
    dueDate: formatDate(bill?.dueDate),
    paymentUrl: buildFrontendUrl('/student/finance'),
  };

  return sendTemplateEmail({
    to: studentEmail,
    templateCode: 'TUITION_PAYMENT_REMINDER',
    variables,
  });
}

async function sendGradePublishedEmail({ studentEmail, variables, fallback }) {
  return sendTemplateEmail({
    to: studentEmail,
    templateCode: 'GRADE_PUBLISHED',
    variables,
    fallback,
  });
}

module.exports = {
  isAutomatedEmailEnabled,
  sendTemplateEmail,
  sendRegistrationSuccessEmail,
  sendRequestStatusEmail,
  sendTuitionReminderEmail,
  sendGradePublishedEmail,
};
