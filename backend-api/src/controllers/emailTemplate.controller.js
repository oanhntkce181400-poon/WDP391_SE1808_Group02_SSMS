const emailTemplateService = require('../services/emailTemplate.service');

function sanitizeBody(req) {
  return {
    templateCode: req.body?.templateCode,
    templateName: req.body?.templateName,
    description: req.body?.description,
    category: req.body?.category,
    subjectTemplate: req.body?.subjectTemplate,
    htmlContent: req.body?.htmlContent,
    textContent: req.body?.textContent,
    variables: req.body?.variables,
    status: req.body?.status,
    isSystem: req.body?.isSystem,
  };
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Lỗi máy chủ nội bộ',
  });
}

async function getEmailTemplates(req, res) {
  try {
    const result = await emailTemplateService.listTemplates({
      page: req.query.page,
      limit: req.query.limit,
      keyword: req.query.keyword,
      status: req.query.status,
      category: req.query.category,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getEmailTemplateById(req, res) {
  try {
    const data = await emailTemplateService.getTemplateById(req.params.id);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createEmailTemplate(req, res) {
  try {
    const data = await emailTemplateService.createTemplate(sanitizeBody(req), req.auth?.sub);
    return res.status(201).json({
      success: true,
      message: 'Tạo mẫu email thành công',
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateEmailTemplate(req, res) {
  try {
    const data = await emailTemplateService.updateTemplate(
      req.params.id,
      sanitizeBody(req),
      req.auth?.sub,
    );
    return res.json({
      success: true,
      message: 'Cập nhật mẫu email thành công',
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteEmailTemplate(req, res) {
  try {
    await emailTemplateService.deleteTemplate(req.params.id);
    return res.json({
      success: true,
      message: 'Xóa mẫu email thành công',
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
};
