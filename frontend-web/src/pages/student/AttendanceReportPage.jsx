import { useEffect, useMemo, useState } from 'react';
import attendanceService from '../../services/attendanceService';

const STATUS_STYLES = {
  Present: 'bg-green-50 text-green-700 border border-green-200',
  Late: 'bg-amber-50 text-amber-700 border border-amber-200',
  Absent: 'bg-red-50 text-red-700 border border-red-200',
  Unmarked: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const STATUS_LABELS = {
  Present: 'Có mặt',
  Late: 'Đi trễ',
  Absent: 'Vắng mặt',
  Unmarked: 'Chưa điểm danh',
};

function formatDate(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTermKey(item) {
  return `${item.classSection?.semester || ''}-${item.classSection?.academicYear || ''}`;
}

function getTermLabel(termKey) {
  const [semester, academicYear] = String(termKey).split('-');
  return `KỲ ${semester || '?'} - ${academicYear || '?'}`;
}

function getRateTextColor(rate) {
  if (rate >= 20) return 'text-red-600';
  if (rate >= 10) return 'text-amber-600';
  return 'text-green-600';
}

function getProgressColor(rate) {
  if (rate >= 20) return 'bg-red-500';
  if (rate >= 10) return 'bg-amber-500';
  return 'bg-green-500';
}

function getAttendanceTextColor(rate) {
  if (rate >= 85) return 'text-green-600';
  if (rate >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function DeductionRing({ absenceRate = 0 }) {
  const safeAbsence = Math.max(0, Math.min(100, Number(absenceRate || 0)));
  const score = Math.max(0, Math.round((100 - safeAbsence) * 10) / 10);
  const backgroundStyle = safeAbsence <= 0
    ? { background: '#22c55e' }
    : {
      background: `conic-gradient(from -90deg, #f97316 0 ${safeAbsence}%, #22c55e ${safeAbsence}% 100%)`,
    };

  return (
    <div className="relative mx-auto h-20 w-20 rounded-full" style={backgroundStyle}>
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold text-green-600">{Math.round(score)}</span>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function AttendanceReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const loadReport = async (isRefresh = false) => {
    setError('');
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await attendanceService.getMyAttendance();
      const payload = res?.data?.data || { summary: {}, items: [] };
      setReport(payload);
    } catch (err) {
      setReport({ summary: {}, items: [] });
      setError(err?.response?.data?.message || 'Không tải được báo cáo điểm danh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport(false);
  }, []);

  const summary = report?.summary || {};
  const items = useMemo(() => report?.items || [], [report]);

  const termOptions = useMemo(() => {
    const keys = Array.from(new Set(items.map((item) => getTermKey(item)).filter(Boolean)));
    return keys;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedTerm === 'all') return items;
    return items.filter((item) => getTermKey(item) === selectedTerm);
  }, [items, selectedTerm]);

  const displayedSummary = useMemo(() => {
    const seed = {
      totalClasses: 0,
      sessionsElapsed: 0,
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      absenceRateToDate: 0,
      absenceRateOverall: 0,
    };

    if (selectedTerm === 'all') {
      return { ...seed, ...summary };
    }

    const calculated = filteredItems.reduce((acc, item) => {
      const stats = item.attendanceStats || {};
      acc.totalClasses += 1;
      acc.sessionsElapsed += Number(stats.sessionsElapsed || 0);
      acc.totalSessions += Number(stats.totalSessions || 0);
      acc.attendedSessions += Number(stats.attendedSessions || 0);
      acc.absentSessions += Number(stats.absentSessions || 0);
      return acc;
    }, seed);

    calculated.absenceRateToDate = calculated.sessionsElapsed > 0
      ? Math.round((calculated.absentSessions / calculated.sessionsElapsed) * 1000) / 10
      : 0;
    calculated.absenceRateOverall = calculated.totalSessions > 0
      ? Math.round((calculated.absentSessions / calculated.totalSessions) * 1000) / 10
      : 0;

    return calculated;
  }, [selectedTerm, summary, filteredItems]);

  const attendanceRate = selectedItem
    ? Number(selectedItem.attendanceStats?.participationRateToDate || 0)
    : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Đang tải báo cáo điểm danh...
        </div>
      </div>
    );
  }

  const inSubjectList = !selectedItem;
  const inSessionList = !!selectedItem && !selectedSession;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Báo cáo điểm danh</h1>
            <p className="text-sm text-slate-600">
              Luồng xem dữ liệu: Danh sách môn học → Danh sách buổi điểm danh → Chi tiết buổi.
            </p>

            {!inSubjectList ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setSelectedSession(null);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  Danh sách môn học
                </button>
                {selectedItem ? <span>→</span> : null}
                {selectedItem ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSession(null)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50"
                  >
                    {selectedItem.subject?.subjectCode || selectedItem.classSection?.classCode || 'Môn học'}
                  </button>
                ) : null}
                {selectedSession ? <span>→</span> : null}
                {selectedSession ? <span>Chi tiết buổi</span> : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => loadReport(true)}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {termOptions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTerm('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                selectedTerm === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              TẤT CẢ KỲ
            </button>
            {termOptions.map((termKey) => (
              <button
                key={termKey}
                type="button"
                onClick={() => {
                  setSelectedTerm(termKey);
                  setSelectedItem(null);
                  setSelectedSession(null);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  selectedTerm === termKey
                    ? 'bg-orange-500 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {getTermLabel(termKey).toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Môn/Lớp đang theo dõi"
            value={displayedSummary.totalClasses || 0}
            hint="Tổng học phần có dữ liệu điểm danh"
          />
          <SummaryCard
            label="Vắng đến hiện tại"
            value={`${displayedSummary.absentSessions || 0}/${displayedSummary.sessionsElapsed || 0}`}
            hint={`${displayedSummary.absenceRateToDate || 0}% trên số buổi đã diễn ra`}
          />
          <SummaryCard
            label="Vắng trên tổng buổi"
            value={`${displayedSummary.absentSessions || 0}/${displayedSummary.totalSessions || 0}`}
            hint={`${displayedSummary.absenceRateOverall || 0}% trên tổng số buổi`}
          />
          <SummaryCard
            label="Tham gia đến hiện tại"
            value={displayedSummary.attendedSessions || 0}
            hint="Tính cả buổi đi trễ"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Chưa có dữ liệu điểm danh từ giảng viên.
        </div>
      ) : null}

      {inSubjectList && filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const classId = String(item.classSection?._id || '');
            const stats = item.attendanceStats || {};
            const attendance = Number(stats.participationRateToDate || 0);
            const absence = Number(stats.absenceRateToDate || 0);
            const score = Number(stats.attendanceScore || (100 - absence));
            return (
              <button
                key={classId}
                type="button"
                onClick={() => {
                  setSelectedItem(item);
                  setSelectedSession(null);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-orange-300 hover:shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-sky-700">{item.subject?.subjectCode || 'MÔN HỌC'}</h2>
                    <div className="mt-1 text-base font-semibold text-slate-900">{item.subject?.subjectName || item.classSection?.className || 'N/A'}</div>
                    <div className="mt-2 text-sm text-slate-700">Lớp: {item.classSection?.classCode || 'N/A'}</div>
                    <div className="text-sm text-slate-600">
                      Bắt đầu: {formatDate(item.classSection?.startDate)} · Kết thúc: {formatDate(item.classSection?.endDate)}
                    </div>
                    <div className={`mt-2 text-2xl font-extrabold ${getAttendanceTextColor(attendance)}`}>
                      Đã tham gia: {stats.attendedSessions || 0}/{stats.sessionsElapsed || 0}
                    </div>
                    {(stats.unmarkedSessions || 0) > 0 ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Chưa điểm danh: {stats.unmarkedSessions || 0} buổi
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[100px] text-center">
                    <DeductionRing absenceRate={absence} />
                    <div className={`mt-2 text-sm font-semibold ${getRateTextColor(absence)}`}>
                      Vắng: {absence}% · Điểm: {Math.round(score)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {inSessionList && selectedItem ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedItem.subject?.subjectCode || 'Môn học'} - {selectedItem.subject?.subjectName || selectedItem.classSection?.className || ''}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Lớp: {selectedItem.classSection?.classCode || 'N/A'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setSelectedSession(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Quay lại danh sách môn
              </button>
            </div>
          </div>

          {(selectedItem.details || []).length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Môn này chưa có buổi nào được điểm danh.
            </div>
          ) : (
            <div className="space-y-2">
              {(selectedItem.details || []).map((session) => {
                const status = session.status || 'Absent';
                return (
                  <button
                    key={`${session.slotId}-${session.slotDate}`}
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-orange-300"
                  >
                    <div>
                      <div className="text-base font-semibold text-slate-900">{formatDate(session.slotDate)}</div>
                      <div className="text-xs text-slate-500">Bấm để xem chi tiết buổi điểm danh</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.Absent}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {selectedItem && selectedSession ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Chi tiết buổi điểm danh</h3>
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Quay lại danh sách buổi
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Môn học:</span> {selectedItem.subject?.subjectCode || 'N/A'} - {selectedItem.subject?.subjectName || 'N/A'}
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Lớp học phần:</span> {selectedItem.classSection?.classCode || 'N/A'}
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Ngày học:</span> {formatDate(selectedSession.slotDate)}
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Mã buổi:</span> {selectedSession.slotId || 'N/A'}
            </div>
          </div>

          <div
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              STATUS_STYLES[selectedSession.status] || STATUS_STYLES.Absent
            }`}
          >
            Trạng thái: {STATUS_LABELS[selectedSession.status] || selectedSession.status || 'N/A'}
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">Ghi chú:</span> {selectedSession.note || 'Không có'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
