import { useEffect, useState } from 'react';
import feedbackTemplateService from '../../services/feedbackTemplateService';
import FeedbackTemplateFormBuilder from './FeedbackTemplateFormBuilder';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-rose-100 text-rose-700',
  archived: 'bg-amber-100 text-amber-700',
};

const STATUS_LABELS = {
  draft: 'Dự thảo',
  active: 'Đang mở',
  closed: 'Đã đóng',
  archived: 'Lưu trữ',
};

const TARGET_LABELS = {
  teacher: 'Giảng viên',
  course: 'Khóa học',
  program: 'Chương trình',
};

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VIETNAM_TIMEZONE,
  });
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.draft
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function FeedbackTemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingDefaults, setSyncingDefaults] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailTemplate, setDetailTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [page, filterStatus, filterTarget, searchKeyword]);

  async function fetchTemplates() {
    setLoading(true);
    setError('');

    try {
      const response = await feedbackTemplateService.getFeedbackTemplates({
        page,
        limit: 10,
        keyword: searchKeyword || undefined,
        status: filterStatus || undefined,
        evaluationTarget: filterTarget || undefined,
      });

      const payload = response?.data || {};
      setTemplates(Array.isArray(payload.data) ? payload.data : []);
      setTotalPages(Number(payload.totalPages || 1));
      setTotal(Number(payload.total || 0));
    } catch (err) {
      console.error('Error fetching feedback templates:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách mẫu đánh giá.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedTemplate(null);
    setShowModal(true);
  }

  function openEditModal(template) {
    setSelectedTemplate(template);
    setShowModal(true);
  }

  async function openDetailModal(template) {
    try {
      const response = await feedbackTemplateService.getFeedbackTemplate(template._id);
      setDetailTemplate(response?.data?.data || null);
    } catch (err) {
      console.error('Error fetching feedback template detail:', err);
      setError(err.response?.data?.message || 'Không thể tải chi tiết mẫu đánh giá.');
    }
  }

  async function handleDelete(template) {
    if (!window.confirm(`Bạn có chắc muốn xóa mẫu "${template.templateName}" không?`)) {
      return;
    }

    try {
      await feedbackTemplateService.deleteFeedbackTemplate(template._id);
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting feedback template:', err);
      setError(err.response?.data?.message || 'Không thể xóa mẫu đánh giá.');
    }
  }

  async function handleChangeStatus(templateId, nextStatus) {
    try {
      await feedbackTemplateService.changeStatus(templateId, nextStatus);
      await fetchTemplates();
    } catch (err) {
      console.error('Error updating feedback template status:', err);
      setError(err.response?.data?.message || 'Không thể cập nhật trạng thái mẫu đánh giá.');
    }
  }

  async function handleSyncDefaults() {
    setSyncingDefaults(true);
    setError('');

    try {
      const response = await feedbackTemplateService.syncDefaultTemplates();
      await fetchTemplates();
      window.alert(response?.data?.message || 'Đã tạo các mẫu đánh giá mặc định.');
    } catch (err) {
      console.error('Error syncing default feedback templates:', err);
      setError(err.response?.data?.message || 'Không thể tạo bộ mẫu mặc định.');
    } finally {
      setSyncingDefaults(false);
    }
  }

  function resetFilters() {
    setPage(1);
    setFilterStatus('');
    setFilterTarget('');
    setSearchKeyword('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý mẫu đánh giá</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Tạo nhanh bộ mẫu mặc định cho giảng viên, khóa học và chương trình đào tạo, sau đó
            chỉnh sửa lại nội dung theo nhu cầu của trường.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSyncDefaults}
            disabled={syncingDefaults}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {syncingDefaults ? 'Đang tạo mẫu sẵn...' : 'Tạo mẫu mặc định'}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            + Tạo mẫu mới
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Tìm kiếm</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Tên mẫu hoặc mô tả"
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="draft">Dự thảo</option>
              <option value="active">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Đối tượng</label>
            <select
              value={filterTarget}
              onChange={(event) => {
                setFilterTarget(event.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="teacher">Giảng viên</option>
              <option value="course">Khóa học</option>
              <option value="program">Chương trình</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Đang tải danh sách mẫu đánh giá...</div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chưa có mẫu đánh giá nào. Bạn có thể bấm <strong>Tạo mẫu mặc định</strong> để sinh bộ
            mẫu sẵn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mẫu đánh giá
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Đối tượng
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Câu hỏi
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((template) => (
                  <tr key={template._id} className="align-top hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{template.templateName}</p>
                        {template.isSystemTemplate ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            Mẫu sẵn
                          </span>
                        ) : null}
                      </div>
                      {template.description ? (
                        <p className="mt-1 max-w-md text-sm text-slate-500">{template.description}</p>
                      ) : null}
                      {template.templateCode ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {template.templateCode}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {TARGET_LABELS[template.evaluationTarget] || template.evaluationTarget}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p>{formatDateTime(template.feedbackPeriod?.startDate)}</p>
                      <p className="mt-1">{formatDateTime(template.feedbackPeriod?.endDate)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={template.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {template.questions?.length || 0} câu
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailModal(template)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(template)}
                          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template)}
                          className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Xóa
                        </button>
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) {
                              handleChangeStatus(template._id, event.target.value);
                              event.target.value = '';
                            }
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          <option value="">Đổi trạng thái</option>
                          {template.status !== 'draft' ? <option value="draft">Dự thảo</option> : null}
                          {template.status !== 'active' ? <option value="active">Đang mở</option> : null}
                          {template.status !== 'closed' ? <option value="closed">Đã đóng</option> : null}
                          {template.status !== 'archived' ? (
                            <option value="archived">Lưu trữ</option>
                          ) : null}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-500">
            <p>
              Hiển thị {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} trên {total} mẫu
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-50"
              >
                Tiếp
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showModal ? (
        <FeedbackTemplateFormBuilder
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            fetchTemplates();
            setShowModal(false);
            setSelectedTemplate(null);
          }}
          templateData={selectedTemplate}
        />
      ) : null}

      {detailTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">{detailTemplate.templateName}</h3>
                  {detailTemplate.isSystemTemplate ? (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                      Mẫu sẵn
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">{detailTemplate.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTemplate(null)}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Đóng
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đối tượng</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {TARGET_LABELS[detailTemplate.evaluationTarget] || detailTemplate.evaluationTarget}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</p>
                <div className="mt-2">
                  <StatusBadge status={detailTemplate.status} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bắt đầu</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDateTime(detailTemplate.feedbackPeriod?.startDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kết thúc</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDateTime(detailTemplate.feedbackPeriod?.endDate)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-bold text-slate-900">
                Danh sách câu hỏi ({detailTemplate.questions?.length || 0})
              </h4>
              <div className="mt-4 space-y-3">
                {(detailTemplate.questions || []).map((question, index) => (
                  <div key={question._id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">
                        Câu {index + 1}. {question.questionText}
                      </p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {question.questionType}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {question.questionType === 'rating'
                        ? `Thang điểm ${question.ratingScale || 5} sao`
                        : question.questionType === 'text'
                          ? `Câu hỏi tự luận, tối đa ${question.maxLength || 500} ký tự`
                          : 'Câu hỏi trắc nghiệm một lựa chọn'}
                    </p>
                    {question.options?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.options.map((option) => (
                          <span
                            key={option._id || option.value}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            {option.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
