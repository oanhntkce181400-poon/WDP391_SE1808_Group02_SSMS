import { useEffect, useMemo, useState } from 'react';
import academicCalendarService from '../../services/academicCalendarService';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toLocalDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isDateInRange(target, start, end) {
  const t = target.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
}

function hexToRgba(hex, alpha = 0.22) {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(249,115,22,${alpha})`;
  }

  const intVal = Number.parseInt(normalized, 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildMonthCells(year, month) {
  const firstDate = new Date(year, month, 1);
  const startIndex = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startIndex; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function AcademicCalendarViewer({ title, subtitle }) {
  const current = new Date();
  const [year, setYear] = useState(current.getFullYear());
  const [month, setMonth] = useState(current.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthName = useMemo(
    () => new Date(year, month, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
    [year, month],
  );

  const yearOptions = useMemo(() => {
    const base = current.getFullYear();
    return Array.from({ length: 6 }, (_, idx) => base - 1 + idx);
  }, [current]);

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      setLoading(true);
      setError('');
      try {
        const response = await academicCalendarService.getEvents({ year });
        if (!mounted) return;
        setEvents(response?.data?.data || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Không thể tải lịch nghỉ năm hiện tại.');
        setEvents([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, [year]);

  function handlePrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((prev) => prev - 1);
      return;
    }
    setMonth((prev) => prev - 1);
  }

  function handleNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((prev) => prev + 1);
      return;
    }
    setMonth((prev) => prev + 1);
  }

  const monthCells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events]);

  function getEventsForDate(date) {
    if (!date) return [];
    const target = normalizeDay(date);

    return sortedEvents.filter((event) => {
      const start = toLocalDate(event.startDate);
      const end = toLocalDate(event.endDate);
      if (!start || !end) return false;
      return isDateInRange(target, start, end);
    });
  }

  const today = normalizeDay(new Date());

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title || 'Lịch nghỉ trong năm'}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {subtitle || 'Các kỳ nghỉ sẽ được đánh dấu màu theo khoảng ngày bắt đầu và kết thúc.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Tháng trước
          </button>
          <div className="min-w-48 rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-semibold capitalize text-slate-800">
            {monthName}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Tháng sau
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">Năm</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {yearOptions.map((itemYear) => (
                <option key={itemYear} value={itemYear}>
                  {itemYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Đang tải lịch nghỉ...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((label) => (
                <div key={label} className="rounded-md bg-slate-100 py-2 text-center text-xs font-bold text-slate-600">
                  {label}
                </div>
              ))}

              {monthCells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-24 rounded-md border border-dashed border-slate-100 bg-slate-50" />;
                }

                const dayEvents = getEventsForDate(date);
                const primaryEvent = dayEvents[0] || null;
                const isToday = date.getTime() === today.getTime();

                return (
                  <div
                    key={date.toISOString()}
                    className={`h-24 rounded-md border p-2 ${isToday ? 'border-blue-400' : 'border-slate-200'}`}
                    style={{
                      backgroundColor: primaryEvent ? hexToRgba(primaryEvent.color, 0.22) : '#ffffff',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={`${event._id}-${date.getDate()}`}
                          title={event.name}
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: event.color || '#f97316' }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-800">Danh sách kỳ nghỉ ({sortedEvents.length})</h2>

            {sortedEvents.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có kỳ nghỉ nào được cấu hình cho năm {year}.</p>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => (
                  <div key={event._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: event.color || '#f97316' }} />
                      <p className="text-sm font-semibold text-slate-800">{event.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </p>
                    {event.description ? (
                      <p className="mt-1 text-xs text-slate-500">{event.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
