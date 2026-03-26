import { useEffect, useMemo, useState } from 'react';
import feedbackService from '../../services/feedbackService';
import feedbackSubmissionService from '../../services/feedbackSubmissionService';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa thiết lập';
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

function formatDuration(value) {
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
}

function normalizeClassItem(item) {
  return {
    id: item?._id || '',
    classCode: item?.classCode || 'N/A',
    className: item?.className || 'Lớp học',
    subjectId: item?.subject?._id || '',
    subjectCode: item?.subject?.subjectCode || 'N/A',
    subjectName: item?.subject?.subjectName || item?.className || 'Môn học',
    teacherId: item?.teacher?._id || '',
    teacherName: item?.teacher?.fullName || 'Chưa phân công giảng viên',
    semester: item?.semester || 'N/A',
    academicYear: item?.academicYear || 'N/A',
    room:
      item?.room?.roomNumber ||
      item?.room?.roomCode ||
      item?.room?.roomName ||
      'Chưa có phòng',
  };
}

function createEmptyResponses(template) {
  return (template?.questions || []).map((question) => ({
    questionId: question._id,
    questionText: question.questionText,
    questionType: question.questionType,
    answer: question.questionType === 'rating' ? 0 : '',
  }));
}

function mapSubmissionToResponses(template, submission) {
  const answerMap = new Map(
    (submission?.responses || []).map((response) => [String(response.questionId), response.answer]),
  );

  return (template?.questions || []).map((question) => ({
    questionId: question._id,
    questionText: question.questionText,
    questionType: question.questionType,
    answer:
      answerMap.get(String(question._id)) ??
      (question.questionType === 'rating' ? 0 : ''),
  }));
}

function getSubmissionScore(submission) {
  const score = Number(submission?.submissionScore);
  return Number.isFinite(score) ? score.toFixed(2) : '0.00';
}

