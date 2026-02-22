import { useState, useEffect } from 'react';
import scheduleService from '../../services/scheduleService';

const TIME_SLOTS = [
  { label: 'Ca 1', startTime: '07:00', endTime: '09:15' },
  { label: 'Ca 2', startTime: '09:30', endTime: '11:45' },
  { label: 'Ca 3', startTime: '12:30', endTime: '14:45' },
  { label: 'Ca 4', startTime: '15:00', endTime: '17:15' },
  { label: 'Ca 5', startTime: '17:30', endTime: '19:45' },
  { label: 'Ca 6', startTime: '20:00', endTime: '22:00' },
];

const DAYS = [
  { label: 'Thứ 2', dayOfWeek: 1 },
  { label: 'Thứ 3', dayOfWeek: 2 },
  { label: 'Thứ 4', dayOfWeek: 3 },
  { label: 'Thứ 5', dayOfWeek: 4 },
  { label: 'Thứ 6', dayOfWeek: 5 },
  { label: 'Thứ 7', dayOfWeek: 6 },
  { label: 'Chủ nhật', dayOfWeek: 7 },
];

// Màu cố định theo mã môn FPT
const SUBJECT_COLORS = {
  WDP301: { bg: 'bg-blue-600',    text: 'text-blue-100' },
  SDN302: { bg: 'bg-emerald-600', text: 'text-emerald-100' },
  MLN122: { bg: 'bg-purple-600',  text: 'text-purple-100' },
  PRJ301: { bg: 'bg-orange-500',  text: 'text-orange-100' },
  EXE201: { bg: 'bg-rose-500',    text: 'text-rose-100' },
  PRM393: { bg: 'bg-cyan-600',    text: 'text-cyan-100' },
  SWP391: { bg: 'bg-amber-500',   text: 'text-amber-100' },
  OSG202: { bg: 'bg-lime-600',    text: 'text-lime-100' },
  DBI202: { bg: 'bg-teal-600',    text: 'text-teal-100' },
  SWT301: { bg: 'bg-indigo-600',  text: 'text-indigo-100' },
  NWC203: { bg: 'bg-pink-600',    text: 'text-pink-100' },
  EXE101: { bg: 'bg-violet-600',  text: 'text-violet-100' },
};
const FALLBACK_COLORS = [
  { bg: 'bg-blue-600',    text: 'text-blue-100' },
  { bg: 'bg-emerald-600', text: 'text-emerald-100' },
  { bg: 'bg-purple-600',  text: 'text-purple-100' },
  { bg: 'bg-orange-500',  text: 'text-orange-100' },
  { bg: 'bg-rose-500',    text: 'text-rose-100' },
  { bg: 'bg-cyan-600',    text: 'text-cyan-100' },
  { bg: 'bg-amber-500',   text: 'text-amber-100' },
  { bg: 'bg-teal-600',    text: 'text-teal-100' },
];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); 
  const diff = jsDay === 0 ? -6 : 1 - jsDay; 
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function getDateOfDay(weekStartStr, dayOfWeek) {
  const d = new Date(weekStartStr);
  d.setDate(d.getDate() + dayOfWeek - 1);
  return d;
}

function formatDDMM(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}


