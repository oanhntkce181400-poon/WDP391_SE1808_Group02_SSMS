

import { useState, useEffect } from 'react';
import attendanceService from '../../services/attendanceService';
import enrollmentSnapshotService from '../../services/enrollmentSnapshotService';

const STATUS_STYLES = {
  Present: 'bg-green-100 text-green-800 border border-green-200',
  Late:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Absent:  'bg-red-100 text-red-800 border border-red-200',
};

const STATUS_LABELS = {
  Present: 'Có mặt',
  Late:    'Đi trễ',
  Absent:  'Vắng',
};

// Màu nút bấm chọn trạng thái
const STATUS_BUTTON_STYLES = {
  Present: {
    active: 'bg-green-500 text-white border-green-600 shadow-sm',
    idle:   'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  Late:    {
    active: 'bg-yellow-400 text-white border-yellow-500 shadow-sm',
    idle:   'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50',
  },
  Absent:  {
    active: 'bg-red-500 text-white border-red-600 shadow-sm',
    idle:   'bg-white text-red-700 border-red-300 hover:bg-red-50',
  },
};

// ─────────────────────────────────────────────────────────────
// HÀM TIỆN ÍCH
// ─────────────────────────────────────────────────────────────

// Tạo chữ viết tắt từ họ tên (VD: "Nguyen Van A" → "NA")
function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Tạo màu nền đại diện từ tên (để phân biệt sinh viên)
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-400',
];
function getAvatarColor(name) {
  // Dùng tổng mã ASCII của tên để chọn màu cố định
  const sum = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Định dạng tỷ lệ chuyên cần thành màu chỉ thị
function getRateColor(rate) {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

// Tạo slotId từ ngày (YYYY-MM-DD)
function dateToSlotId(dateStr) {
  return dateStr; // Dùng luôn ngày làm slotId
}

function getThreeMonthBounds(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toSystemDayOfWeek(date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function normalizeDateOnly(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateVi(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

/** Ngày hợp lệ để điểm danh: ưu tiên danh sách từ API (cùng logic Schedule với báo cáo SV). */
function getAllowedDateOptionsForClass(cls, now = new Date()) {
  if (!cls) return [];
  if (Array.isArray(cls.validAttendanceDates) && cls.validAttendanceDates.length > 0) {
    return cls.validAttendanceDates;
  }

  const { start: winStart, end: winEnd } = getThreeMonthBounds(now);

  const dayCandidates = Array.isArray(cls.scheduleDays) && cls.scheduleDays.length > 0
    ? cls.scheduleDays
    : (cls.dayOfWeek ? [cls.dayOfWeek] : []);

  const allowedDays = dayCandidates
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((a, b) => a - b);

  if (allowedDays.length === 0) return [];

  const classStart = normalizeDateOnly(cls.startDate);
  const classEnd = normalizeDateOnly(cls.endDate);

  // Bắt đầu từ đầu học kỳ (nếu có), không chỉ từ hôm nay — trùng với cách tính buổi của SV
  const rangeStart = classStart ? minDate(classStart, winStart) : winStart;
  const rangeEnd = minDate(classEnd || winEnd, winEnd);

  const results = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const day = toSystemDayOfWeek(cursor);
    const inAllowedDay = allowedDays.includes(day);
    const inClassRange =
      (!classStart || cursor >= classStart) &&
      (!classEnd || cursor <= classEnd);

    if (inAllowedDay && inClassRange) {
      results.push(toYmd(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
  // ── STATE ĐIỀU HƯỚNG ──────────────────────────────────────
  // view = 'classes' | 'snapshot-classes' | 'slots' | 'attendance'
  const [view, setView] = useState('classes');

  // Lớp đang chọn
  const [selectedClass, setSelectedClass] = useState(null);

  // Buổi học đang chọn
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ── STATE CHẾ ĐỘ SNAPSHOT ────────────────────────────────
  // 'enrollment' = dùng ClassEnrollment như hiện tại
  // 'snapshot'    = dùng snapshot logs
  const [mode, setMode] = useState('enrollment');

  // Bản snapshot đang chọn (khi mode === 'snapshot')
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  // Danh sách lớp (classSection) lấy từ snapshot logs
  const [snapshotClassSections, setSnapshotClassSections] = useState([]);

  // ── STATE DỮ LIỆU ─────────────────────────────────────────
  const [classes, setClasses]     = useState([]);
  const [slots, setSlots]         = useState([]);
  const [students, setStudents]   = useState([]); // Bảng điểm danh

  // ── STATE UI ──────────────────────────────────────────────
  const [isLoading, setIsLoading]         = useState(false);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [loadError, setLoadError]         = useState('');
  const [isSaving, setIsSaving]           = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  const [saveWarning, setSaveWarning]   = useState('');
  const [validationMsg, setValidationMsg] = useState('');

  // Ngày tạo buổi mới
  const [newSlotDate, setNewSlotDate] = useState(
    new Date().toISOString().substring(0, 10), // Mặc định là hôm nay
  );

  // ── TẢI DANH SÁCH LỚP KHI VÀO TRANG ─────────────────────
  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await attendanceService.getClasses();
      setClasses(res.data.data || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được danh sách lớp');
    } finally {
      setIsLoading(false);
    }
  }

  // ── TẢI DANH SÁCH BUỔI HỌC KHI CHỌN LỚP ─────────────────
  async function loadSlots(cls) {
    setSelectedClass(cls);
    setIsLoading(true);
    setLoadError('');
    try {
      // Snapshot mode: không gọi API slots cũ (không có dữ liệu điểm danh trước đó)
      if (mode === 'snapshot') {
        setSlots([]);
        let merged = { ...cls };
        if (cls.classSectionId) {
          try {
            const r = await attendanceService.getValidAttendanceDates(cls.classSectionId);
            const dates = r.data?.data?.dates;
            if (Array.isArray(dates) && dates.length > 0) {
              merged = { ...merged, validAttendanceDates: dates };
            }
          } catch {
            /* fallback getAllowedDateOptionsForClass phía dưới */
          }
        }
        setSelectedClass(merged);
        const allowed = getAllowedDateOptionsForClass(merged);
        if (allowed.length > 0) {
          const today = toYmd(new Date());
          setNewSlotDate(allowed.includes(today) ? today : allowed[0]);
        } else {
          setNewSlotDate(toYmd(new Date()));
        }
        setView('slots');
        return;
      }

      // Enrollment mode: gọi API slots bình thường
      const res = await attendanceService.getClassSlots(cls._id);
      setSlots(res.data.data || []);
      const allowed = getAllowedDateOptionsForClass(cls);
      if (allowed.length > 0) {
        const today = toYmd(new Date());
        setNewSlotDate(allowed.includes(today) ? today : allowed[0]);
      }
      setView('slots');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được danh sách buổi học');
    } finally {
      setIsLoading(false);
    }
  }

  // ── TẢI DANH SÁCH LỚP TỪ SNAPSHOT KHI CHỌN SNAPSHOT ────
  async function loadClassSectionsFromSnapshot(snapshot) {
    setSelectedSnapshot(snapshot);
    setIsLoading(true);
    setIsLoadingSnapshots(true);
    setLoadError('');
    try {
      const res = await enrollmentSnapshotService.getClassSections(snapshot._id);
      setSnapshotClassSections(res.data.data || []);
      setView('snapshot-classes');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được danh sách lớp từ snapshot');
    } finally {
      setIsLoading(false);
      setIsLoadingSnapshots(false);
    }
  }

  // ── TẢI BẢNG ĐIỂM DANH KHI CHỌN BUỔI ────────────────────
  async function loadAttendance(slot) {
    setSelectedSlot(slot);
    setIsLoading(true);
    setLoadError('');
    try {
      let res;

      if (mode === 'snapshot' && selectedSnapshot && selectedClass) {
        // Lấy roster từ snapshot logs
        res = await enrollmentSnapshotService.getRoster(
          selectedSnapshot._id,
          selectedClass.classSectionId,
          slot.slotId,
        );
        setStudents(res.data.data || []);
      } else {
        // Luồng enrollment thông thường
        res = await attendanceService.getSlotAttendance(
          selectedClass._id,
          slot.slotId,
        );
        setStudents(res.data.data || []);
      }

      setValidationMsg('');
      setView('attendance');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được dữ liệu điểm danh');
    } finally {
      setIsLoading(false);
    }
  }

  // ── TẠO BUỔI MỚI (chưa có điểm danh nào) ─────────────────
  async function handleNewSlot() {
    if (!newSlotDate) return;

    if (mode !== 'snapshot') {
      // Luồng enrollment: validate ngày theo thứ học
      const allowedDates = getAllowedDateOptionsForClass(selectedClass);
      if (allowedDates.length > 0 && !allowedDates.includes(newSlotDate)) {
        setValidationMsg(`Ngay diem danh khong hop le. Vui long chon mot trong cac ngay: ${allowedDates.join(', ')}`);
        return;
      }

      // Kiểm tra buổi ngày đó đã có chưa
      const exists = slots.some((s) => s.slotId === newSlotDate);
      if (exists) {
        alert('Buổi học ngày này đã tồn tại! Hãy chọn ngày khác.');
        return;
      }
    }

    // Tải bảng điểm danh với slotId = ngày mới (sẽ rỗng - tất cả Present mặc định)
    const newSlot = {
      slotId: dateToSlotId(newSlotDate),
      slotDate: newSlotDate,
      totalStudents: 0,
      absentCount: 0,
      lateCount: 0,
      presentCount: 0,
      isNew: true, // Đánh dấu buổi mới chưa lưu
    };
    await loadAttendance(newSlot);
  }

  const allowedDateOptions = selectedClass ? getAllowedDateOptionsForClass(selectedClass) : [];
  const dateBounds = getThreeMonthBounds(new Date());
  const pickerBounds =
    selectedClass && allowedDateOptions.length > 0
      ? {
          min: allowedDateOptions[0],
          max: allowedDateOptions[allowedDateOptions.length - 1],
        }
      : selectedClass
        ? (() => {
            const three = getThreeMonthBounds(new Date());
            const cs = normalizeDateOnly(selectedClass.startDate);
            const ce = normalizeDateOnly(selectedClass.endDate);
            return {
              min: toYmd(cs ? minDate(cs, three.start) : three.start),
              max: toYmd(minDate(ce || three.end, three.end)),
            };
          })()
        : { min: toYmd(dateBounds.start), max: toYmd(dateBounds.end) };

  // ── THAY ĐỔI TRẠNG THÁI ĐIỂM DANH 1 SINH VIÊN ────────────
  function handleStatusChange(studentId, newStatus) {
    setStudents((prev) =>
      prev.map((s) =>
        String(s.studentId) === String(studentId)
          ? { ...s, status: newStatus }
          : s,
      ),
    );
  }

  // ── THAY ĐỔI GHI CHÚ 1 SINH VIÊN ─────────────────────────
  function handleNoteChange(studentId, note) {
    setStudents((prev) =>
      prev.map((s) =>
        String(s.studentId) === String(studentId) ? { ...s, note } : s,
      ),
    );
  }

  // ── ĐÁNH DẤU TẤT CẢ: CÓ MẶT (Quick select - 3a) ─────────
  function handleMarkAllPresent() {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'Present' })));
  }

  // ── LƯU ĐIỂM DANH (bulkSave) ──────────────────────────────
  async function handleSave() {
    if (students.length === 0) return;

    const invalid = students.filter((s) => !['Present', 'Late', 'Absent'].includes(s.status));
    if (invalid.length > 0) {
      setValidationMsg(`Vui long chon trang thai diem danh cho tat ca sinh vien (${invalid.length} ban chua chon).`);
      return;
    }

    setValidationMsg('');

    setIsSaving(true);
    setSaveWarning('');
    try {
      // Snapshot mode: selectedClass là SnapshotClassSection → dùng classSectionId
      // Enrollment mode: selectedClass là ClassSection → dùng _id
      const classId =
        mode === 'snapshot'
          ? selectedClass.classSectionId
          : selectedClass._id;

      const payload = {
        classId,
        slotId: selectedSlot.slotId,
        slotDate: selectedSlot.slotDate || selectedSlot.slotId,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          note: s.note || '',
        })),
      };

      const res = await attendanceService.markAttendance(payload);
      const result = res.data.data;

      if (result.warningTriggered) {
        setSaveWarning(
          `⚠️ Cảnh báo: Buổi này có ${result.absentCount}/${result.saved} sinh viên vắng (> 15%)!`,
        );
      }

      showSuccess('Lưu điểm danh thành công!');

      if (mode === 'snapshot') {
        setView('snapshot-classes');
        loadClassSectionsFromSnapshot(selectedSnapshot);
      } else {
        setView('slots');
        loadSlots(selectedClass);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Lưu thất bại, thử lại sau';
      setValidationMsg(msg);
    } finally {
      setIsSaving(false);
    }
  }

  // ── HIỆN THÔNG BÁO THÀNH CÔNG (tự ẩn 3 giây) ─────────────
  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* ── THÔNG BÁO THÀNH CÔNG ── */}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}
        {saveWarning && (
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-800 text-sm font-medium">
            {saveWarning}
          </div>
        )}
        {validationMsg && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm font-medium">
            {validationMsg}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            VIEW 1: CHỌN CHẾ ĐỘ
        ════════════════════════════════════════════════════ */}
        {view === 'classes' && (
          <ClassListView
            classes={classes}
            isLoading={isLoading}
            loadError={loadError}
            onSelectClass={loadSlots}
            onRetry={loadClasses}
            mode={mode}
            onModeChange={setMode}
            onSelectSnapshot={loadClassSectionsFromSnapshot}
            isLoadingSnapshots={isLoadingSnapshots}
          />
        )}

        {/* ════════════════════════════════════════════════════
            VIEW 2: DANH SÁCH LỚP TRONG SNAPSHOT
        ════════════════════════════════════════════════════ */}
        {view === 'snapshot-classes' && (
          <SnapshotClassListView
            snapshot={selectedSnapshot}
            classSections={snapshotClassSections}
            isLoading={isLoading}
            loadError={loadError}
            onSelectClassSection={(cs) => {
              setSelectedClass(cs);
              setView('slots');
            }}
            onBack={() => {
              setView('classes');
              setSelectedSnapshot(null);
              setSnapshotClassSections([]);
            }}
          />
        )}

        {/* ════════════════════════════════════════════════════
            VIEW 3: DANH SÁCH BUỔI HỌC CỦA LỚP
        ════════════════════════════════════════════════════ */}
        {view === 'slots' && selectedClass && (
          <SlotListView
            selectedClass={selectedClass}
            slots={slots}
            isLoading={isLoading}
            loadError={loadError}
            newSlotDate={newSlotDate}
            onSlotDateChange={setNewSlotDate}
            allowedDateOptions={allowedDateOptions}
            minDate={pickerBounds.min}
            maxDate={pickerBounds.max}
            onSelectSlot={loadAttendance}
            onNewSlot={handleNewSlot}
            onBack={() => {
              if (mode === 'snapshot') {
                setView('snapshot-classes');
              } else {
                setView('classes');
              }
            }}
            mode={mode}
            selectedSnapshot={selectedSnapshot}
          />
        )}

        {/* ════════════════════════════════════════════════════
            VIEW 4: BẢNG ĐIỂM DANH
        ════════════════════════════════════════════════════ */}
        {view === 'attendance' && selectedClass && selectedSlot && (
          <AttendanceTableView
            selectedClass={selectedClass}
            selectedSlot={selectedSlot}
            students={students}
            isLoading={isLoading}
            isSaving={isSaving}
            onStatusChange={handleStatusChange}
            onNoteChange={handleNoteChange}
            onMarkAllPresent={handleMarkAllPresent}
            onSave={handleSave}
            onBack={() => {
              if (mode === 'snapshot') {
                setView('snapshot-classes');
                loadClassSectionsFromSnapshot(selectedSnapshot);
              } else {
                setView('slots');
                loadSlots(selectedClass);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: VIEW 1 - Chọn chế độ & danh sách lớp
// ─────────────────────────────────────────────────────────────
function ClassListView({
  classes,
  isLoading,
  loadError,
  onSelectClass,
  onRetry,
  mode,
  onModeChange,
  onSelectSnapshot,
  isLoadingSnapshots,
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Tải danh sách snapshot khi chuyển sang mode snapshot
  useEffect(() => {
    if (mode === 'snapshot') {
      setLoadingSnapshots(true);
      enrollmentSnapshotService
        .list({ limit: 50 })
        .then((res) => {
          // Chỉ lấy các bản không phải dryRun
          const live = (res.data.data || []).filter((s) => !s.dryRun);
          setSnapshots(live);
        })
        .catch(() => setSnapshots([]))
        .finally(() => setLoadingSnapshots(false));
    }
  }, [mode]);

  return (
    <div>
      {/* Tiêu đề */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Điểm danh</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chọn lớp học để xem và cập nhật điểm danh sinh viên.
        </p>
      </div>

      {/* Toggle chế độ */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => onModeChange('enrollment')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            mode === 'enrollment'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📋 Theo lớp Enrollment
          <span className="text-xs opacity-75">hiện tại</span>
        </button>
        <button
          onClick={() => onModeChange('snapshot')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            mode === 'snapshot'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📸 Theo Snapshot xếp lớp
          <span className="text-xs opacity-75">lịch sử</span>
        </button>
      </div>

      {/* Nội dung theo chế độ */}
      {mode === 'enrollment' ? (
        /* ── ENROLLMENT MODE ── */
        <>
          {/* Đang tải */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              Đang tải danh sách lớp...
            </div>
          )}

          {/* Lỗi */}
          {!isLoading && loadError && (
            <div className="rounded-xl bg-white border border-slate-200 py-12 text-center">
              <p className="text-red-500 text-sm">{loadError}</p>
              <button
                onClick={onRetry}
                className="mt-3 rounded-md bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Trống */}
          {!isLoading && !loadError && classes.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-4xl">🏫</p>
              <p className="mt-2 font-medium text-slate-600">Không có lớp học nào</p>
              <p className="mt-1 text-sm text-slate-400">
                Chưa có lớp học phần nào đang hoạt động trong hệ thống.
              </p>
            </div>
          )}

          {/* Lưới thẻ lớp học */}
          {!isLoading && !loadError && classes.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <ClassCard key={cls._id} cls={cls} onSelect={() => onSelectClass(cls)} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── SNAPSHOT MODE ── */
        <>
          {/* Thông tin */}
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700">
            Chọn một bản snapshot để điểm danh đúng danh sách sinh viên tại thời điểm bản đó được lưu.
          </div>

          {/* Đang tải danh sách snapshot */}
          {loadingSnapshots && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              Đang tải danh sách snapshot...
            </div>
          )}

          {/* Trống */}
          {!loadingSnapshots && snapshots.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-4xl">📸</p>
              <p className="mt-2 font-medium text-slate-600">Không có bản snapshot nào</p>
              <p className="mt-1 text-sm text-slate-400">
                Chưa có bản lưu xếp lớp nào được tạo (không phải dry-run).
              </p>
            </div>
          )}

          {/* Danh sách snapshot */}
          {!loadingSnapshots && snapshots.length > 0 && (
            <div className="space-y-3">
              {snapshots.map((snap) => (
                <SnapshotCard
                  key={snap._id}
                  snapshot={snap}
                  onSelect={() => onSelectSnapshot(snap)}
                  isLoading={isLoadingSnapshots}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Thẻ lớp học (ClassCard)
// Hiển thị: sĩ số, số buổi đã dạy/tổng số buổi, tỷ lệ chuyên cần
// ─────────────────────────────────────────────────────────────
function ClassCard({ cls, onSelect }) {
  const rateColor = getRateColor(cls.avgAttendanceRate);

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
    >
      {/* Dòng 1: Mã lớp + tên môn */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {cls.classCode}
          </p>
          <p className="mt-0.5 font-semibold text-slate-800 line-clamp-1">
            {cls.subject?.subjectName || cls.className}
          </p>
        </div>
        {/* Badge học kỳ */}
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          HK{cls.semester} / {cls.academicYear}
        </span>
      </div>

      {/* Dòng 2: Giảng viên */}
      <p className="mt-2 text-xs text-slate-500">
        👨‍🏫 {cls.teacher?.fullName || 'Chưa có GV'}
      </p>

      {/* Đường kẻ phân cách */}
      <div className="my-3 border-t border-slate-100" />

      {/* Dòng 3: Thống kê nhanh */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Sĩ số */}
        <div>
          <p className="text-xl font-bold text-slate-800">{cls.enrollmentCount}</p>
          <p className="text-xs text-slate-400">Sĩ số</p>
        </div>

        {/* Số buổi đã dạy / tổng */}
        <div>
          <p className="text-xl font-bold text-slate-800">
            {cls.taughtSlots}
            <span className="text-sm font-normal text-slate-400">
              /{cls.totalSessions || '?'}
            </span>
          </p>
          <p className="text-xs text-slate-400">Buổi dạy</p>
        </div>

        {/* Tỷ lệ chuyên cần */}
        <div>
          <p className={`text-xl font-bold ${rateColor}`}>
            {cls.taughtSlots === 0 ? '—' : `${cls.avgAttendanceRate}%`}
          </p>
          <p className="text-xs text-slate-400">Chuyên cần</p>
        </div>
      </div>

      {/* Thanh tiến trình chuyên cần */}
      {cls.taughtSlots > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                cls.avgAttendanceRate >= 80
                  ? 'bg-green-500'
                  : cls.avgAttendanceRate >= 60
                    ? 'bg-yellow-400'
                    : 'bg-red-500'
              }`}
              style={{ width: `${cls.avgAttendanceRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Nút xem điểm danh */}
      <button className="mt-3 w-full rounded-md bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
        📋 Xem Điểm danh
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: VIEW 2 - Danh sách buổi học của lớp
// ─────────────────────────────────────────────────────────────
function SlotListView({
  selectedClass,
  slots,
  isLoading,
  loadError,
  newSlotDate,
  onSlotDateChange,
  allowedDateOptions,
  minDate,
  maxDate,
  onSelectSlot,
  onNewSlot,
  onBack,
  mode,
  selectedSnapshot,
}) {
  const isSnapshotMode = mode === 'snapshot';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <button onClick={onBack} className="hover:text-indigo-600 hover:underline">
          {isSnapshotMode ? '📸 Snapshot' : 'Danh sách lớp'}
        </button>
        <span>›</span>
        <span className="font-medium text-slate-700">
          {selectedClass.classCode || selectedClass.subjectCode || selectedClass.subjectName} —
          {' '}{selectedClass.subjectName || selectedClass.subject?.subjectName || '—'}
        </span>
      </div>

      {/* Thông tin lớp */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-4 items-center">
        <div>
          <p className="text-xs text-slate-400">Lớp học phần</p>
          <p className="font-bold text-slate-800">
            {selectedClass.classCode || selectedClass.subjectCode || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Môn học</p>
          <p className="font-medium text-slate-700">
            {selectedClass.subjectName || selectedClass.subject?.subjectName || '—'}
          </p>
        </div>
        {isSnapshotMode ? (
          <>
            <div>
              <p className="text-xs text-slate-400">Sĩ số snapshot</p>
              <p className="font-medium text-slate-700">{selectedClass.studentCount} SV</p>
            </div>
            {selectedSnapshot && (
              <div>
                <p className="text-xs text-slate-400">Nguồn snapshot</p>
                <p className="font-medium text-indigo-700">{selectedSnapshot.title}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <p className="text-xs text-slate-400">Sĩ số</p>
              <p className="font-medium text-slate-700">{selectedClass.enrollmentCount} SV</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Đã dạy</p>
              <p className="font-medium text-slate-700">
                {selectedClass.taughtSlots}/{selectedClass.totalSessions || '?'} buổi
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Chuyên cần TB</p>
              <p className={`font-bold ${getRateColor(selectedClass.avgAttendanceRate)}`}>
                {selectedClass.taughtSlots > 0 ? `${selectedClass.avgAttendanceRate}%` : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tạo buổi điểm danh mới */}
      <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="mb-2 text-sm font-semibold text-indigo-800">
          {isSnapshotMode ? '📅 Chọn ngày điểm danh (snapshot)' : '📅 Tạo buổi điểm danh mới'}
        </p>
        {Array.isArray(allowedDateOptions) && allowedDateOptions.length > 0 && (
          <p className="mb-2 text-xs text-indigo-700">
            Ngày hợp lệ theo lịch học (Schedule):{' '}
            <span className="font-medium">
              {allowedDateOptions.length} buổi — {formatDateVi(allowedDateOptions[0])} →{' '}
              {formatDateVi(allowedDateOptions[allowedDateOptions.length - 1])}
            </span>
            <span className="block text-indigo-600/90">Chi tiết từng ngày nằm trong ô chọn bên dưới.</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          {Array.isArray(allowedDateOptions) && allowedDateOptions.length > 0 ? (
            <select
              value={newSlotDate}
              onChange={(e) => onSlotDateChange(e.target.value)}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {allowedDateOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDateVi(d)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              value={newSlotDate}
              onChange={(e) => onSlotDateChange(e.target.value)}
              min={minDate}
              max={maxDate}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
          <button
            onClick={onNewSlot}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            ＋ Bắt đầu điểm danh
          </button>
        </div>
      </div>

      {/* Tiêu đề bảng buổi học */}
      <h2 className="mb-3 text-base font-semibold text-slate-700">
        Lịch sử điểm danh ({slots.length} buổi)
      </h2>

      {/* Đang tải */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-slate-400">Đang tải...</div>
      )}

      {/* Chưa có buổi nào */}
      {!isLoading && slots.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center">
          <p className="text-2xl">📂</p>
          <p className="mt-2 text-sm text-slate-500">Chưa có buổi điểm danh nào</p>
          <p className="text-xs text-slate-400">Chọn ngày và nhấn &quot;Bắt đầu điểm danh&quot;</p>
        </div>
      )}

      {/* Danh sách buổi học */}
      {!isLoading && slots.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div className="col-span-2">Ngày học</div>
            <div className="text-center">Sĩ số</div>
            <div className="text-center text-green-700">Có mặt</div>
            <div className="text-center text-yellow-700">Đi trễ</div>
            <div className="text-center text-red-700">Vắng</div>
          </div>

          {slots.map((slot) => (
            <div
              key={slot.slotId}
              onClick={() => onSelectSlot(slot)}
              className="grid cursor-pointer grid-cols-6 gap-2 border-b border-slate-100 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-indigo-50"
            >
              <div className="col-span-2">
                <p className="font-medium text-slate-800">
                  {slot.slotDate
                    ? new Date(slot.slotDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : slot.slotId}
                </p>
              </div>
              <div className="flex items-center justify-center text-slate-600">
                {slot.totalStudents}
              </div>
              <div className="flex items-center justify-center font-medium text-green-700">
                {slot.presentCount}
              </div>
              <div className="flex items-center justify-center font-medium text-yellow-600">
                {slot.lateCount}
              </div>
              <div className="flex items-center justify-center font-medium text-red-600">
                {slot.absentCount}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: VIEW 3 - Bảng điểm danh
// ─────────────────────────────────────────────────────────────
function AttendanceTableView({
  selectedClass,
  selectedSlot,
  students,
  isLoading,
  isSaving,
  onStatusChange,
  onNoteChange,
  onMarkAllPresent,
  onSave,
  onBack,
}) {
  // Thống kê nhanh (tính real-time từ state)
  const presentCount = students.filter((s) => s.status === 'Present').length;
  const lateCount    = students.filter((s) => s.status === 'Late').length;
  const absentCount  = students.filter((s) => s.status === 'Absent').length;

  const slotDateLabel = selectedSlot.slotDate
    ? new Date(selectedSlot.slotDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : selectedSlot.slotId;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => onBack()}
          className="hover:text-indigo-600 hover:underline"
        >
          {selectedClass.classCode || selectedClass.subjectCode || selectedClass.subjectName || 'Lớp'}
        </button>
        <span>›</span>
        <span className="font-medium text-slate-700">{slotDateLabel}</span>
      </div>

      {/* Thanh công cụ trên bảng */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Bảng điểm danh</h2>
          <p className="text-sm text-slate-500">
            {selectedClass.subjectName || selectedClass.subject?.subjectName || '—'} — {slotDateLabel}
          </p>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            ✓ {presentCount} có mặt
          </span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
            ⏰ {lateCount} trễ
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            ✗ {absentCount} vắng
          </span>
        </div>
      </div>

      {/* Nút tác vụ nhanh */}
      <div className="mb-3 flex items-center gap-2">
        {/* 3a. Quick select - mark all Present */}
        <button
          onClick={onMarkAllPresent}
          className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
        >
          ✓ Đánh dấu tất cả Có mặt
        </button>
        <span className="text-xs text-slate-400">{students.length} sinh viên</span>
      </div>

      {/* Đang tải */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-slate-400">Đang tải...</div>
      )}

      {/* Bảng điểm danh */}
      {!isLoading && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header bảng */}
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div className="col-span-1 text-center">STT</div>
            <div className="col-span-1 text-center">Ảnh</div>
            <div className="col-span-3">Họ và Tên</div>
            <div className="col-span-2">MSSV</div>
            <div className="col-span-3 text-center">Trạng thái</div>
            <div className="col-span-2">Ghi chú</div>
          </div>

          {/* Dòng trống */}
          {students.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              Chưa có sinh viên nào trong lớp này
            </div>
          )}

          {/* Các dòng sinh viên */}
          {students.map((student, index) => (
            <StudentRow
              key={student.studentId}
              student={student}
              index={index}
              onStatusChange={onStatusChange}
              onNoteChange={onNoteChange}
            />
          ))}
        </div>
      )}

      {/* Nút Lưu */}
      {students.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {isSaving ? '⏳ Đang lưu...' : '💾 Lưu điểm danh'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Dòng sinh viên trong bảng điểm danh
// ─────────────────────────────────────────────────────────────
function StudentRow({ student, index, onStatusChange, onNoteChange }) {
  const avatarColor = getAvatarColor(student.fullName);
  const initials = getInitials(student.fullName);

  return (
    <div
      className={`grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-2.5 text-sm items-center last:border-0 ${
        student.status === 'Absent' ? 'bg-red-50' : ''
      } ${student.absenceWarning ? 'border-l-2 border-l-orange-400' : ''}`}
    >
      {/* STT */}
      <div className="col-span-1 text-center text-xs text-slate-400">
        {index + 1}
      </div>

      {/* Ảnh đại diện (dùng chữ viết tắt) */}
      <div className="col-span-1 flex justify-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor}`}
          title={student.fullName}
        >
          {initials}
        </div>
      </div>

      {/* Họ tên + cảnh báo */}
      <div className="col-span-3">
        <p className="font-medium text-slate-800 truncate">{student.fullName}</p>
        {student.absenceWarning && (
          <p className="text-[10px] text-orange-600 font-semibold">⚠️ Vắng &gt;15%</p>
        )}
      </div>

      {/* MSSV */}
      <div className="col-span-2 text-xs text-slate-500">{student.studentCode}</div>

      {/* Nút chọn trạng thái */}
      <div className="col-span-3 flex items-center justify-center gap-1">
        {['Present', 'Late', 'Absent'].map((status) => {
          const isActive = student.status === status;
          const styles = STATUS_BUTTON_STYLES[status];
          return (
            <button
              key={status}
              onClick={() => onStatusChange(student.studentId, status)}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all ${
                isActive ? styles.active : styles.idle
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
        {!student.status && (
          <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            Chua chon
          </span>
        )}
      </div>

      {/* Ô ghi chú */}
      <div className="col-span-2">
        <input
          type="text"
          value={student.note || ''}
          onChange={(e) => onNoteChange(student.studentId, e.target.value)}
          placeholder="Ghi chú..."
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Thẻ snapshot (chọn snapshot để điểm danh)
// ─────────────────────────────────────────────────────────────
function SnapshotCard({ snapshot, onSelect, isLoading }) {
  const sem = snapshot.semesterSnapshot || {};
  const summary = snapshot.summary || {};
  const createdAt = new Date(snapshot.createdAt);

  return (
    <div
      onClick={isLoading ? undefined : onSelect}
      className={`cursor-pointer rounded-xl border bg-white p-4 transition-all hover:shadow-md ${
        isLoading
          ? 'border-slate-200 opacity-60 cursor-not-allowed'
          : 'border-indigo-200 hover:border-indigo-400'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Tiêu đề snapshot */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              LIVE
            </span>
            <p className="font-semibold text-slate-800 truncate">{snapshot.title}</p>
          </div>

          {/* Mô tả */}
          {snapshot.description && (
            <p className="mt-0.5 text-sm text-slate-500 truncate">{snapshot.description}</p>
          )}

          {/* Thông tin học kỳ */}
          <p className="mt-2 text-xs text-slate-400">
            {sem.semesterNum ? `HK${sem.semesterNum}` : ''}
            {sem.academicYear ? ` · ${sem.academicYear}` : ''}
            {snapshot.curriculumCode ? ` · ${snapshot.curriculumCode}` : ''}
          </p>

          {/* Thống kê nhanh */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {summary.totalEnrollments != null && (
              <span>
                <strong>{summary.totalEnrollments}</strong> SV enrolled
              </span>
            )}
            {summary.totalWaitlisted != null && summary.totalWaitlisted > 0 && (
              <span className="text-yellow-600">
                <strong>{summary.totalWaitlisted}</strong> chờ
              </span>
            )}
            {summary.totalFailed != null && summary.totalFailed > 0 && (
              <span className="text-red-600">
                <strong>{summary.totalFailed}</strong> lỗi
              </span>
            )}
          </div>
        </div>

        {/* Ngày tạo */}
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-400">
            {createdAt.toLocaleDateString('vi-VN')}
          </p>
          <p className="text-xs text-slate-400">
            {createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <button
        disabled={isLoading}
        className="mt-3 w-full rounded-md bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
      >
        Chọn bản này để xem lớp
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: VIEW 2b - Danh sách lớp trong 1 snapshot
// ─────────────────────────────────────────────────────────────
function SnapshotClassListView({
  snapshot,
  classSections,
  isLoading,
  loadError,
  onSelectClassSection,
  onBack,
}) {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={onBack}
          className="hover:text-indigo-600 hover:underline"
        >
          Danh sách lớp
        </button>
        <span>›</span>
        <span className="font-medium text-slate-700">
          📸 {snapshot.title}
        </span>
      </div>

      {/* Thông tin snapshot */}
      <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="font-semibold text-indigo-900">{snapshot.title}</p>
        {snapshot.description && (
          <p className="mt-1 text-sm text-indigo-700">{snapshot.description}</p>
        )}
        <p className="mt-2 text-xs text-indigo-600">
          Điểm danh theo danh sách sinh viên tại thời điểm snapshot này được lưu.
          Các lớp được xếp bên dưới là kết quả từ bản snapshot.
        </p>
      </div>

      {/* Tiêu đề */}
      <h2 className="mb-3 text-base font-semibold text-slate-700">
        Danh sách lớp trong snapshot ({classSections.length} lớp)
      </h2>

      {/* Đang tải */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          Đang tải...
        </div>
      )}

      {/* Lỗi */}
      {!isLoading && loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 py-8 text-center text-sm text-red-600">
          {loadError}
        </div>
      )}

      {/* Trống */}
      {!isLoading && !loadError && classSections.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center">
          <p className="text-2xl">📭</p>
          <p className="mt-2 text-sm text-slate-500">Không có lớp nào trong snapshot này</p>
        </div>
      )}

      {/* Danh sách lớp snapshot */}
      {!isLoading && !loadError && classSections.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Mã lớp</div>
            <div className="col-span-2">Môn học</div>
            <div className="col-span-2 text-center">Sĩ số snapshot</div>
          </div>

          {classSections.map((cs) => (
            <div
              key={cs.classSectionId}
              onClick={() => onSelectClassSection(cs)}
              className="grid cursor-pointer grid-cols-5 gap-2 border-b border-slate-100 px-4 py-3 text-sm transition-colors hover:bg-indigo-50 last:border-0"
            >
              <div className="font-semibold text-indigo-700">
                {cs.classCode || '—'}
              </div>
              <div className="col-span-2">
                <p className="font-medium text-slate-800">{cs.subjectName || '—'}</p>
                <p className="text-xs text-slate-400">{cs.subjectCode}</p>
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                  {cs.studentCount} SV
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
