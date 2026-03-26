import { useEffect, useMemo, useState } from 'react';
import feedbackService from '../../services/feedbackService';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const CRITERIA = [
  ['teachingQuality', 'Chất lượng giảng dạy'],
  ['courseContent', 'Nội dung môn học'],
  ['classEnvironment', 'Môi trường lớp học'],
  ['materialQuality', 'Chất lượng tài liệu'],
];

const emptyForm = () => ({
  rating: 0,
  comment: '',
  isAnonymous: true,
  criteria: Object.fromEntries(CRITERIA.map(([key]) => [key, 0])),
});

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleDateString('vi-VN', { timeZone: VIETNAM_TIMEZONE });
};

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: VIETNAM_TIMEZONE,
      });
};

const formatDuration = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 phút';
  }

  const totalSeconds = Math.floor(value / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (days === 0 && hours === 0) parts.push(`${seconds} giây`);

  return parts.slice(0, 3).join(' ');
};

const formatSentiment = (value) =>
  ({
    excellent: 'Xuất sắc',
    'very good': 'Rất tốt',
    good: 'Tốt',
    average: 'Trung bình',
    fair: 'Khá thấp',
    poor: 'Thấp',
    'no feedback yet': 'Chưa có đánh giá',
  }[String(value || '').toLowerCase()] ||
    value ||
    'N/A');

const normalizeClasses = (rows = []) =>
  rows.map((item) => ({
    id: item._id,
    code: item.subject?.subjectCode || item.subjectCode || 'N/A',
    name: item.className || 'Lớp học',
    subjectName:
      item.subject?.subjectName || item.subjectName || item.className || 'Môn học',
    teacher: item.teacher?.fullName || 'Chưa phân công giảng viên',
    room:
      item.room?.roomNumber ||
      item.room?.roomCode ||
      item.room?.roomName ||
      'Chưa có phòng',
    semester: item.semester || 'N/A',
    academicYear: item.academicYear || 'N/A',
    classCode: item.classCode || item.sectionCode || 'N/A',
  }));

const normalizeMyFeedback = (rows = []) =>
  rows.map((item) => ({
    id: item._id,
    classSectionId: item.classSection?._id || item.classSection,
    code: item.classSection?.subject?.subjectCode || item.classSection?.subjectCode || 'N/A',
    className: item.classSection?.className || 'Lớp học',
    teacher: item.classSection?.teacher?.fullName || 'Chưa phân công giảng viên',
    rating: Number(item.rating || 0),
    comment: item.comment || '',
    isAnonymous: item.isAnonymous !== false,
    criteria: item.criteria || {},
    createdAt: item.createdAt,
  }));

const normalizePending = (rows = []) =>
  rows.map((item) => ({
    id: item._id,
    code: item.classSection?.subject?.subjectCode || 'N/A',
    className: item.classSection?.className || 'Lớp học',
    teacher: item.classSection?.teacher?.fullName || 'Chưa phân công giảng viên',
    rating: Number(item.rating || 0),
    comment: item.comment || '',
    createdAt: item.createdAt,
  }));

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={star <= value ? 'text-amber-400' : 'text-slate-300'}
        >
          {'★'}
        </button>
      ))}
    </div>
  );
}

