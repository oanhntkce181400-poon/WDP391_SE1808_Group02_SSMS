const EmailTemplate = require('../models/emailTemplate.model');

function buildCardEmailHtml({
  title,
  intro,
  greeting = 'Xin chào <strong>{{studentName}}</strong>,',
  details = [],
  footerNote = '',
  buttonLabel = '',
  buttonUrl = '',
  accentColor = '#1A237E',
}) {
  const detailItems = details.length
    ? `
      <ul style="margin: 0; padding-left: 18px; line-height: 1.8; color: #334155;">
        ${details.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    `
    : '';

  const ctaButton = buttonLabel
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${buttonUrl || '#'}"
          style="display: inline-block; background: ${accentColor}; color: #ffffff; text-decoration: none; padding: 11px 18px; border-radius: 10px; font-weight: 600;"
        >
          ${buttonLabel}
        </a>
      </div>
    `
    : '';

  const footer = footerNote
    ? `<p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.6;">${footerNote}</p>`
    : '';

  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);">
        <div style="background: ${accentColor}; padding: 20px 24px; color: #ffffff;">
          <p style="margin: 0 0 6px; font-size: 12px; opacity: 0.8; letter-spacing: 0.08em; text-transform: uppercase;">SSMS</p>
          <h2 style="margin: 0; font-size: 20px; line-height: 1.4;">${title}</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin-top: 0; color: #0f172a;">${greeting}</p>
          <p style="margin: 0 0 16px; color: #334155; line-height: 1.7;">${intro}</p>
          ${detailItems}
          ${ctaButton}
          ${footer}
        </div>
      </div>
    </div>
  `;
}

const SYSTEM_EMAIL_TEMPLATES = Object.freeze([
  {
    templateCode: 'GRADE_PUBLISHED',
    templateName: 'Thông báo công bố điểm',
    description: 'Mẫu hệ thống dùng để gửi email khi giảng viên công bố điểm chính thức.',
    category: 'academic',
    subjectTemplate: '[SSMS] Công bố điểm {{subjectName}}',
    textContent:
      'Xin chào {{studentName}}, điểm chính thức của bạn cho môn {{subjectName}} ({{classCode}}) là {{grade}}. Giảng viên phụ trách: {{teacherName}}. Vui lòng đăng nhập hệ thống để xem chi tiết thành phần điểm.',
    htmlContent: buildCardEmailHtml({
      title: 'Công bố điểm chính thức',
      intro: 'Điểm chính thức của bạn đã được công bố trên hệ thống.',
      details: [
        'Mã lớp: <strong>{{classCode}}</strong>',
        'Môn học: <strong>{{subjectName}}</strong>',
        'Điểm tổng kết: <strong>{{grade}}</strong>',
        'Giảng viên: <strong>{{teacherName}}</strong>',
      ],
      footerNote:
        'Vui lòng đăng nhập hệ thống để xem chi tiết thành phần điểm, phản hồi hoặc theo dõi các cập nhật tiếp theo.',
      accentColor: '#1A237E',
    }),
    variables: ['studentName', 'classCode', 'subjectName', 'grade', 'teacherName'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'REGISTRATION_PERIOD_OPEN',
    templateName: 'Thông báo mở đợt đăng ký',
    description: 'Mẫu gửi khi nhà trường mở đợt đăng ký môn học hoặc đăng ký tín chỉ mới.',
    category: 'academic',
    subjectTemplate: '[SSMS] Mở đợt đăng ký {{periodName}}',
    textContent:
      'Xin chào {{studentName}}, hệ thống vừa mở đợt đăng ký "{{periodName}}" từ {{startDate}} đến {{endDate}}. Vui lòng truy cập {{registrationUrl}} để thực hiện đăng ký đúng thời hạn.',
    htmlContent: buildCardEmailHtml({
      title: 'Mở đợt đăng ký mới',
      intro: 'Hệ thống vừa mở một đợt đăng ký mới dành cho sinh viên.',
      details: [
        'Tên đợt đăng ký: <strong>{{periodName}}</strong>',
        'Thời gian bắt đầu: <strong>{{startDate}}</strong>',
        'Thời gian kết thúc: <strong>{{endDate}}</strong>',
      ],
      footerNote:
        'Bạn nên hoàn tất đăng ký sớm để hạn chế hết chỗ hoặc phát sinh xung đột lịch học.',
      buttonLabel: 'Đi đến trang đăng ký',
      buttonUrl: '{{registrationUrl}}',
      accentColor: '#0F766E',
    }),
    variables: ['studentName', 'periodName', 'startDate', 'endDate', 'registrationUrl'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'TUITION_PAYMENT_REMINDER',
    templateName: 'Nhắc nhở thanh toán học phí',
    description: 'Mẫu gửi để nhắc sinh viên thanh toán học phí theo học kỳ.',
    category: 'finance',
    subjectTemplate: '[SSMS] Nhắc nhở học phí {{semesterName}}',
    textContent:
      'Xin chào {{studentName}}, hệ thống ghi nhận bạn còn {{amountDue}} học phí cho {{semesterName}}. Hạn thanh toán: {{dueDate}}. Truy cập {{paymentUrl}} để thanh toán và tránh ảnh hưởng đến quyền đăng ký môn.',
    htmlContent: buildCardEmailHtml({
      title: 'Nhắc nhở thanh toán học phí',
      intro: 'Hệ thống ghi nhận bạn còn một khoản học phí cần hoàn tất thanh toán.',
      details: [
        'Học kỳ: <strong>{{semesterName}}</strong>',
        'Số tiền cần thanh toán: <strong>{{amountDue}}</strong>',
        'Hạn thanh toán: <strong>{{dueDate}}</strong>',
      ],
      footerNote:
        'Việc thanh toán đúng hạn giúp bạn không bị gián đoạn đăng ký môn học, xem điểm hoặc sử dụng các dịch vụ học vụ khác.',
      buttonLabel: 'Thanh toán ngay',
      buttonUrl: '{{paymentUrl}}',
      accentColor: '#B45309',
    }),
    variables: ['studentName', 'semesterName', 'amountDue', 'dueDate', 'paymentUrl'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'REQUEST_STATUS_UPDATED',
    templateName: 'Cập nhật trạng thái đơn từ',
    description: 'Mẫu thông báo khi đơn từ của sinh viên được xử lý hoặc phản hồi.',
    category: 'notification',
    subjectTemplate: '[SSMS] Cập nhật đơn từ {{requestType}}',
    textContent:
      'Xin chào {{studentName}}, đơn từ "{{requestType}}" của bạn đã được cập nhật sang trạng thái "{{requestStatus}}". Người xử lý: {{processedBy}}. Phản hồi: {{responseNote}}. Xem chi tiết tại {{requestUrl}}.',
    htmlContent: buildCardEmailHtml({
      title: 'Đơn từ đã được cập nhật',
      intro: 'Đơn từ của bạn vừa được bộ phận học vụ xử lý trên hệ thống.',
      details: [
        'Loại đơn: <strong>{{requestType}}</strong>',
        'Trạng thái mới: <strong>{{requestStatus}}</strong>',
        'Người xử lý: <strong>{{processedBy}}</strong>',
        'Phản hồi: <strong>{{responseNote}}</strong>',
      ],
      footerNote:
        'Nếu cần bổ sung hồ sơ hoặc chỉnh sửa thông tin, vui lòng truy cập lại chi tiết đơn từ để kiểm tra hướng dẫn.',
      buttonLabel: 'Xem chi tiết đơn',
      buttonUrl: '{{requestUrl}}',
      accentColor: '#7C3AED',
    }),
    variables: ['studentName', 'requestType', 'requestStatus', 'processedBy', 'responseNote', 'requestUrl'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'WEEKLY_SCHEDULE_AVAILABLE',
    templateName: 'Thông báo lịch học tuần',
    description: 'Mẫu thông báo khi thời khóa biểu tuần đã sẵn sàng hoặc vừa được cập nhật.',
    category: 'academic',
    subjectTemplate: '[SSMS] Lịch học tuần {{weekRange}} đã sẵn sàng',
    textContent:
      'Xin chào {{studentName}}, thời khóa biểu tuần {{weekRange}} đã sẵn sàng. Tóm tắt: {{scheduleSummary}}. Vui lòng xem chi tiết tại {{scheduleUrl}}.',
    htmlContent: buildCardEmailHtml({
      title: 'Lịch học tuần đã sẵn sàng',
      intro: 'Hệ thống đã cập nhật lịch học tuần của bạn.',
      details: [
        'Khoảng tuần: <strong>{{weekRange}}</strong>',
        'Tóm tắt lịch: <strong>{{scheduleSummary}}</strong>',
      ],
      footerNote:
        'Bạn nên kiểm tra lịch học thường xuyên để kịp thời nắm phòng học, ca học và các thay đổi phát sinh.',
      buttonLabel: 'Xem thời khóa biểu',
      buttonUrl: '{{scheduleUrl}}',
      accentColor: '#2563EB',
    }),
    variables: ['studentName', 'weekRange', 'scheduleSummary', 'scheduleUrl'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'WISHLIST_APPROVED',
    templateName: 'Kết quả wishlist môn học',
    description: 'Mẫu thông báo khi wishlist hoặc waitlist của sinh viên được gán vào lớp cụ thể.',
    category: 'academic',
    subjectTemplate: '[SSMS] Kết quả wishlist môn {{subjectName}}',
    textContent:
      'Xin chào {{studentName}}, nguyện vọng wishlist cho môn {{subjectName}} trong {{semesterName}} đã được xử lý. Lớp được gán: {{classCode}} - {{className}}. Xem chi tiết tại {{wishlistUrl}}.',
    htmlContent: buildCardEmailHtml({
      title: 'Kết quả wishlist / waitlist',
      intro: 'Nguyện vọng đăng ký của bạn đã được hệ thống xử lý.',
      details: [
        'Môn học: <strong>{{subjectName}}</strong>',
        'Học kỳ: <strong>{{semesterName}}</strong>',
        'Lớp được gán: <strong>{{classCode}} - {{className}}</strong>',
      ],
      footerNote:
        'Nếu lớp đã được gán, bạn nên kiểm tra lại lịch học và học phí liên quan để tránh bỏ lỡ các mốc quan trọng.',
      buttonLabel: 'Xem wishlist',
      buttonUrl: '{{wishlistUrl}}',
      accentColor: '#9333EA',
    }),
    variables: ['studentName', 'subjectName', 'semesterName', 'classCode', 'className', 'wishlistUrl'],
    status: 'active',
    isSystem: true,
  },
  {
    templateCode: 'FEEDBACK_PERIOD_OPEN',
    templateName: 'Mở đợt đánh giá giảng viên',
    description: 'Mẫu thông báo khi hệ thống mở khoảng thời gian đánh giá giảng viên cho sinh viên.',
    category: 'academic',
    subjectTemplate: '[SSMS] Mở đánh giá giảng viên {{semesterName}}',
    textContent:
      'Xin chào {{studentName}}, hệ thống đã mở đợt đánh giá giảng viên cho {{semesterName}} từ {{feedbackStartDate}} đến {{feedbackEndDate}}. Truy cập {{feedbackUrl}} để hoàn tất đánh giá đúng hạn.',
    htmlContent: buildCardEmailHtml({
      title: 'Mở đợt đánh giá giảng viên',
      intro: 'Bạn đã có thể thực hiện đánh giá giảng viên trên hệ thống.',
      details: [
        'Học kỳ áp dụng: <strong>{{semesterName}}</strong>',
        'Bắt đầu: <strong>{{feedbackStartDate}}</strong>',
        'Kết thúc: <strong>{{feedbackEndDate}}</strong>',
      ],
      footerNote:
        'Đánh giá của bạn giúp nhà trường và giảng viên cải thiện chất lượng giảng dạy trong các học kỳ tiếp theo.',
      buttonLabel: 'Đi đến trang đánh giá',
      buttonUrl: '{{feedbackUrl}}',
      accentColor: '#BE123C',
    }),
    variables: ['studentName', 'semesterName', 'feedbackStartDate', 'feedbackEndDate', 'feedbackUrl'],
    status: 'active',
    isSystem: true,
  },
]);

function normalizeTemplateCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveVariableValue(variables, key) {
  return String(
    key.split('.').reduce((acc, part) => (acc == null ? '' : acc[part]), variables) ?? '',
  );
}

function renderTemplateString(template, variables, { htmlEscape = false } = {}) {
  return String(template || '').replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = resolveVariableValue(variables, key);
    return htmlEscape ? escapeHtml(value) : value;
  });
}

function extractVariablesFromContent(...parts) {
  const collected = new Set();
  const regex = /{{\s*([\w.]+)\s*}}/g;

  parts.forEach((part) => {
    const content = String(part || '');
    let match = regex.exec(content);
    while (match) {
      collected.add(match[1]);
      match = regex.exec(content);
    }
    regex.lastIndex = 0;
  });

  return Array.from(collected);
}

function renderTemplateDocument(template, variables = {}) {
  const textTemplate = String(template.textContent || '').trim() || stripHtml(template.htmlContent);

  return {
    subject: renderTemplateString(template.subjectTemplate, variables),
    text: renderTemplateString(textTemplate, variables),
    html: renderTemplateString(template.htmlContent, variables, { htmlEscape: true }),
  };
}

function templatesEqualForSync(existing, expected) {
  const fields = [
    'templateName',
    'description',
    'category',
    'subjectTemplate',
    'htmlContent',
    'textContent',
    'status',
    'isSystem',
  ];

  const sameFields = fields.every((field) => String(existing[field] ?? '') === String(expected[field] ?? ''));
  const sameVariables =
    JSON.stringify([...(existing.variables || [])]) === JSON.stringify([...(expected.variables || [])]);

  return sameFields && sameVariables;
}

class EmailTemplateService {
  async syncSystemTemplates({ overwriteExisting = false } = {}) {
    const summary = { created: 0, updated: 0 };

    for (const definition of SYSTEM_EMAIL_TEMPLATES) {
      const normalizedTemplate = {
        ...definition,
        templateCode: normalizeTemplateCode(definition.templateCode),
      };

      const existing = await EmailTemplate.findOne({
        templateCode: normalizedTemplate.templateCode,
      });

      if (!existing) {
        await EmailTemplate.create(normalizedTemplate);
        summary.created += 1;
        continue;
      }

      if (!overwriteExisting) continue;
      if (templatesEqualForSync(existing, normalizedTemplate)) continue;

      existing.templateName = normalizedTemplate.templateName;
      existing.description = normalizedTemplate.description;
      existing.category = normalizedTemplate.category;
      existing.subjectTemplate = normalizedTemplate.subjectTemplate;
      existing.htmlContent = normalizedTemplate.htmlContent;
      existing.textContent = normalizedTemplate.textContent;
      existing.variables = normalizedTemplate.variables;
      existing.status = normalizedTemplate.status;
      existing.isSystem = normalizedTemplate.isSystem;
      await existing.save();
      summary.updated += 1;
    }

    return summary;
  }

  async ensureSystemTemplates() {
    return this.syncSystemTemplates({ overwriteExisting: false });
  }

  getSystemTemplateDefinitions() {
    return SYSTEM_EMAIL_TEMPLATES;
  }

  renderSystemTemplateFallback(templateCode, variables = {}) {
    const template = SYSTEM_EMAIL_TEMPLATES.find(
      (item) => item.templateCode === normalizeTemplateCode(templateCode),
    );

    if (!template) {
      throw new Error(`Không tìm thấy mẫu email hệ thống "${templateCode}"`);
    }

    return renderTemplateDocument(template, variables);
  }

  async generateUniqueTemplateCode(seedName, excludeId = null) {
    const baseCode = normalizeTemplateCode(seedName) || 'EMAIL_TEMPLATE';
    let nextCode = baseCode;
    let suffix = 1;

    while (true) {
      const existing = await EmailTemplate.findOne({
        templateCode: nextCode,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
        .select('_id')
        .lean();

      if (!existing) return nextCode;
      suffix += 1;
      nextCode = `${baseCode}_${suffix}`;
    }
  }

  async buildTemplatePayload(data = {}, existingTemplate = null) {
    const templateName =
      data.templateName !== undefined
        ? String(data.templateName || '').trim()
        : existingTemplate?.templateName;
    const description =
      data.description !== undefined
        ? String(data.description || '').trim()
        : existingTemplate?.description || '';
    const category =
      data.category !== undefined
        ? String(data.category || '').trim()
        : existingTemplate?.category || 'other';
    const subjectTemplate =
      data.subjectTemplate !== undefined
        ? String(data.subjectTemplate || '').trim()
        : existingTemplate?.subjectTemplate;
    const htmlContent =
      data.htmlContent !== undefined ? String(data.htmlContent || '') : existingTemplate?.htmlContent;
    const textContent =
      data.textContent !== undefined ? String(data.textContent || '') : existingTemplate?.textContent || '';
    const status =
      data.status !== undefined
        ? String(data.status || '').trim()
        : existingTemplate?.status || 'active';
    const isSystem =
      data.isSystem !== undefined ? Boolean(data.isSystem) : Boolean(existingTemplate?.isSystem);

    let templateCode =
      data.templateCode !== undefined
        ? normalizeTemplateCode(data.templateCode)
        : existingTemplate?.templateCode;

    if (!templateCode) {
      templateCode = await this.generateUniqueTemplateCode(
        templateName || 'EMAIL_TEMPLATE',
        existingTemplate?._id,
      );
    }

    const explicitVariables = Array.isArray(data.variables)
      ? data.variables
      : typeof data.variables === 'string'
      ? data.variables.split(',')
      : existingTemplate?.variables || [];

    const variables = Array.from(
      new Set(
        [...explicitVariables, ...extractVariablesFromContent(subjectTemplate, htmlContent, textContent)]
          .map((item) => String(item || '').trim())
          .filter(Boolean),
      ),
    );

    return {
      templateCode,
      templateName,
      description,
      category,
      subjectTemplate,
      htmlContent,
      textContent,
      variables,
      status,
      isSystem,
    };
  }

  validateTemplatePayload(payload) {
    if (!payload.templateName) {
      const error = new Error('Tên mẫu email là bắt buộc');
      error.statusCode = 400;
      throw error;
    }

    if (!payload.templateCode) {
      const error = new Error('Mã mẫu email là bắt buộc');
      error.statusCode = 400;
      throw error;
    }

    if (!payload.subjectTemplate) {
      const error = new Error('Tiêu đề email mẫu là bắt buộc');
      error.statusCode = 400;
      throw error;
    }

    if (!payload.htmlContent) {
      const error = new Error('Nội dung HTML là bắt buộc');
      error.statusCode = 400;
      throw error;
    }

    const validStatuses = ['active', 'archived'];
    if (!validStatuses.includes(payload.status)) {
      const error = new Error('Trạng thái mẫu email không hợp lệ');
      error.statusCode = 400;
      throw error;
    }

    const validCategories = ['academic', 'finance', 'notification', 'system', 'other'];
    if (!validCategories.includes(payload.category)) {
      const error = new Error('Nhóm mẫu email không hợp lệ');
      error.statusCode = 400;
      throw error;
    }
  }

  async listTemplates({ page = 1, limit = 20, keyword = '', status, category } = {}) {
    await this.ensureSystemTemplates();

    const query = {};
    if (keyword) {
      query.$or = [
        { templateName: { $regex: keyword, $options: 'i' } },
        { templateCode: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (category) query.category = category;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [templates, total] = await Promise.all([
      EmailTemplate.find(query)
        .populate('createdBy', 'email fullName')
        .populate('updatedBy', 'email fullName')
        .sort({ isSystem: -1, updatedAt: -1, createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      EmailTemplate.countDocuments(query),
    ]);

    return {
      data: templates,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    };
  }

  async getTemplateById(id) {
    await this.ensureSystemTemplates();

    const template = await EmailTemplate.findById(id)
      .populate('createdBy', 'email fullName')
      .populate('updatedBy', 'email fullName')
      .lean();

    if (!template) {
      const error = new Error('Không tìm thấy mẫu email');
      error.statusCode = 404;
      throw error;
    }

    return template;
  }

  async createTemplate(data, userId) {
    await this.ensureSystemTemplates();

    const payload = await this.buildTemplatePayload(data);
    this.validateTemplatePayload(payload);

    const existing = await EmailTemplate.findOne({ templateCode: payload.templateCode })
      .select('_id')
      .lean();
    if (existing) {
      const error = new Error('Mã mẫu email đã tồn tại');
      error.statusCode = 400;
      throw error;
    }

    const template = await EmailTemplate.create({
      ...payload,
      createdBy: userId || null,
      updatedBy: userId || null,
    });

    return this.getTemplateById(template._id);
  }

  async updateTemplate(id, data, userId) {
    await this.ensureSystemTemplates();

    const existingTemplate = await EmailTemplate.findById(id);
    if (!existingTemplate) {
      const error = new Error('Không tìm thấy mẫu email');
      error.statusCode = 404;
      throw error;
    }

    const payload = await this.buildTemplatePayload(data, existingTemplate);
    if (existingTemplate.isSystem && payload.templateCode !== existingTemplate.templateCode) {
      const error = new Error('Không thể thay đổi mã của mẫu email hệ thống');
      error.statusCode = 400;
      throw error;
    }

    this.validateTemplatePayload(payload);

    const duplicate = await EmailTemplate.findOne({
      templateCode: payload.templateCode,
      _id: { $ne: existingTemplate._id },
    })
      .select('_id')
      .lean();

    if (duplicate) {
      const error = new Error('Mã mẫu email đã tồn tại');
      error.statusCode = 400;
      throw error;
    }

    Object.assign(existingTemplate, {
      ...payload,
      updatedBy: userId || null,
    });

    await existingTemplate.save();
    return this.getTemplateById(existingTemplate._id);
  }

  async deleteTemplate(id) {
    await this.ensureSystemTemplates();

    const template = await EmailTemplate.findById(id);
    if (!template) {
      const error = new Error('Không tìm thấy mẫu email');
      error.statusCode = 404;
      throw error;
    }

    if (template.isSystem) {
      const error = new Error('Không thể xóa mẫu email hệ thống');
      error.statusCode = 400;
      throw error;
    }

    await template.deleteOne();
    return { deleted: true };
  }

  async renderTemplateByCode(templateCode, variables = {}) {
    await this.ensureSystemTemplates();

    const normalizedCode = normalizeTemplateCode(templateCode);
    const template = await EmailTemplate.findOne({ templateCode: normalizedCode }).lean();

    if (template) {
      return renderTemplateDocument(template, variables);
    }

    return this.renderSystemTemplateFallback(normalizedCode, variables);
  }
}

module.exports = new EmailTemplateService();