export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    toDateStr(getMondayOfWeek(new Date()))
  );

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchedule();
  }, [weekStart]);

  async function fetchSchedule() {
    try {
      setLoading(true);
      setError(null);
      const response = await scheduleService.getMySchedule(weekStart);
      setSchedules(response.data.data?.schedules || []);
    } catch (err) {
      console.error('Lỗi tải lịch học:', err);

      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải lịch học. Vui lòng thử lại.';
      setError(msg);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }
  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(toDateStr(d));
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(toDateStr(d));
  }

  function goToCurrentWeek() {
    setWeekStart(toDateStr(getMondayOfWeek(new Date())));
  }

  // Gán màu: ưu tiên map cố định, fallback theo thứ tự
  const dynamicColorMap = {};
  schedules.forEach((s) => {
    const code = s.subject.subjectCode;
    if (!dynamicColorMap[code]) {
      const idx = Object.keys(dynamicColorMap).length % FALLBACK_COLORS.length;
      dynamicColorMap[code] = SUBJECT_COLORS[code] || FALLBACK_COLORS[idx];
    }
  });
  const getColor = (code) => dynamicColorMap[code] || FALLBACK_COLORS[0];

 
  function getScheduleForCell(dayOfWeek, timeSlot) {
    return schedules.find(
      (s) => s.dayOfWeek === dayOfWeek && s.startTime === timeSlot.startTime
    );
  }

  const weekEndStr = toDateStr(
    new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Lịch học cá nhân
      </h1>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="p-2 rounded-full border border-slate-300 hover:bg-slate-200 text-slate-600 font-bold"
          >
            ‹
          </button>

          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
            {weekStart} → {weekEndStr}
          </span>

          <button
            onClick={nextWeek}
            className="p-2 rounded-full border border-slate-300 hover:bg-slate-200 text-slate-600 font-bold"
          >
            ›
          </button>

          <button
            onClick={goToCurrentWeek}
            className="text-sm text-blue-600 hover:underline ml-2"
          >
            Trở về tuần hiện tại
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            In lịch
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            Xuất PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">⏳</div>
          <p>Đang tải lịch học...</p>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-red-500">
          <div className="text-4xl mb-3">❌</div>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-200 p-3 bg-slate-100 text-slate-600 w-24 text-center">
                  Ca
                </th>

                {DAYS.map((day) => {
                  const dayDate = getDateOfDay(weekStart, day.dayOfWeek);
                  const isToday =
                    toDateStr(dayDate) === toDateStr(new Date());

                  return (
                    <th
                      key={day.dayOfWeek}
                      className={`border border-slate-200 p-3 text-center min-w-[130px] ${
                        isToday ? 'bg-blue-50' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        className={`font-semibold ${
                          isToday ? 'text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        {day.label}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isToday ? 'text-blue-500 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {formatDDMM(dayDate)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body: từng hàng là một ca học */}
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot.label}>
                  {/* Cột tên Ca */}
                  <td className="border border-slate-200 p-3 text-center bg-slate-50">
                    <div className="font-semibold text-slate-600 text-xs">
                      {slot.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {slot.startTime}
                    </div>
                    <div className="text-xs text-slate-400">
                      {slot.endTime}
                    </div>
                  </td>

                  {/* Từng ô trong hàng */}
                  {DAYS.map((day) => {
                    const schedule = getScheduleForCell(day.dayOfWeek, slot);
                    const clr = schedule ? getColor(schedule.subject.subjectCode) : null;

                    return (
                      <td
                        key={day.dayOfWeek}
                        className="border border-slate-200 p-1 align-top h-28"
                      >
                        {schedule ? (
                          <div className={`${clr.bg} rounded-lg p-2 h-full flex flex-col gap-0.5 cursor-default select-none`}>
                            {/* Mã môn (badge) */}
                            <span className="text-[11px] font-bold bg-black/20 text-white rounded px-1.5 py-0.5 self-start leading-tight">
                              {schedule.subject.subjectCode}
                            </span>

                            {/* Tên môn */}
                            <div className="text-[11px] font-semibold text-white leading-tight mt-0.5 line-clamp-2">
                              {schedule.subject.subjectName}
                            </div>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Phòng */}
                            <div className="text-[10px] text-white/90 flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                              <span className="truncate">{schedule.room.roomCode}</span>
                            </div>

                            {/* Giáo viên */}
                            <div className="text-[10px] text-white/90 flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                              <span className="truncate">{schedule.teacher}</span>
                            </div>

                            {/* Thời gian */}
                            <div className="text-[10px] text-white/80 font-medium">
                              {slot.startTime} – {slot.endTime}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full min-h-[6rem] flex items-center justify-center">
                            <span className="text-slate-200 text-xs">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── THÔNG BÁO KHÔNG CÓ LỊCH ── */}
      {!loading && !error && schedules.length === 0 && (
        <div className="text-center py-16 text-slate-400 mt-4">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-base">Không có lịch học trong tuần này</p>
          <p className="text-sm mt-1">Chuyển sang tuần khác để xem lịch học</p>
        </div>
      )}
    </div>
  );
}
