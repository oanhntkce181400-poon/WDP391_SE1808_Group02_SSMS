import { useEffect, useState } from 'react';
import emailTemplateService from '../../services/emailTemplateService';
import nextIcon from '../../assets/next.png';

const EMPTY_FORM = {
  templateCode: '',
  templateName: '',
  description: '',
  category: 'academic',
  subjectTemplate: '',
  htmlContent: '',
  textContent: '',
  variablesInput: '',
  status: 'active',
  isSystem: false,
};

const CATEGORY_OPTIONS = [
  { value: 'academic', label: 'Học vụ' },
  { value: 'finance', label: 'Tài chính' },
  { value: 'notification', label: 'Thông báo' },
  { value: 'system', label: 'Hệ thống' },
  { value: 'other', label: 'Khác' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'archived', label: 'Lưu trữ' },
];

const DEFAULT_PREVIEW_VALUES = {
  name: 'Nguyễn Văn A',
  studentName: 'Nguyễn Văn A',
  subjectName: 'Nhập môn Kỹ thuật phần mềm',
  subjectCode: 'SE101',
  classCode: 'SE101-HK1-2025-2026-N1',
  className: 'Nhập môn Kỹ thuật phần mềm - Nhóm 1',
  grade: '8.75',
  teacherName: 'Giảng viên Nguyễn Văn B',
  course: 'Kỹ thuật phần mềm',
  lecturer: 'Giảng viên Nguyễn Văn B',
  semester: 'Học kỳ Spring 2026',
  semesterName: 'Học kỳ Spring 2026',
  amountDue: '12.500.000 VNĐ',
  dueDate: '15/04/2026',
  paymentUrl: 'http://localhost:5173/student/payment',
  requestType: 'Bảo lưu kết quả học tập',
  requestStatus: 'Đã duyệt',
  processedBy: 'Phòng Công tác Sinh viên',
  responseNote: 'Hồ sơ hợp lệ, vui lòng theo dõi thông báo tiếp theo.',
  requestUrl: 'http://localhost:5173/student/applications',
  periodName: 'Đăng ký môn học đợt 1',
  startDate: '01/04/2026 08:00',
  endDate: '07/04/2026 23:59',
  registrationUrl: 'http://localhost:5173/student/registration',
  weekRange: '31/03/2026 - 06/04/2026',
  scheduleSummary: '3 buổi học, 1 buổi ca sáng, 2 buổi ca chiều',
  scheduleUrl: 'http://localhost:5173/student/schedule',
  wishlistUrl: 'http://localhost:5173/student/wishlist',
  feedbackStartDate: '10/04/2026 00:00',
  feedbackEndDate: '20/04/2026 23:59',
  feedbackUrl: 'http://localhost:5173/student/feedback',
};

function parseVariables(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(content, variables, { htmlEscape = false } = {}) {
  return String(content || '').replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = variables[key] ?? `[${key}]`;
    return htmlEscape ? escapeHtml(value) : value;
  });
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
}

function mapTemplateToForm(template) {
  return {
    templateCode: template.templateCode || '',
    templateName: template.templateName || '',
    description: template.description || '',
    category: template.category || 'academic',
    subjectTemplate: template.subjectTemplate || '',
    htmlContent: template.htmlContent || '',
    textContent: template.textContent || '',
    variablesInput: Array.isArray(template.variables) ? template.variables.join(', ') : '',
    status: template.status || 'active',
    isSystem: Boolean(template.isSystem),
  };
}

function getCategoryLabel(value) {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value || 'Khác';
}

function getStatusLabel(value) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label || value || 'Không xác định';
}

