import { useEffect, useMemo, useState } from 'react';
import feedbackService from '../../services/feedbackService';

const CRITERIA = [
  ['teachingQuality', 'Ch\u1ea5t l\u01b0\u1ee3ng gi\u1ea3ng d\u1ea1y'],
  ['courseContent', 'N\u1ed9i dung m\u00f4n h\u1ecdc'],
  ['classEnvironment', 'M\u00f4i tr\u01b0\u1eddng l\u1edbp h\u1ecdc'],
  ['materialQuality', 'Ch\u1ea5t l\u01b0\u1ee3ng t\u00e0i li\u1ec7u'],
];

const emptyForm = () => ({
  rating: 0,
  comment: '',
  isAnonymous: true,
  criteria: Object.fromEntries(CRITERIA.map(([key]) => [key, 0])),
});

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('vi-VN');
};

const formatSentiment = (value) =>
  ({
    excellent: 'Xu\u1ea5t s\u1eafc',
    'very good': 'R\u1ea5t t\u1ed1t',
    good: 'T\u1ed1t',
    average: 'Trung b\u00ecnh',
    fair: 'Kh\u00e1 th\u1ea5p',
    poor: 'Th\u1ea5p',
    'no feedback yet': 'Ch\u01b0a c\u00f3 \u0111\u00e1nh gi\u00e1',
  }[String(value || '').toLowerCase()] ||
    value ||
    'N/A');

const normalizeClasses = (rows = []) =>
  rows.map((item) => ({
    id: item._id,
    code: item.subject?.subjectCode || item.subjectCode || 'N/A',
    name: item.className || 'L\u1edbp h\u1ecdc',
    subjectName:
      item.subject?.subjectName || item.subjectName || item.className || 'M\u00f4n h\u1ecdc',
    teacher: item.teacher?.fullName || 'Ch\u01b0a ph\u00e2n c\u00f4ng gi\u1ea3ng vi\u00ean',
    room:
      item.room?.roomNumber ||
      item.room?.roomCode ||
      item.room?.roomName ||
      'Ch\u01b0a c\u00f3 ph\u00f2ng',
    semester: item.semester || 'N/A',
    academicYear: item.academicYear || 'N/A',
    classCode: item.classCode || item.sectionCode || 'N/A',
  }));

