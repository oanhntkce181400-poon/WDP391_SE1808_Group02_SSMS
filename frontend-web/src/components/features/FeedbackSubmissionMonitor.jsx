import { useEffect, useState } from 'react';
import feedbackSubmissionService from '../../services/feedbackSubmissionService';
import feedbackTemplateService from '../../services/feedbackTemplateService';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

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

function scoreLabel(value) {
  const score = Number(value || 0);
  if (score >= 4.5) return 'Rất tốt';
  if (score >= 3.5) return 'Tốt';
  if (score >= 2.5) return 'Khá';
  if (score > 0) return 'Cần cải thiện';
  return 'Chưa có điểm';
}

export default function FeedbackSubmissionMonitor() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 12 });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [error, setError] = useState('');

  async function loadTemplates() {
    const response = await feedbackTemplateService.getFeedbackTemplates({
      page: 1,
      limit: 100,
      evaluationTarget: 'teacher',
    });

    setTemplates(Array.isArray(response?.data?.data) ? response.data.data : []);
  }

  async function loadSubmissions(nextPage = pagination.page) {
    setLoading(true);
    setError('');

    try {
      const response = await feedbackSubmissionService.getSubmissions({
        page: nextPage,
        limit: pagination.limit,
        evaluationType: 'teacher',
        feedbackTemplateId: selectedTemplateId || undefined,
      });

      setSubmissions(Array.isArray(response?.data?.data) ? response.data.data : []);
      setPagination((current) => ({
        ...current,
        ...(response?.data?.pagination || {}),
      }));
    } catch (err) {
      console.error('Error loading feedback submissions:', err);
      setError(err?.response?.data?.message || 'Không thể tải danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    loadSubmissions(1);
  }, [selectedTemplateId]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Theo dõi phản hồi đã gửi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Danh sách này lấy trực tiếp từ `feedback-submissions`, cùng nguồn dữ liệu với
              trang sinh viên và dashboard thống kê.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">Tất cả mẫu giảng viên</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.templateName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadSubmissions(pagination.page)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tổng phản hồi</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Mẫu đang lọc</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {templates.find((item) => item._id === selectedTemplateId)?.templateName || 'Tất cả'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Số trang</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.totalPages || 1}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Đang tải danh sách phản hồi...
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Chưa có phản hồi nào khớp bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const classSection = submission.classSection;
              const template = submission.feedbackTemplate;
              const teacherName = classSection?.teacher?.fullName || 'Chưa có giảng viên';
              const subjectName = classSection?.subject?.subjectName || classSection?.className || 'Môn học';
              const subjectCode = classSection?.subject?.subjectCode || 'N/A';

              return (
                <div key={submission._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          {subjectCode}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {template?.templateName || 'Mẫu đánh giá'}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-900">{subjectName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {classSection?.classCode || 'N/A'} · {classSection?.className || 'Lớp học'}
                      </p>
                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold">Giảng viên:</span> {teacherName}
                        </p>
                        <p>
                          <span className="font-semibold">Gửi lúc:</span> {formatDateTime(submission.createdAt)}
                        </p>
                        <p>
                          <span className="font-semibold">Số câu trả lời:</span>{' '}
                          {submission.responses?.length || 0}
                        </p>
                        <p>
                          <span className="font-semibold">Điểm trung bình:</span>{' '}
                          {Number(submission.submissionScore || 0).toFixed(2)} · {scoreLabel(submission.submissionScore)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-700">Trạng thái</p>
                      <p className="mt-1 text-emerald-700">Đã gửi</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
            <p>
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadSubmissions(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => loadSubmissions(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-50"
              >
                Tiếp
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