export default function LecturerFeedbackPortal({
  mode = 'student',
  title,
  description,
  showModeration = false,
}) {
  const isStudent = mode === 'student';
  const [classes, setClasses] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classFeedbacks, setClassFeedbacks] = useState([]);
  const [classStats, setClassStats] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [tab, setTab] = useState('classes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moderatingId, setModeratingId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [feedbackAvailability, setFeedbackAvailability] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) || null,
    [classes, selectedClassId],
  );
  const currentFeedback = useMemo(
    () => myFeedbacks.find((item) => item.classSectionId === selectedClassId) || null,
    [myFeedbacks, selectedClassId],
  );

  async function loadBaseData() {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (isStudent) {
        const availabilityRes = await feedbackService.getFeedbackAvailability();
        const availabilityData = availabilityRes?.data?.data || null;
        setFeedbackAvailability(availabilityData);

        if (availabilityData?.isOpen !== true) {
          setClasses([]);
          setMyFeedbacks([]);
          setSelectedClassId('');
          setClassFeedbacks([]);
          setClassStats(null);
          return;
        }

        const [classesRes, myRes] = await Promise.all([
          feedbackService.getMyClasses(),
          feedbackService.getMyFeedback(),
        ]);
        const nextClasses = normalizeClasses(classesRes?.data?.data || []);
        const nextMine = normalizeMyFeedback(myRes?.data?.data || []);
        const nextSelected = nextClasses.some((item) => item.id === selectedClassId)
          ? selectedClassId
          : nextClasses[0]?.id || '';
        setClasses(nextClasses);
        setMyFeedbacks(nextMine);
        setSelectedClassId(nextSelected);
      } else {
        setFeedbackAvailability(null);
        const [classesRes, pendingRes] = await Promise.all([
          feedbackService.getClassList(),
          showModeration ? feedbackService.getPendingFeedback(50, 0) : Promise.resolve(null),
        ]);
        const nextClasses = normalizeClasses(classesRes?.data?.data || []);
        const nextSelected = nextClasses.some((item) => item.id === selectedClassId)
          ? selectedClassId
          : nextClasses[0]?.id || '';
        setClasses(nextClasses);
        setMyFeedbacks([]);
        setPendingFeedbacks(normalizePending(pendingRes?.data?.data || []));
        setSelectedClassId(nextSelected);
      }
    } catch (error) {
      console.error('Error loading feedback base data:', error);
      if (isStudent) {
        setFeedbackAvailability(null);
      }
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể tải dữ liệu đánh giá.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadClassDetails(classSectionId) {
    if (!classSectionId) {
      setClassFeedbacks([]);
      setClassStats(null);
      return;
    }
    try {
      const [feedbackRes, statsRes] = await Promise.all([
        feedbackService.getClassFeedback(classSectionId),
        feedbackService.getClassFeedbackStats(classSectionId),
      ]);
      setClassFeedbacks(feedbackRes?.data?.data || []);
      setClassStats(statsRes?.data?.data || null);
    } catch (error) {
      console.error('Error loading class feedback detail:', error);
      setMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'Không thể tải chi tiết đánh giá của lớp.',
      });
    }
  }

  useEffect(() => {
    loadBaseData();
  }, [isStudent, showModeration]);

  useEffect(() => {
    if (!isStudent) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isStudent]);

  useEffect(() => {
    setForm(
      currentFeedback
        ? { ...emptyForm(), ...currentFeedback, criteria: { ...emptyForm().criteria, ...currentFeedback.criteria } }
        : emptyForm(),
    );
    loadClassDetails(selectedClassId);
  }, [selectedClassId, currentFeedback?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedClassId || !form.rating) {
      setMessage({
        type: 'error',
        text:
          'Vui lòng chọn lớp và chấm điểm tổng thể trước khi gửi.',
      });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        classSection: selectedClassId,
        rating: Number(form.rating),
        comment: form.comment.trim(),
        isAnonymous: form.isAnonymous,
        criteria: Object.fromEntries(
          Object.entries(form.criteria).filter(([, value]) => Number(value) > 0),
        ),
      };
      if (currentFeedback) {
        await feedbackService.updateFeedback(currentFeedback.id, payload);
      } else {
        await feedbackService.submitFeedback(payload);
      }
      setMessage({
        type: 'success',
        text: currentFeedback
          ? 'Cập nhật đánh giá thành công.'
          : 'Gửi đánh giá thành công.',
      });
      await loadBaseData();
      await loadClassDetails(selectedClassId);
    } catch (error) {
      console.error('Error saving feedback:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể lưu đánh giá.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function moderateFeedback(feedbackId, action) {
    try {
      setModeratingId(feedbackId);
      const reason =
        action === 'reject'
          ? window.prompt(
              'Nhập lý do từ chối:',
              'Nội dung chưa phù hợp',
            )
          : null;
      if (action === 'reject' && !reason) return;
      if (action === 'approve') {
        await feedbackService.approveFeedback(feedbackId);
      } else {
        await feedbackService.rejectFeedback(feedbackId, reason);
      }
      setMessage({
        type: 'success',
        text:
          action === 'approve'
            ? 'Đã duyệt đánh giá.'
            : 'Đã từ chối đánh giá.',
      });
      await loadBaseData();
      if (selectedClassId) await loadClassDetails(selectedClassId);
    } catch (error) {
      console.error('Error moderating feedback:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể xử lý đánh giá.',
      });
    } finally {
      setModeratingId('');
    }
  }

  const liveFeedbackAvailability = useMemo(() => {
    if (!feedbackAvailability) {
      return null;
    }

    const currentMs = now.getTime();
    const startMs = feedbackAvailability.startsAt
      ? new Date(feedbackAvailability.startsAt).getTime()
      : null;
    const endMs = feedbackAvailability.endsAt
      ? new Date(feedbackAvailability.endsAt).getTime()
      : null;
    const autoRuntimeStates = new Set(['open', 'scheduled']);

    if (
      autoRuntimeStates.has(feedbackAvailability.state) &&
      Number.isFinite(startMs) &&
      Number.isFinite(endMs)
    ) {
      if (currentMs < startMs) {
        return {
          ...feedbackAvailability,
          isOpen: false,
          state: 'scheduled',
          message: `Đợt đánh giá giảng viên sẽ mở từ ${formatDateTime(
            feedbackAvailability.startsAt,
          )}.`,
        };
      }

      if (currentMs >= startMs && currentMs <= endMs) {
        return {
          ...feedbackAvailability,
          isOpen: true,
          state: 'open',
          message: `Đợt đánh giá giảng viên đang mở đến ${formatDateTime(
            feedbackAvailability.endsAt,
          )}.`,
        };
      }

      if (currentMs > endMs) {
        return {
          ...feedbackAvailability,
          isOpen: false,
          state: 'closed',
          message: `Đợt đánh giá giảng viên đã kết thúc vào ${formatDateTime(
            feedbackAvailability.endsAt,
          )}.`,
        };
      }
    }

    return feedbackAvailability;
  }, [feedbackAvailability, now]);

  const availabilityCountdown = useMemo(() => {
    if (!liveFeedbackAvailability) {
      return null;
    }

    const target = liveFeedbackAvailability.isOpen
      ? liveFeedbackAvailability.endsAt
      : liveFeedbackAvailability.startsAt;

    if (!target) {
      return null;
    }

    const remainingMs = new Date(target).getTime() - now.getTime();
    if (remainingMs <= 0) {
      return null;
    }

    return liveFeedbackAvailability.isOpen
      ? `Còn lại ${formatDuration(remainingMs)} để sinh viên gửi feedback.`
      : `Còn ${formatDuration(remainingMs)} nữa sẽ mở feedback.`;
  }, [liveFeedbackAvailability, now]);

  const isFeedbackClosed =
    isStudent && liveFeedbackAvailability && !liveFeedbackAvailability.isOpen;

  if (loading && !classes.length) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        {'Đang tải dữ liệu đánh giá giảng viên...'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            {isStudent ? (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setTab('classes')}
                  className={`rounded-full px-4 py-2 ${tab === 'classes' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  {'Theo lớp'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('mine')}
                  className={`rounded-full px-4 py-2 ${tab === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  {'Đánh giá của tôi'}
                </button>
              </div>
            ) : (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                {'Chế độ xem của quản trị viên / nhân viên'}
              </div>
            )}
            <button
              type="button"
              onClick={loadBaseData}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {'Làm mới'}
            </button>
          </div>
        </div>
      </div>

      {message.text ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {isStudent && liveFeedbackAvailability ? (
        <div
          className={`rounded-3xl border p-5 shadow-sm ${
            liveFeedbackAvailability.isOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {liveFeedbackAvailability.isOpen ? 'Đợt feedback đang mở' : 'Đợt feedback chưa mở'}
              </p>
              <h2 className="mt-2 text-xl font-bold">{liveFeedbackAvailability.message}</h2>
              <p className="mt-2 text-sm leading-6">
                {liveFeedbackAvailability.templateName
                  ? `Mẫu đang áp dụng: ${liveFeedbackAvailability.templateName}.`
                  : 'Quản trị viên chưa cấu hình mẫu feedback khả dụng cho sinh viên.'}
              </p>
              <p className="mt-2 text-sm font-medium">
                Bây giờ: {formatDateTime(now)}
              </p>
              {availabilityCountdown ? (
                <p className="mt-1 text-sm font-medium text-sky-700">{availabilityCountdown}</p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
              <p>
                <span className="font-semibold">Bắt đầu:</span>{' '}
                {liveFeedbackAvailability.startsAtLabel || 'Chưa thiết lập'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Kết thúc:</span>{' '}
                {liveFeedbackAvailability.endsAtLabel || 'Chưa thiết lập'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showModeration && !isStudent ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {'Đánh giá chờ duyệt'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {'Luồng này dùng chung API /api/feedbacks với mobile và web student.'}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {pendingFeedbacks.length} {'mục'}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {pendingFeedbacks.length ? (
              pendingFeedbacks.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {item.code}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{item.className}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {'Giảng viên: '} {item.teacher}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {'Ngày gửi: '} {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                      {item.rating}/5
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    {item.comment || 'Chưa có nhận xét chi tiết.'}
                  </p>
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={moderatingId === item.id}
                      onClick={() => moderateFeedback(item.id, 'reject')}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      {'Từ chối'}
                    </button>
                    <button
                      type="button"
                      disabled={moderatingId === item.id}
                      onClick={() => moderateFeedback(item.id, 'approve')}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Duyệt
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {'Chưa có đánh giá nào đang chờ duyệt.'}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isFeedbackClosed ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-2xl font-bold text-slate-900">
              Hiện chưa đến thời gian đánh giá giảng viên
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Khi quản trị viên mở đợt feedback, hệ thống sẽ hiển thị danh sách lớp và form đánh
              giá ngay tại trang này.
            </p>
            {liveFeedbackAvailability?.startsAt ? (
              <p className="mt-4 text-sm font-medium text-sky-700">
                Thời gian dự kiến: {formatDateTime(liveFeedbackAvailability.startsAt)}
              </p>
            ) : null}
          </div>
        </div>
      ) : isStudent && tab === 'mine' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {myFeedbacks.length ? (
            myFeedbacks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(item.classSectionId);
                  setTab('classes');
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">{item.code}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{item.className}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {'Giảng viên: '} {item.teacher}
                </p>
                <p className="mt-3 text-sm text-slate-700">
                  {item.comment || 'Chưa có nhận xét chi tiết.'}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {'Đã gửi: '} {formatDate(item.createdAt)}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              {'Bạn chưa có đánh giá nào.'}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-semibold text-slate-700">
              {'Chọn lớp học'}
            </label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">{'Chọn một lớp học'}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.classCode} - {item.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClass ? (
            <>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                  {selectedClass.code}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">{selectedClass.subjectName}</h2>
                <p className="mt-2 text-sm text-slate-500">{selectedClass.name}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'Giảng viên'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.teacher}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'Học kỳ'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.semester}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'Năm học'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedClass.academicYear}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'Phòng'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.room}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'Tổng đánh giá'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {classStats?.totalFeedback ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'Điểm trung bình'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {classStats?.averageRating ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'Cảm nhận chung'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatSentiment(classStats?.sentiment)}
                  </p>
                </div>
              </div>

              {isStudent ? (
                <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-xl font-bold text-slate-900">
                    {currentFeedback
                      ? 'Cập nhật đánh giá của bạn'
                      : 'Gửi đánh giá của bạn'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {currentFeedback
                      ? 'Bạn có thể sửa lại đánh giá đã gửi ngay trên flow thống nhất này.'
                      : 'Đánh giá của bạn sẽ được dùng chung cho mobile app, web student và web admin.'}
                  </p>
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700">
                      {'Đánh giá tổng thể'}
                    </label>
                    <div className="mt-3">
                      <Stars
                        value={form.rating}
                        onChange={(value) => setForm((prev) => ({ ...prev, rating: value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {CRITERIA.map(([key, label]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className="block text-sm font-semibold text-slate-700">{label}</label>
                        <div className="mt-3">
                          <Stars
                            value={form.criteria[key]}
                            onChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                criteria: { ...prev.criteria, [key]: value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700">
                      {'Nhận xét'}
                    </label>
                    <textarea
                      value={form.comment}
                      onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                      rows={5}
                      placeholder="Chia sẻ trải nghiệm học tập của bạn..."
                      className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700"
                    />
                  </div>
                  {!currentFeedback ? (
                    <label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        checked={form.isAnonymous}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, isAnonymous: event.target.checked }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-700">
                          {'Đánh giá ẩn danh'}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {'Tên của bạn sẽ không xuất hiện trong danh sách công khai.'}
                        </span>
                      </span>
                    </label>
                  ) : null}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? 'Đang lưu...'
                        : currentFeedback
                          ? 'Cập nhật đánh giá'
                          : 'Gửi đánh giá'}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xl font-bold text-slate-900">
                  {'Đánh giá công khai của lớp'}
                </h3>
                <div className="mt-5 space-y-4">
                  {classFeedbacks.length ? (
                    classFeedbacks.map((item) => (
                      <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-lg font-bold text-amber-500">
                              {'\u2605'.repeat(item.rating)}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">{formatDate(item.createdAt)}</p>
                          </div>
                          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {item.isAnonymous
                            ? 'Đánh giá ẩn danh'
                            : 'Đánh giá có tên'}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-700">
                          {item.comment || 'Chưa có nhận xét chi tiết.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      {'Chưa có đánh giá công khai nào cho lớp học này.'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              {'Chọn một lớp học để xem đánh giá và thống kê.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