const normalizeMyFeedback = (rows = []) =>
  rows.map((item) => ({
    id: item._id,
    classSectionId: item.classSection?._id || item.classSection,
    code: item.classSection?.subject?.subjectCode || item.classSection?.subjectCode || 'N/A',
    className: item.classSection?.className || 'L\u1edbp h\u1ecdc',
    teacher: item.classSection?.teacher?.fullName || 'Ch\u01b0a ph\u00e2n c\u00f4ng gi\u1ea3ng vi\u00ean',
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
    className: item.classSection?.className || 'L\u1edbp h\u1ecdc',
    teacher: item.classSection?.teacher?.fullName || 'Ch\u01b0a ph\u00e2n c\u00f4ng gi\u1ea3ng vi\u00ean',
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
          {'\u2605'}
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
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u \u0111\u00e1nh gi\u00e1.',
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
          'Kh\u00f4ng th\u1ec3 t\u1ea3i chi ti\u1ebft \u0111\u00e1nh gi\u00e1 c\u1ee7a l\u1edbp.',
      });
    }
  }

  useEffect(() => {
    loadBaseData();
  }, [isStudent, showModeration]);

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
          'Vui l\u00f2ng ch\u1ecdn l\u1edbp v\u00e0 ch\u1ea5m \u0111i\u1ec3m t\u1ed5ng th\u1ec3 tr\u01b0\u1edbc khi g\u1eedi.',
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
          ? 'C\u1eadp nh\u1eadt \u0111\u00e1nh gi\u00e1 th\u00e0nh c\u00f4ng.'
          : 'G\u1eedi \u0111\u00e1nh gi\u00e1 th\u00e0nh c\u00f4ng.',
      });
      await loadBaseData();
      await loadClassDetails(selectedClassId);
    } catch (error) {
      console.error('Error saving feedback:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Kh\u00f4ng th\u1ec3 l\u01b0u \u0111\u00e1nh gi\u00e1.',
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
              'Nh\u1eadp l\u00fd do t\u1eeb ch\u1ed1i:',
              'N\u1ed9i dung ch\u01b0a ph\u00f9 h\u1ee3p',
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
            ? '\u0110\u00e3 duy\u1ec7t \u0111\u00e1nh gi\u00e1.'
            : '\u0110\u00e3 t\u1eeb ch\u1ed1i \u0111\u00e1nh gi\u00e1.',
      });
      await loadBaseData();
      if (selectedClassId) await loadClassDetails(selectedClassId);
    } catch (error) {
      console.error('Error moderating feedback:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd \u0111\u00e1nh gi\u00e1.',
      });
    } finally {
      setModeratingId('');
    }
  }

  if (loading && !classes.length) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        {'\u0110ang t\u1ea3i d\u1eef li\u1ec7u \u0111\u00e1nh gi\u00e1 gi\u1ea3ng vi\u00ean...'}
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
                  {'Theo l\u1edbp'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('mine')}
                  className={`rounded-full px-4 py-2 ${tab === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  {'\u0110\u00e1nh gi\u00e1 c\u1ee7a t\u00f4i'}
                </button>
              </div>
            ) : (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                {'Ch\u1ebf \u0111\u1ed9 xem c\u1ee7a qu\u1ea3n tr\u1ecb vi\u00ean / nh\u00e2n vi\u00ean'}
              </div>
            )}
            <button
              type="button"
              onClick={loadBaseData}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {'L\u00e0m m\u1edbi'}
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

      {showModeration && !isStudent ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {'\u0110\u00e1nh gi\u00e1 ch\u1edd duy\u1ec7t'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {'Lu\u1ed3ng n\u00e0y d\u00f9ng chung API /api/feedbacks v\u1edbi mobile v\u00e0 web student.'}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {pendingFeedbacks.length} {'m\u1ee5c'}
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
                        {'Gi\u1ea3ng vi\u00ean: '} {item.teacher}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {'Ng\u00e0y g\u1eedi: '} {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                      {item.rating}/5
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    {item.comment || 'Ch\u01b0a c\u00f3 nh\u1eadn x\u00e9t chi ti\u1ebft.'}
                  </p>
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={moderatingId === item.id}
                      onClick={() => moderateFeedback(item.id, 'reject')}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      {'T\u1eeb ch\u1ed1i'}
                    </button>
                    <button
                      type="button"
                      disabled={moderatingId === item.id}
                      onClick={() => moderateFeedback(item.id, 'approve')}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Duy\u1ec7t
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {'Ch\u01b0a c\u00f3 \u0111\u00e1nh gi\u00e1 n\u00e0o \u0111ang ch\u1edd duy\u1ec7t.'}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isStudent && tab === 'mine' ? (
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
                  {'Gi\u1ea3ng vi\u00ean: '} {item.teacher}
                </p>
                <p className="mt-3 text-sm text-slate-700">
                  {item.comment || 'Ch\u01b0a c\u00f3 nh\u1eadn x\u00e9t chi ti\u1ebft.'}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {'\u0110\u00e3 g\u1eedi: '} {formatDate(item.createdAt)}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              {'B\u1ea1n ch\u01b0a c\u00f3 \u0111\u00e1nh gi\u00e1 n\u00e0o.'}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-semibold text-slate-700">
              {'Ch\u1ecdn l\u1edbp h\u1ecdc'}
            </label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">{'Ch\u1ecdn m\u1ed9t l\u1edbp h\u1ecdc'}</option>
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
                      {'Gi\u1ea3ng vi\u00ean'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.teacher}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'H\u1ecdc k\u1ef3'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.semester}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'N\u0103m h\u1ecdc'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedClass.academicYear}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {'Ph\u00f2ng'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedClass.room}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'T\u1ed5ng \u0111\u00e1nh gi\u00e1'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {classStats?.totalFeedback ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'\u0110i\u1ec3m trung b\u00ecnh'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {classStats?.averageRating ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{'C\u1ea3m nh\u1eadn chung'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatSentiment(classStats?.sentiment)}
                  </p>
                </div>
              </div>

              {isStudent ? (
                <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-xl font-bold text-slate-900">
                    {currentFeedback
                      ? 'C\u1eadp nh\u1eadt \u0111\u00e1nh gi\u00e1 c\u1ee7a b\u1ea1n'
                      : 'G\u1eedi \u0111\u00e1nh gi\u00e1 c\u1ee7a b\u1ea1n'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {currentFeedback
                      ? 'B\u1ea1n c\u00f3 th\u1ec3 s\u1eeda l\u1ea1i \u0111\u00e1nh gi\u00e1 \u0111\u00e3 g\u1eedi ngay tr\u00ean flow th\u1ed1ng nh\u1ea5t n\u00e0y.'
                      : '\u0110\u00e1nh gi\u00e1 c\u1ee7a b\u1ea1n s\u1ebd \u0111\u01b0\u1ee3c d\u00f9ng chung cho mobile app, web student v\u00e0 web admin.'}
                  </p>
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700">
                      {'\u0110\u00e1nh gi\u00e1 t\u1ed5ng th\u1ec3'}
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
                      {'Nh\u1eadn x\u00e9t'}
                    </label>
                    <textarea
                      value={form.comment}
                      onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                      rows={5}
                      placeholder="Chia s\u1ebb tr\u1ea3i nghi\u1ec7m h\u1ecdc t\u1eadp c\u1ee7a b\u1ea1n..."
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
                          {'\u0110\u00e1nh gi\u00e1 \u1ea9n danh'}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {'T\u00ean c\u1ee7a b\u1ea1n s\u1ebd kh\u00f4ng xu\u1ea5t hi\u1ec7n trong danh s\u00e1ch c\u00f4ng khai.'}
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
                        ? '\u0110ang l\u01b0u...'
                        : currentFeedback
                          ? 'C\u1eadp nh\u1eadt \u0111\u00e1nh gi\u00e1'
                          : 'G\u1eedi \u0111\u00e1nh gi\u00e1'}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xl font-bold text-slate-900">
                  {'\u0110\u00e1nh gi\u00e1 c\u00f4ng khai c\u1ee7a l\u1edbp'}
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
                              ? '\u0110\u00e1nh gi\u00e1 \u1ea9n danh'
                              : '\u0110\u00e1nh gi\u00e1 c\u00f3 t\u00ean'}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-700">
                          {item.comment || 'Ch\u01b0a c\u00f3 nh\u1eadn x\u00e9t chi ti\u1ebft.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      {'Ch\u01b0a c\u00f3 \u0111\u00e1nh gi\u00e1 c\u00f4ng khai n\u00e0o cho l\u1edbp h\u1ecdc n\u00e0y.'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              {'Ch\u1ecdn m\u1ed9t l\u1edbp h\u1ecdc \u0111\u1ec3 xem \u0111\u00e1nh gi\u00e1 v\u00e0 th\u1ed1ng k\u00ea.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
