import { useEffect, useMemo, useState } from 'react';
import examService from '../../services/examService';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDateKey(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });
}

function getEventTime(exam) {
  const start = exam.startTime || exam.slot?.startTime || '--:--';
  const end = exam.endTime || exam.slot?.endTime || '--:--';
  return `${start} - ${end}`;
}

export default function ExamSchedulePage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    fetchExamSchedule();
  }, []);

  async function fetchExamSchedule() {
    try {
      setLoading(true);
      setError('');
      const response = await examService.getMyExams();
      setExams(response?.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch exam schedule:', err);
      setError(err?.response?.data?.message || 'Không thể tải lịch thi');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }

  const eventsByDay = useMemo(() => {
    const grouped = new Map();

    exams.forEach((exam) => {
      const key = toDateKey(exam.examDate);
      if (!key) return;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(exam);
    });

    grouped.forEach((items, key) => {
      grouped.set(
        key,
        items.sort((a, b) => {
          const aTime = a.startTime || a.slot?.startTime || '';
          const bTime = b.startTime || b.slot?.startTime || '';
          return aTime.localeCompare(bTime);
        }),
      );
    });

    return grouped;
  }, [exams]);

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = (firstDay.getDay() + 6) % 7;

    const cells = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth]);

  const totalEventsThisMonth = useMemo(() => {
    const targetYear = currentMonth.getFullYear();
    const targetMonth = currentMonth.getMonth();

    return exams.filter((exam) => {
      const date = new Date(exam.examDate);
      return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
    }).length;
  }, [exams, currentMonth]);

  const todayKey = toDateKey(new Date());

  function formatFullDate(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'Chưa có ngày thi';
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Lịch Thi Của Tôi</h1>
          <p className="mt-1 text-gray-600">Lịch hiển thị theo ngày thi, mỗi ngày sẽ có các sự kiện thi tương ứng.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm text-slate-600">
            Tổng lịch thi trong tháng: <span className="font-semibold text-slate-900">{totalEventsThisMonth}</span>
          </div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Ngày có lịch thi được tô nổi bật
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← Tháng trước
            </button>
            <div className="min-w-[220px] text-center text-sm font-semibold text-slate-800">
              {formatMonthLabel(currentMonth)}
            </div>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Tháng sau →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
            Đang tải lịch thi...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchExamSchedule}
              className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-600">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[130px] border-b border-r border-slate-100 bg-slate-50"
                      />
                    );
                  }

                  const dayKey = toDateKey(date);
                  const events = eventsByDay.get(dayKey) || [];
                  const hasEvents = events.length > 0;
                  const isToday = dayKey === todayKey;
                  const isSelectedDay = dayKey === selectedDayKey;

                  return (
                    <div
                      key={dayKey}
                      className={`min-h-[130px] border-b border-r border-slate-100 p-2 transition ${
                        isToday
                          ? 'bg-blue-50/70'
                          : hasEvents
                          ? 'bg-amber-50/70'
                          : ''
                      } ${isSelectedDay ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                    >
                      <div
                        className={`mb-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : hasEvents
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      <div className="space-y-1">
                        {events.slice(0, 3).map((exam) => (
                          <button
                            key={exam._id}
                            type="button"
                            onClick={() => {
                              setSelectedDayKey(dayKey);
                              setSelectedExam(exam);
                            }}
                            className="block w-full rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-left text-[11px] text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
                          >
                            <div className="font-medium">{getEventTime(exam)}</div>
                            <div>{exam.subject?.subjectCode || 'N/A'}</div>
                            <div>{exam.room?.roomCode || 'Chưa phân phòng'}</div>
                          </button>
                        ))}

                        {events.length > 3 ? (
                          <div className="text-[11px] font-medium text-slate-500">
                            +{events.length - 3} lịch thi khác
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedExam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Chi tiết lịch thi</h3>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-5 py-4 text-sm text-slate-700">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Môn học</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedExam.subject?.subjectName || 'Chưa cập nhật tên môn'}</div>
                <div className="text-slate-600">Mã môn: {selectedExam.subject?.subjectCode || 'N/A'}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Ngày thi</div>
                  <div className="mt-1 font-medium text-slate-900">{formatFullDate(selectedExam.examDate)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Giờ thi</div>
                  <div className="mt-1 font-medium text-slate-900">{getEventTime(selectedExam)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Phòng thi</div>
                <div className="mt-1 font-medium text-slate-900">
                  {selectedExam.room?.roomCode || 'Chưa phân phòng'}
                  {selectedExam.room?.roomName ? ` - ${selectedExam.room.roomName}` : ''}
                </div>
              </div>

              {selectedExam.classSection?.classCode ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Lớp học</div>
                  <div className="mt-1 font-medium text-slate-900">{selectedExam.classSection.classCode}</div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
