import { useState, useEffect } from 'react';
import scheduleService from '../../services/scheduleService';
import classService from '../../services/classService';
import WaitlistModal from '../../components/features/WaitlistModal';
import { X, BookOpen, Users, FileText, Calendar, MapPin, GraduationCap } from 'lucide-react';

const TIME_SLOTS = [
  { label: 'Ca 1', startTime: '07:30', endTime: '09:00', matchFrom: '07:00', matchTo: '09:30' },
  { label: 'Ca 2', startTime: '09:30', endTime: '11:00', matchFrom: '09:30', matchTo: '12:00' },
  { label: 'Ca 3', startTime: '12:30', endTime: '14:00', matchFrom: '12:00', matchTo: '14:30' },
  { label: 'Ca 4', startTime: '14:30', endTime: '16:00', matchFrom: '14:30', matchTo: '17:00' },
  { label: 'Ca 5', startTime: '17:00', endTime: '18:30', matchFrom: '17:00', matchTo: '19:30' },
  { label: 'Ca 6', startTime: '20:00', endTime: '22:00', matchFrom: '19:30', matchTo: '23:59' },
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

const ATTENDANCE_LABEL = {
  Present: { text: 'Có mặt', cls: 'bg-green-500/90 text-white' },
  Late: { text: 'Đi trễ', cls: 'bg-amber-500/90 text-white' },
  Absent: { text: 'Vắng', cls: 'bg-rose-600/90 text-white' },
};

function getMondayOfWeek(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); 
  const diff = jsDay === 0 ? -6 : 1 - jsDay; 
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateOfDay(weekStartStr, dayOfWeek) {
  const d = new Date(weekStartStr);
  d.setDate(d.getDate() + dayOfWeek - 1);
  return d;
}

function toMinutes(timeText) {
  if (!timeText) return -1;
  const parts = String(timeText).split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return -1;
  return parts[0] * 60 + parts[1];
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

  // State cho modal chi tiết lớp học
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [classRoster, setClassRoster] = useState([]);
  const [rosterError, setRosterError] = useState('');

  // State cho modal Waitlist
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

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

  // Fetch chi tiết lớp học khi click vào slot
  const fetchClassDetails = async (classId) => {
    try {
      setLoadingDetails(true);
      const res = await classService.getClassDetails(classId);
      setClassDetails(res.data.data);
    } catch (err) {
      console.error('Lỗi lấy chi tiết lớp:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchClassRoster = async (classId) => {
    try {
      setRosterError('');
      const res = await classService.getClassRoster(classId);
      setClassRoster(res?.data?.data?.students || []);
    } catch (err) {
      setClassRoster([]);
      setRosterError(err?.response?.data?.message || 'Không thể tải danh sách sinh viên');
    }
  };

  // Click vào slot trong TKB
  const handleSlotClick = (schedule) => {
    // API trả về classId, không phải classSection
    if (schedule?.classId) {
      setDetailTab('overview');
      setClassRoster([]);
      setRosterError('');
      setSelectedClass(schedule.classId);
      fetchClassDetails(schedule.classId);
      fetchClassRoster(schedule.classId);
    }
  };

  // Đóng modal
  const closeClassDetails = () => {
    setSelectedClass(null);
    setClassDetails(null);
    setClassRoster([]);
    setRosterError('');
    setDetailTab('overview');
  };

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

 
  function timeToMinutes(t) {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return h * 60 + m;
  }

  function getScheduleForCell(dayOfWeek, timeSlot) {
      const from = timeToMinutes(timeSlot.matchFrom);
      const to = timeToMinutes(timeSlot.matchTo);
    return schedules.find((s) => {
      if (s.dayOfWeek !== dayOfWeek) return false;
      const start = timeToMinutes(s.startTime);
      return start >= from && start < to;
    });
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
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium shadow-sm"
          >
            ⏳ Đăng ký Waitlist
          </button>
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
                          <div 
                            onClick={() => schedule.classId && handleSlotClick(schedule)}
                            className={`${clr.bg} rounded-lg p-2 h-full flex flex-col gap-0.5 ${schedule.classId ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-opacity`}>
                            {/* Mã môn (badge) */}
                            <span className="text-[11px] font-bold bg-black/20 text-white rounded px-1.5 py-0.5 self-start leading-tight">
                              {schedule.subject.subjectCode}
                            </span>

                            {/* Tên môn */}
                            <div className="text-[11px] font-semibold text-white leading-tight mt-0.5 line-clamp-2">
                              {schedule.subject.subjectName}
                            </div>

                            {schedule.classCode && (
                              <div className="text-[10px] text-white/85 truncate">
                                {schedule.classCode}
                              </div>
                            )}

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
                              {schedule.startTime || slot.startTime} – {schedule.endTime || slot.endTime}
                            </div>
                            {schedule.classId && (
                              <div className={`text-[10px] mt-0.5 inline-flex w-fit rounded px-1.5 py-0.5 font-semibold ${
                                schedule.attendanceStatus
                                  ? (ATTENDANCE_LABEL[schedule.attendanceStatus]?.cls || 'bg-slate-700/80 text-white')
                                  : 'bg-slate-900/35 text-white'
                              }`}>
                                {schedule.attendanceStatus
                                  ? (ATTENDANCE_LABEL[schedule.attendanceStatus]?.text || schedule.attendanceStatus)
                                  : 'Chưa điểm danh'}
                              </div>
                            )}
                            {!schedule.classId && (
                              <div className="text-[10px] text-white/80">Theo khung CT</div>
                            )}
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

      {/* ── MODAL CHI TIẾT LỚP HỌC ── */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {classDetails?.subject?.subjectName || 'Chi tiết lớp học'}
                  </h2>
                  <p className="text-indigo-100 mt-1">
                    {classDetails?.subject?.subjectCode} - {classDetails?.classCode}
                  </p>
                </div>
                <button
                  onClick={closeClassDetails}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingDetails ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3"></div>
                  <p>Đang tải thông tin...</p>
                </div>
              ) : classDetails ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <button
                      onClick={() => setDetailTab('overview')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        detailTab === 'overview'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Thông tin lớp
                    </button>
                    <button
                      onClick={() => setDetailTab('roster')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        detailTab === 'roster'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Danh sách sinh viên ({classRoster.length})
                    </button>
                  </div>

                  {detailTab === 'overview' && (
                    <>
                  {/* Thông tin cơ bản */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <GraduationCap size={16} />
                        <span>Giảng viên</span>
                      </div>
                      <p className="font-semibold text-slate-800">
                        {classDetails.teacher?.fullName || 'Chưa có'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Users size={16} />
                        <span>Sĩ số</span>
                      </div>
                      <p className="font-semibold text-slate-800">
                        {classDetails.currentEnrollment} / {classDetails.maxCapacity}
                      </p>
                    </div>
                  </div>

                  {/* Lịch học */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <Calendar size={16} />
                      <span className="font-medium">Lịch học</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {classDetails.schedules?.length > 0 ? (
                        classDetails.schedules.map((sch, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              Thứ {sch.dayOfWeek}, Tiết {sch.startPeriod}-{sch.endPeriod}
                            </span>
                            <span className="font-medium text-slate-800">
                              {sch.room?.roomCode || classDetails.room?.roomCode || 'Chưa có phòng'}
                            </span>
                          </div>
                        ))
                      ) : classDetails.dayOfWeek ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Thứ {classDetails.dayOfWeek}</span>
                          <span className="font-medium text-slate-800">
                            {classDetails.room?.roomCode || 'Chưa có phòng'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">Chưa có lịch</p>
                      )}
                    </div>
                  </div>

                  {/* Syllabus */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <BookOpen size={16} />
                      <span className="font-medium">Nội dung môn học (Syllabus)</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 whitespace-pre-line">
                        {classDetails.syllabus || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>

                  {/* Tài liệu */}
                  {classDetails.materials?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <FileText size={16} />
                        <span className="font-medium">Tài liệu học tập</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        {classDetails.materials.map((mat, idx) => (
                          <a
                            key={idx}
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <FileText size={14} />
                            {mat.title || 'Tài liệu'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Danh sách bạn cùng lớp */}
                  </>
                  )}

                  {detailTab === 'roster' && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <Users size={16} />
                        <span className="font-medium">Danh sách sinh viên cùng lớp</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 max-h-80 overflow-y-auto">
                        {rosterError ? (
                          <p className="text-red-500 text-sm">{rosterError}</p>
                        ) : classRoster.length > 0 ? (
                          <div className="space-y-2">
                            {classRoster.map((mate, idx) => (
                              <div key={mate.enrollmentId || idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-800">{mate.fullName}</span>
                                <span className="text-slate-400 text-xs">{mate.studentCode}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">Không tìm thấy sinh viên trong lớp này</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <p>Không thể tải thông tin lớp học</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={closeClassDetails}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Waitlist Modal */}
      <WaitlistModal 
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
    </div>
  );
}