export default function EmailTemplateManagementPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    window.clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2800);
  }

  async function loadTemplateDetail(id) {
    if (!id) {
      setSelectedTemplateId(null);
      setForm(EMPTY_FORM);
      return;
    }

    setDetailLoading(true);
    try {
      const response = await emailTemplateService.getEmailTemplate(id);
      const template = response.data?.data;
      setSelectedTemplateId(template?._id || template?.id || null);
      setForm(mapTemplateToForm(template || {}));
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể tải chi tiết mẫu email', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadTemplates(preferredId = null) {
    setLoading(true);
    try {
      const response = await emailTemplateService.getEmailTemplates({
        page: 1,
        limit: 100,
        keyword: appliedKeyword,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });

      const list = response.data?.data || [];
      setTemplates(list);

      const nextSelectedId =
        preferredId ||
        (selectedTemplateId && list.some((item) => item._id === selectedTemplateId)
          ? selectedTemplateId
          : list[0]?._id || null);

      if (nextSelectedId) {
        await loadTemplateDetail(nextSelectedId);
      } else {
        setSelectedTemplateId(null);
        setForm(EMPTY_FORM);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể tải danh sách mẫu email', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, [appliedKeyword, statusFilter, categoryFilter]);

  const previewVariables = parseVariables(form.variablesInput).reduce((acc, key) => {
    acc[key] = DEFAULT_PREVIEW_VALUES[key] ?? `[${key}]`;
    return acc;
  }, { ...DEFAULT_PREVIEW_VALUES });

  const previewSubject = renderTemplate(form.subjectTemplate, previewVariables);
  const previewHtml = renderTemplate(form.htmlContent, previewVariables, { htmlEscape: true });
  const previewText = renderTemplate(form.textContent, previewVariables);
  const selectedTemplate = templates.find((item) => item._id === selectedTemplateId) || null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      templateCode: form.templateCode,
      templateName: form.templateName,
      description: form.description,
      category: form.category,
      subjectTemplate: form.subjectTemplate,
      htmlContent: form.htmlContent,
      textContent: form.textContent,
      variables: parseVariables(form.variablesInput),
      status: form.status,
    };

    try {
      let response;
      if (selectedTemplateId) {
        response = await emailTemplateService.updateEmailTemplate(selectedTemplateId, payload);
        showToast('Cập nhật mẫu email thành công');
      } else {
        response = await emailTemplateService.createEmailTemplate(payload);
        showToast('Tạo mẫu email thành công');
      }

      const createdId = response.data?.data?._id || response.data?.data?.id || null;
      await loadTemplates(createdId);
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể lưu mẫu email', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTemplateId || form.isSystem) return;
    const confirmed = window.confirm('Bạn có chắc muốn xóa mẫu email này không?');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await emailTemplateService.deleteEmailTemplate(selectedTemplateId);
      showToast('Xóa mẫu email thành công');
      setSelectedTemplateId(null);
      setForm(EMPTY_FORM);
      await loadTemplates();
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể xóa mẫu email', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {toast.show ? (
          <div className="fixed right-4 top-4 z-[200]">
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
            <a className="transition-colors hover:text-[#1A237E]" href="/admin">
              Trang chủ
            </a>
            <img src={nextIcon} alt=">" className="h-4 w-4" />
            <span className="font-semibold text-[#1A237E]">Mẫu email</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Quản lý mẫu email</h1>
          <p className="max-w-3xl text-slate-600">
            Quản trị viên có thể xem, tạo, cập nhật và xóa các mẫu email. Những mẫu hệ thống gắn với
            nghiệp vụ của dự án như công bố điểm, học phí, đơn từ, wishlist hay đánh giá giảng viên
            cũng được hiển thị sẵn để bạn điều chỉnh nội dung.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Tìm kiếm</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo tên, mã hoặc mô tả..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                />
                <button
                  type="button"
                  onClick={() => setAppliedKeyword(keyword)}
                  className="rounded-xl bg-[#1A237E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1759]"
                >
                  Tìm
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
              >
                <option value="">Tất cả</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nhóm</label>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
              >
                <option value="">Tất cả</option>
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Đang hiển thị {templates.length} mẫu email</p>
            <button
              type="button"
              onClick={() => {
                setSelectedTemplateId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tạo mẫu mới
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Danh sách mẫu email</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn một mẫu để xem nội dung và chỉnh sửa.</p>
            </div>

            <div className="max-h-[920px] overflow-y-auto p-3">
              {loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  Đang tải danh sách mẫu email...
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chưa có mẫu email nào.
                </div>
              ) : (
                templates.map((template) => {
                  const isActive = selectedTemplateId === template._id;
                  return (
                    <button
                      key={template._id}
                      type="button"
                      onClick={() => loadTemplateDetail(template._id)}
                      className={`mb-3 w-full rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-[#1A237E] bg-[#1A237E]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {template.templateCode}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            template.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {getStatusLabel(template.status)}
                        </span>
                        {template.isSystem ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{template.templateName}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {template.description || 'Không có mô tả'}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{getCategoryLabel(template.category)}</span>
                        <span>{formatDateTime(template.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedTemplateId ? 'Chi tiết mẫu email' : 'Tạo mẫu email mới'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {form.isSystem
                      ? 'Mẫu hệ thống có thể sửa nội dung, nhưng không thể xóa hoặc đổi mã.'
                      : 'Nhập nội dung với biến động theo định dạng {{variableName}}.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTemplateId) {
                        loadTemplateDetail(selectedTemplateId);
                      } else {
                        setForm(EMPTY_FORM);
                      }
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Làm mới
                  </button>
                  <button
                    type="submit"
                    disabled={saving || detailLoading}
                    className="rounded-xl bg-[#1A237E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f1759] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Đang lưu...'
                      : selectedTemplateId
                      ? 'Cập nhật mẫu email'
                      : 'Tạo mẫu email'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!selectedTemplateId || form.isSystem || deleting}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Đang tải chi tiết mẫu email...
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Mã mẫu</label>
                    <input
                      type="text"
                      value={form.templateCode}
                      disabled={form.isSystem}
                      onChange={(event) => setForm((prev) => ({ ...prev, templateCode: event.target.value }))}
                      placeholder="VD: GRADE_PUBLISHED"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tên mẫu</label>
                    <input
                      type="text"
                      value={form.templateName}
                      onChange={(event) => setForm((prev) => ({ ...prev, templateName: event.target.value }))}
                      placeholder="VD: Thông báo công bố điểm"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Nhóm</label>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    >
                      {CATEGORY_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Mô tả</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Mô tả mục đích sử dụng của mẫu email..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Biến sử dụng (ngăn cách bởi dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={form.variablesInput}
                      onChange={(event) => setForm((prev) => ({ ...prev, variablesInput: event.target.value }))}
                      placeholder="studentName, subjectName, classCode, grade, teacherName"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Bạn có thể dùng placeholder trong tiêu đề, HTML hoặc text như {'{{studentName}}'} hay {'{{periodName}}'}.
                    </p>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tiêu đề email mẫu</label>
                    <input
                      type="text"
                      value={form.subjectTemplate}
                      onChange={(event) => setForm((prev) => ({ ...prev, subjectTemplate: event.target.value }))}
                      placeholder="[SSMS] Công bố điểm {{subjectName}}"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Nội dung HTML</label>
                    <textarea
                      rows={14}
                      value={form.htmlContent}
                      onChange={(event) => setForm((prev) => ({ ...prev, htmlContent: event.target.value }))}
                      placeholder="<div>Xin chào {{studentName}}</div>"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Nội dung text (tuỳ chọn)</label>
                    <textarea
                      rows={5}
                      value={form.textContent}
                      onChange={(event) => setForm((prev) => ({ ...prev, textContent: event.target.value }))}
                      placeholder="Xin chào {{studentName}}, ..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-[#1A237E] focus:ring-2 focus:ring-[#1A237E]/10"
                    />
                  </div>
                </div>
              )}
            </form>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Xem trước</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Bản xem trước dùng dữ liệu mẫu để bạn kiểm tra nhanh nội dung email sẽ gửi.
                  </p>
                </div>
                {selectedTemplate ? (
                  <div className="text-right text-xs text-slate-400">
                    <div>Cập nhật: {formatDateTime(selectedTemplate.updatedAt)}</div>
                    <div>Tạo bởi: {selectedTemplate.createdBy?.fullName || 'Hệ thống'}</div>
                  </div>
                ) : null}
              </div>

              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Dữ liệu mẫu</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(previewVariables).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                      <span className="font-semibold text-slate-700">{key}</span>
                      <span className="ml-2 text-slate-500">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Xem trước tiêu đề
                  </h3>
                  <p className="text-base font-semibold text-slate-900">
                    {previewSubject || 'Chưa có tiêu đề mẫu'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Xem trước HTML
                  </h3>
                  <div
                    className="overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Chưa có nội dung HTML</p>' }}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Xem trước bản text
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                    {previewText || 'Chưa có nội dung text'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