function RatingInput({ value, onChange, readOnly = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = Number(value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-bold transition ${
              active
                ? 'border-amber-300 bg-amber-400 text-white'
                : 'border-slate-200 bg-white text-slate-400'
            } ${readOnly ? 'cursor-default' : 'hover:border-amber-200 hover:bg-amber-50'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function ReadOnlyAnswer({ question, answer }) {
  if (question.questionType === 'rating') {
    return (
      <div className="flex items-center gap-3">
        <div className="text-lg text-amber-500">{'★'.repeat(Number(answer || 0))}</div>
        <span className="text-sm font-medium text-slate-600">{answer || 0}/5</span>
      </div>
    );
  }

  return (
    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
      {answer || 'Không có câu trả lời.'}
    </p>
  );
}

export default function StudentFeedbackCampaignPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [responses, setResponses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(() => new Date());

  const template = useMemo(() => availability?.template || null, [availability]);

  const liveAvailability = useMemo(() => {
    if (!availability) {
      return null;
    }

    const currentMs = now.getTime();
    const startMs = availability.startsAt ? new Date(availability.startsAt).getTime() : NaN;
    const endMs = availability.endsAt ? new Date(availability.endsAt).getTime() : NaN;
    const state = String(availability.state || '').toLowerCase();

    if (state === 'active' || state === 'open' || state === 'scheduled') {
      if (Number.isFinite(startMs) && currentMs < startMs) {
        return {
          ...availability,
          isOpen: false,
          state: 'scheduled',
          message: `Đợt đánh giá sẽ mở từ ${formatDateTime(availability.startsAt)}.`,
        };
      }

      if (Number.isFinite(startMs) && Number.isFinite(endMs) && currentMs >= startMs && currentMs <= endMs) {
        return {
          ...availability,
          isOpen: true,
          state: 'open',
          message: `Đợt đánh giá đang mở đến ${formatDateTime(availability.endsAt)}.`,
        };
      }

      if (Number.isFinite(endMs) && currentMs > endMs) {
        return {
          ...availability,
          isOpen: false,
          state: 'closed',
          message: `Đợt đánh giá gần nhất đã kết thúc vào ${formatDateTime(availability.endsAt)}.`,
        };
      }
    }

    return availability;
  }, [availability, now]);

  const eligibleClasses = useMemo(() => {
    if (!template) {
      return [];
    }

    return classes.filter((item) => {
      if (!item.teacherId) {
        return false;
      }

      if (template.classSection && String(template.classSection._id || template.classSection) !== String(item.id)) {
        return false;
      }

      if (template.subject && String(template.subject._id || template.subject) !== String(item.subjectId || '')) {
        return false;
      }

      return true;
    });
  }, [classes, template]);

  const selectedClass = useMemo(
    () => eligibleClasses.find((item) => item.id === selectedClassId) || null,
    [eligibleClasses, selectedClassId],
  );

  const submissionByClassId = useMemo(() => {
    return new Map(
      submissions
        .filter((submission) => submission.classSection?._id)
        .map((submission) => [String(submission.classSection._id), submission]),
    );
  }, [submissions]);

  const currentSubmission = useMemo(() => {
    return selectedClassId ? submissionByClassId.get(String(selectedClassId)) || null : null;
  }, [selectedClassId, submissionByClassId]);

  const submittedCount = eligibleClasses.filter((item) =>
    submissionByClassId.has(String(item.id)),
  ).length;
  const pendingCount = Math.max(eligibleClasses.length - submittedCount, 0);

  const availabilityCountdown = useMemo(() => {
    if (!liveAvailability) {
      return null;
    }

    const target = liveAvailability.isOpen ? liveAvailability.endsAt : liveAvailability.startsAt;
    if (!target) {
      return null;
    }

    const remainingMs = new Date(target).getTime() - now.getTime();
    if (remainingMs <= 0) {
      return null;
    }

    return liveAvailability.isOpen
      ? `Còn lại ${formatDuration(remainingMs)} để hoàn thành đánh giá.`
      : `Còn ${formatDuration(remainingMs)} nữa sẽ mở đánh giá.`;
  }, [liveAvailability, now]);

  async function loadPageData() {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const [availabilityRes, classesRes] = await Promise.all([
        feedbackService.getFeedbackAvailability(),
        feedbackService.getMyClasses(),
      ]);

      const nextAvailability = availabilityRes?.data?.data || null;
      const nextClasses = Array.isArray(classesRes?.data?.data)
        ? classesRes.data.data.map(normalizeClassItem)
        : [];

      setAvailability(nextAvailability);
      setClasses(nextClasses);

      if (nextAvailability?.template?._id) {
        const submissionRes = await feedbackSubmissionService.getMySubmissions({
          feedbackTemplateId: nextAvailability.template._id,
          evaluationType: 'teacher',
        });
        setSubmissions(Array.isArray(submissionRes?.data?.data) ? submissionRes.data.data : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading student feedback page:', error);
      setMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'Không thể tải dữ liệu đánh giá giảng viên lúc này.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!template) {
      setResponses([]);
      return;
    }

    if (currentSubmission) {
      setResponses(mapSubmissionToResponses(template, currentSubmission));
      return;
    }

    setResponses(createEmptyResponses(template));
  }, [template, currentSubmission?._id, selectedClassId]);

  useEffect(() => {
    if (!eligibleClasses.length) {
      setSelectedClassId('');
      return;
    }

    const stillExists = eligibleClasses.some((item) => item.id === selectedClassId);
    if (stillExists) {
      return;
    }

    const firstPendingClass = eligibleClasses.find(
      (item) => !submissionByClassId.has(String(item.id)),
    );

    setSelectedClassId(firstPendingClass?.id || eligibleClasses[0]?.id || '');
  }, [eligibleClasses, selectedClassId, submissionByClassId]);

  function updateResponse(questionId, answer) {
    setResponses((current) =>
      current.map((response) =>
        String(response.questionId) === String(questionId)
          ? { ...response, answer }
          : response,
      ),
    );
  }

  function validateBeforeSubmit() {
    if (!template) {
      return 'Hiện chưa có mẫu đánh giá khả dụng.';
    }

    if (!selectedClass) {
      return 'Vui lòng chọn lớp học để gửi đánh giá.';
    }

    for (const question of template.questions || []) {
      const response = responses.find(
        (item) => String(item.questionId) === String(question._id),
      );
      const answer = response?.answer;

      if (question.isRequired && !answer) {
        return `Vui lòng trả lời câu hỏi: ${question.questionText}`;
      }
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setMessage({ type: 'error', text: validationMessage });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await feedbackSubmissionService.submitFeedback({
        feedbackTemplateId: template._id,
        evaluatedEntityId: selectedClass.teacherId,
        evaluationType: 'teacher',
        classSectionId: selectedClass.id,
        responses: responses.filter((response) => response.answer),
      });

      await loadPageData();

      setMessage({
        type: 'success',
        text: `Đã gửi đánh giá cho lớp ${selectedClass.classCode} thành công.`,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Không thể gửi đánh giá lúc này.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        Đang tải cổng đánh giá giảng viên...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Đánh giá giảng viên</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Sinh viên chọn lớp học đang tham gia để gửi đánh giá theo mẫu mà quản trị viên đã mở.
              Dữ liệu đánh giá sẽ được dùng trực tiếp cho thống kê và báo cáo phản hồi.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPageData}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Làm mới
          </button>
        </div>
      </div>

      {message.text ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border border-rose-200 bg-rose-50 text-rose-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {liveAvailability ? (
        <div
          className={`rounded-3xl border p-5 shadow-sm ${
            liveAvailability.isOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {liveAvailability.isOpen ? 'Đợt feedback đang mở' : 'Đợt feedback chưa mở'}
              </p>
              <h2 className="mt-2 text-xl font-bold">{liveAvailability.message}</h2>
              <p className="mt-2 text-sm leading-6">
                {template?.templateName
                  ? `Mẫu hiện tại: ${template.templateName}.`
                  : 'Hiện chưa có mẫu đánh giá giảng viên nào được cấu hình.'}
              </p>
              <p className="mt-2 text-sm font-medium">Bây giờ: {formatDateTime(now)}</p>
              {availabilityCountdown ? (
                <p className="mt-1 text-sm font-medium text-sky-700">{availabilityCountdown}</p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
              <p>
                <span className="font-semibold">Bắt đầu:</span>{' '}
                {liveAvailability.startsAtLabel || 'Chưa thiết lập'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Kết thúc:</span>{' '}
                {liveAvailability.endsAtLabel || 'Chưa thiết lập'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!liveAvailability?.isOpen ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-2xl font-bold text-slate-900">
              Hiện chưa có đợt đánh giá giảng viên đang mở
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Khi quản trị viên mở đợt feedback, hệ thống sẽ tự hiển thị danh sách lớp và biểu mẫu
              đánh giá ngay trên trang này.
            </p>
          </div>
        </div>
      ) : eligibleClasses.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-2xl font-bold text-slate-900">Chưa có lớp phù hợp để đánh giá</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Bạn chưa có lớp đang học phù hợp với mẫu đánh giá hiện tại, hoặc lớp chưa được gán giảng viên.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tổng lớp có thể đánh giá</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{eligibleClasses.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Đã hoàn thành</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{submittedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Còn lại</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-4">
              {eligibleClasses.map((item) => {
                const submission = submissionByClassId.get(String(item.id));
                const active = selectedClassId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedClassId(item.id)}
                    className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
                      active
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                          {item.subjectCode}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">{item.subjectName}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.classCode} · {item.className}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          submission
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {submission ? 'Đã gửi' : 'Chưa gửi'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold">Giảng viên:</span> {item.teacherName}
                      </p>
                      <p>
                        <span className="font-semibold">Học kỳ:</span> {item.semester} · {item.academicYear}
                      </p>
                      <p>
                        <span className="font-semibold">Phòng:</span> {item.room}
                      </p>
                    </div>
                    {submission ? (
                      <p className="mt-4 text-xs font-medium text-emerald-700">
                        Đã gửi lúc {formatDateTime(submission.createdAt)}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {selectedClass ? (
              <div className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                    {selectedClass.subjectCode}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">{selectedClass.subjectName}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedClass.classCode} · {selectedClass.className}
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giảng viên</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.teacherName}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Học kỳ</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.semester}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Năm học</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.academicYear}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phòng</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.room}</p>
                    </div>
                  </div>
                </div>

                {currentSubmission ? (
                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Bạn đã hoàn thành đánh giá lớp này</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Dữ liệu đã được lưu vào hệ thống thống kê phản hồi. Bạn có thể xem lại câu trả lời ngay bên dưới.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        Điểm trung bình: {getSubmissionScore(currentSubmission)}
                      </div>
                    </div>
                    <div className="mt-6 space-y-4">
                      {template?.questions?.map((question) => {
                        const response = responses.find(
                          (item) => String(item.questionId) === String(question._id),
                        );
                        return (
                          <div key={question._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="font-semibold text-slate-900">{question.questionText}</p>
                            <div className="mt-3">
                              <ReadOnlyAnswer question={question} answer={response?.answer} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Biểu mẫu đánh giá</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Hãy chia sẻ cảm nhận của bạn để nhà trường và giảng viên có dữ liệu cải thiện chất lượng giảng dạy.
                    </p>

                    <div className="mt-6 space-y-4">
                      {(template?.questions || []).map((question) => {
                        const response = responses.find(
                          (item) => String(item.questionId) === String(question._id),
                        );

                        return (
                          <div key={question._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-slate-900">{question.questionText}</p>
                              {question.isRequired ? (
                                <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                  Bắt buộc
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4">
                              {question.questionType === 'rating' ? (
                                <RatingInput
                                  value={response?.answer || 0}
                                  onChange={(value) => updateResponse(question._id, value)}
                                />
                              ) : null}

                              {question.questionType === 'text' ? (
                                <textarea
                                  value={response?.answer || ''}
                                  onChange={(event) => updateResponse(question._id, event.target.value)}
                                  rows={4}
                                  maxLength={question.maxLength || 500}
                                  placeholder="Nhập câu trả lời của bạn..."
                                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700"
                                />
                              ) : null}

                              {question.questionType === 'multipleChoice' ? (
                                <div className="space-y-2">
                                  {(question.options || []).map((option) => (
                                    <label
                                      key={option._id || option.value}
                                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${question._id}`}
                                        value={option.value}
                                        checked={String(response?.answer || '') === String(option.value)}
                                        onChange={(event) => updateResponse(question._id, event.target.value)}
                                      />
                                      <span>{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
