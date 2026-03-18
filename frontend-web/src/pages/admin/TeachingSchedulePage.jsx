import { useEffect, useMemo, useState } from 'react';
import lecturerService from '../../services/lecturerService';
import scheduleService from '../../services/scheduleService';
import subjectService from '../../services/subjectService';
import roomService from '../../services/roomService';
import timeslotService from '../../services/timeslotService';

const DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

const DAY_LABEL_BY_VALUE = DAYS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

function normalizeLecturerOptions(response) {
  const list = response?.data?.data || response?.data || [];
  if (!Array.isArray(list)) return [];

  return list.map((item) => ({
    id: item._id,
    label: `${item.teacherCode || 'GV'} - ${item.fullName || 'Chưa có tên'}`,
  }));
}

function formatRoomLabel(room) {
  return room?.roomCode || room?.roomName || room?.roomNumber || 'Chưa xếp phòng';
}

function formatTimeslotLabel(timeslot) {
  if (!timeslot) return 'Chưa xếp ca học';
  if (timeslot.groupName && timeslot.startTime && timeslot.endTime) {
    return `${timeslot.groupName} (${timeslot.startTime}-${timeslot.endTime})`;
  }
  return timeslot.groupName || `${timeslot.startTime || '--'}-${timeslot.endTime || '--'}`;
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'Chưa có ngày học';
  const start = startDate ? new Date(startDate).toLocaleDateString('vi-VN') : '--';
  const end = endDate ? new Date(endDate).toLocaleDateString('vi-VN') : '--';
  return `${start} - ${end}`;
}

export default function TeachingSchedulePage() {
  const [userRole, setUserRole] = useState('');
  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';

  const [loading, setLoading] = useState(false);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [data, setData] = useState(null);
  const [lecturers, setLecturers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [facultyFilter, setFacultyFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [generateForm, setGenerateForm] = useState({
    semester: '1',
    academicYear: '2025-2026',
    expectedEnrollment: 40,
    startDate: '',
    endDate: '',
  });
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [generateError, setGenerateError] = useState('');
  const [dragging, setDragging] = useState(null);

  const sortedTimeslots = useMemo(
    () => [...timeslots].sort((a, b) => (a.startPeriod || 0) - (b.startPeriod || 0)),
    [timeslots],
  );

  const getSubjectMajorCodes = (subject) => {
    const set = new Set();
    if (subject?.majorCode) set.add(String(subject.majorCode).toUpperCase());
    if (Array.isArray(subject?.majorCodes)) {
      subject.majorCodes.forEach((m) => m && set.add(String(m).toUpperCase()));
    }
    if (Array.isArray(subject?.majorRequirements)) {
      subject.majorRequirements.forEach((m) => m?.majorCode && set.add(String(m.majorCode).toUpperCase()));
    }
    return Array.from(set);
  };

  const facultyOptions = useMemo(() => {
    const set = new Set();
    subjects.forEach((s) => s?.facultyCode && set.add(String(s.facultyCode).toUpperCase()));
    return Array.from(set).sort();
  }, [subjects]);

  const majorOptions = useMemo(() => {
    const set = new Set();
    subjects.forEach((s) => getSubjectMajorCodes(s).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const okFaculty = !facultyFilter || String(s?.facultyCode || '').toUpperCase() === facultyFilter;
      const majors = getSubjectMajorCodes(s);
      const okMajor = !majorFilter || majors.includes(majorFilter);
      return okFaculty && okMajor;
    });
  }, [subjects, facultyFilter, majorFilter]);

  const teachingClasses = data?.classes || [];

  const scheduleEntries = useMemo(() => {
    return teachingClasses.flatMap((cls) =>
      (cls.schedules || []).map((schedule, index) => ({
        key: `${cls._id}-${schedule._id || index}`,
        classId: cls._id,
        classCode: cls.classCode,
        className: cls.className,
        subject: cls.subject,
        room: schedule.room || cls.room,
        timeslot: cls.timeslot,
        dayOfWeek: schedule.dayOfWeek,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        currentEnrollment: cls.currentEnrollment,
        maxCapacity: cls.maxCapacity,
      })),
    );
  }, [teachingClasses]);

  const timetableSlots = useMemo(() => {
    const slotMap = new Map();
    teachingClasses.forEach((cls) => {
      if (!cls?.timeslot?._id) return;
      slotMap.set(String(cls.timeslot._id), cls.timeslot);
    });

    return Array.from(slotMap.values()).sort((a, b) => {
      const byStart = String(a?.startTime || '').localeCompare(String(b?.startTime || ''));
      if (byStart !== 0) return byStart;
      return String(a?.groupName || '').localeCompare(String(b?.groupName || ''));
    });
  }, [teachingClasses]);

  const classesWithoutSchedules = useMemo(
    () => teachingClasses.filter((cls) => !Array.isArray(cls.schedules) || cls.schedules.length === 0),
    [teachingClasses],
  );

  const teachingStats = useMemo(() => {
    const totalStudents = teachingClasses.reduce(
      (sum, cls) => sum + Number(cls.currentEnrollment || 0),
      0,
    );

    return {
      totalClasses: teachingClasses.length,
      totalStudents,
      scheduledSessions: scheduleEntries.length,
    };
  }, [teachingClasses, scheduleEntries]);

  const fetchSchedule = async (teacherId = '') => {
    setLoading(true);
    setError('');
    setHint('');

    try {
      const params = teacherId ? { teacherId } : {};
      const response = await scheduleService.getTeachingSchedule(params);
      setData(response?.data?.data || null);
    } catch (err) {
      const message = err?.response?.data?.message || 'Không tải được lịch giảng dạy';
      setData(null);

      if (!teacherId && message.includes('Please select a lecturer')) {
        setHint('Tài khoản hiện tại không gắn với hồ sơ giảng viên. Hãy chọn một giảng viên để xem lịch.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGeneratorMasterData = async () => {
    try {
      const [subjectsRes, roomsRes, timeslotsRes] = await Promise.all([
        subjectService.getSubjects({ limit: 300 }),
        roomService.getRooms({ limit: 300 }),
        timeslotService.getTimeslots({ limit: 300 }),
      ]);

      setSubjects(subjectsRes?.data?.data || []);
      setRooms((roomsRes?.data?.data || roomsRes?.data?.rooms || []).filter((r) => r.status === 'available'));
      setTimeslots(timeslotsRes?.data?.data || timeslotsRes?.data?.timeslots || []);
    } catch (err) {
      setGenerateError('Không tải được dữ liệu môn học, phòng hoặc ca học.');
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      const parsed = raw ? JSON.parse(raw) : null;
      const role = String(parsed?.role || '').toLowerCase();
      setUserRole(role);
    } catch {
      setUserRole('');
    }

    const loadLecturers = async () => {
      setLoadingLecturers(true);
      try {
        const response = await lecturerService.getAll({ limit: 100 });
        setLecturers(normalizeLecturerOptions(response));
      } catch (err) {
        console.error('Failed to load lecturers for filter', err);
      } finally {
        setLoadingLecturers(false);
      }
    };

    loadLecturers();
    if (isAdminOrStaff) {
      loadGeneratorMasterData();
      fetchGeneratedFromDb(generateForm.semester, generateForm.academicYear, '');
    }
    fetchSchedule('');
  }, [isAdminOrStaff]);

  useEffect(() => {
    if (!selectedTeacherId) return;
    fetchSchedule(selectedTeacherId);
  }, [selectedTeacherId]);

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleGenerate = async () => {
    setGenerateError('');
    setGenerateResult(null);

    if (selectedSubjectIds.length === 0) {
      setGenerateError('Vui lòng chọn ít nhất 1 học phần để tạo lịch.');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        semester: Number(generateForm.semester),
        academicYear: generateForm.academicYear,
        subjectIds: selectedSubjectIds,
        expectedEnrollment: Number(generateForm.expectedEnrollment) || 40,
        availableRooms: rooms.map((r) => r._id),
        availableTimeSlots: sortedTimeslots.map((t) => t._id),
        startDate: generateForm.startDate,
        endDate: generateForm.endDate,
      };

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tạo lịch quá thời gian 30 giây. Vui lòng giảm số môn hoặc thu hẹp bộ lọc.')), 30000);
      });

      const response = await Promise.race([
        scheduleService.autoGenerateTimetables(payload),
        timeoutPromise,
      ]);
      setGenerateResult(response?.data?.data || null);
      await fetchGeneratedFromDb(generateForm.semester, generateForm.academicYear, selectedTeacherId);
    } catch (err) {
      setGenerateError(err?.response?.data?.message || err?.message || 'Tạo lịch giảng dạy thất bại.');
    } finally {
      setGenerating(false);
    }
  };

  const fetchGeneratedFromDb = async (semester, academicYear, teacherId = '') => {
    try {
      const response = await scheduleService.getGeneratedTimetables({
        semester: Number(semester),
        academicYear,
        ...(teacherId ? { teacherId } : {}),
      });
      const data = response?.data?.data || null;
      if (data?.generated?.length > 0) {
        setGenerateResult(data);
      }
    } catch (err) {
      // Ignore reload errors to keep page usable
    }
  };

  const handleDropCard = async (targetDay, targetTimeslotId) => {
    if (!dragging) return;

    try {
      const response = await scheduleService.reassignGeneratedSchedule(dragging.scheduleId, {
        roomId: dragging.room?._id,
        dayOfWeek: targetDay,
        timeslotId: targetTimeslotId,
      });

      const updated = response?.data?.data;
      if (!updated) return;

      setGenerateResult((prev) => {
        if (!prev) return prev;
        const nextGenerated = (prev.generated || []).map((item) => {
          if (item.scheduleId !== dragging.scheduleId) return item;
          return {
            ...item,
            dayOfWeek: updated.dayOfWeek,
            room: updated.room,
            timeslot: updated.timeslot,
          };
        });
        return { ...prev, generated: nextGenerated };
      });
    } catch (err) {
      setGenerateError(err?.response?.data?.message || 'Không thể điều chỉnh lịch do bị xung đột.');
    } finally {
      setDragging(null);
    }
  };

  const getCardsAtCell = (dayOfWeek, timeslotId) => {
    if (!generateResult?.generated) return [];
    return generateResult.generated.filter(
      (g) => Number(g.dayOfWeek) === Number(dayOfWeek) && (
        String(g.timeslot?._id) === String(timeslotId) ||
        String(g.timeslotId) === String(timeslotId)
      ),
    );
  };

  const getTeachingCardsAtCell = (dayOfWeek, timeslotId) => {
    return scheduleEntries.filter(
      (item) =>
        Number(item.dayOfWeek) === Number(dayOfWeek)
        && String(item.timeslot?._id || '') === String(timeslotId),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
      {isAdminOrStaff && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Tạo thời khóa biểu</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chọn học phần theo học kỳ, hệ thống tự tạo lớp học phần và xếp phòng, ca học. Sau đó bạn có thể kéo thả để điều chỉnh thủ công.
          </p>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Học kỳ</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={generateForm.semester}
              onChange={(e) => setGenerateForm((p) => ({ ...p, semester: e.target.value }))}
            >
              <option value="1">HK1</option>
              <option value="2">HK2</option>
              <option value="3">HK3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Năm học</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={generateForm.academicYear}
              onChange={(e) => setGenerateForm((p) => ({ ...p, academicYear: e.target.value }))}
              placeholder="2025-2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Sĩ số dự kiến / lớp</label>
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={generateForm.expectedEnrollment}
              onChange={(e) => setGenerateForm((p) => ({ ...p, expectedEnrollment: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={generateForm.endDate}
                onChange={(e) => setGenerateForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Lọc theo khoa</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
              >
                <option value="">Tất cả khoa</option>
                {facultyOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Lọc theo ngành</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
              >
                <option value="">Tất cả ngành</option>
                {majorOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Chọn học phần cần tạo lịch ({selectedSubjectIds.length} đã chọn / {filteredSubjects.length} đang hiển thị)
            </p>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setSelectedSubjectIds(filteredSubjects.map((s) => s._id))}
            >
              Chọn tất cả
            </button>
          </div>
          <div className="max-h-48 overflow-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((s) => (
              <label key={s._id} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSubjectIds.includes(s._id)}
                  onChange={() => toggleSubject(s._id)}
                />
                <span>{s.subjectCode} - {s.subjectName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
          >
            {generating ? 'Đang tạo...' : 'Tạo thời khóa biểu'}
          </button>
          {generateResult?.summary && (
            <p className="text-sm text-slate-600">
              Đã tạo: <strong>{generateResult.summary.generatedClasses}</strong> | Chưa xếp được: <strong>{generateResult.summary.unassignedClasses}</strong>
            </p>
          )}
        </div>

        {generateError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {generateError}
          </div>
        )}

        {generateResult?.unassigned?.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Cảnh báo các lớp chưa xếp được:</p>
            <ul className="mt-1 space-y-1">
              {generateResult.unassigned.map((u, idx) => (
                <li key={`${u.subjectCode}-${idx}`}>- {u.subjectCode}: {u.reason}</li>
              ))}
            </ul>
          </div>
        )}

          {generateResult?.generated?.length > 0 && (
            <div className="mt-5 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left">Ca học</th>
                    {DAYS.map((d) => (
                      <th key={d.value} className="border border-slate-200 p-2 text-left">{d.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTimeslots.map((slot) => (
                    <tr key={slot._id}>
                      <td className="border border-slate-200 p-2 align-top bg-slate-50">
                        <div className="font-medium">{slot.groupName}</div>
                        <div className="text-xs text-slate-500">Tiết {slot.startPeriod}-{slot.endPeriod}</div>
                        <div className="text-xs text-slate-500">{slot.startTime}-{slot.endTime}</div>
                      </td>
                      {DAYS.map((day) => {
                        const cards = getCardsAtCell(day.value, slot._id);
                        return (
                          <td
                            key={`${day.value}-${slot._id}`}
                            className="border border-slate-200 p-2 align-top min-h-[100px]"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropCard(day.value, slot._id)}
                          >
                            <div className="space-y-2 min-h-[70px]">
                              {cards.map((card) => (
                                <div
                                  key={card.scheduleId}
                                  draggable
                                  onDragStart={() => setDragging(card)}
                                  className="cursor-move rounded border border-indigo-200 bg-indigo-50 p-2"
                                  title="Kéo đến ô khác để điều chỉnh"
                                >
                                  <div className="text-xs font-semibold text-indigo-800">{card.classCode}</div>
                                  <div className="text-xs text-indigo-700">{card.subject?.subjectCode}</div>
                                  <div className="text-xs text-slate-600">{card.room?.roomCode}</div>
                                  <div className="text-xs text-slate-600">{card.teacher?.fullName}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Lịch giảng dạy</h2>
            <p className="mt-1 text-sm text-slate-600">
              Xem các lớp học phần được phân công cho giảng viên trong học kỳ hiện tại.
            </p>
          </div>

          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="teacherId">
              Giảng viên
            </label>
            <div className="flex gap-3">
              <select
                id="teacherId"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                disabled={loadingLecturers}
              >
                <option value="">Tài khoản hiện tại</option>
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                onClick={() => fetchSchedule(selectedTeacherId)}
                disabled={loading}
              >
                {loading ? 'Đang tải...' : 'Xem lịch'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Nếu đang đăng nhập bằng tài khoản giảng viên, bạn có thể để trống bộ lọc này.
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Đang tải lịch giảng dạy...
          </div>
        )}

        {hint && !loading && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {hint}
          </div>
        )}

        {error && !loading && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">Giảng viên</div>
              <div className="text-lg font-bold text-slate-900">{data.teacher?.fullName || '-'}</div>
              <div className="text-sm text-slate-600">{data.teacher?.teacherCode || '-'}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Tổng lớp phụ trách</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{teachingStats.totalClasses}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Tổng sinh viên</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{teachingStats.totalStudents}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Buổi dạy đã xếp lịch</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{teachingStats.scheduledSessions}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Tổng quan học kỳ</h3>
                  <p className="text-sm text-slate-600">
                    Học kỳ {data.semester?.semesterNum || '-'} / {data.semester?.academicYear || '-'}
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  Lớp chưa có lịch học: <strong>{classesWithoutSchedules.length}</strong>
                </div>
              </div>

              {scheduleEntries.length > 0 && timetableSlots.length > 0 ? (
                <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 p-3 text-left">Ca hoc</th>
                        {DAYS.map((day) => (
                          <th key={day.value} className="border border-slate-200 p-3 text-left">
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetableSlots.map((slot) => (
                        <tr key={slot._id}>
                          <td className="border border-slate-200 bg-slate-50 p-3 align-top">
                            <div className="font-semibold text-slate-900">{slot.groupName || 'Ca hoc'}</div>
                            <div className="text-xs text-slate-500">
                              {slot.startTime || '--'} - {slot.endTime || '--'}
                            </div>
                          </td>
                          {DAYS.map((day) => {
                            const cards = getTeachingCardsAtCell(day.value, slot._id);
                            return (
                              <td key={`${day.value}-${slot._id}`} className="border border-slate-200 p-3 align-top">
                                <div className="space-y-2 min-h-[90px]">
                                  {cards.map((card) => (
                                    <div key={card.key} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                        {card.classCode}
                                      </div>
                                      <div className="mt-1 text-sm font-semibold text-slate-900">
                                        {card.subject?.subjectCode || '-'}
                                      </div>
                                      <div className="text-xs text-slate-600">{card.subject?.subjectName || '-'}</div>
                                      <div className="mt-2 text-xs text-slate-600">Phòng: {formatRoomLabel(card.room)}</div>
                                      <div className="text-xs text-slate-600">
                                        Si so: {Number(card.currentEnrollment || 0)}/{Number(card.maxCapacity || 0)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Chưa có buổi dạy nào được xếp lịch cho bộ lọc hiện tại.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Danh sách lớp phụ trách</h3>
                  <p className="text-sm text-slate-600">
                    Các lớp học phần được backend trả về từ API teaching schedule.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {teachingClasses.length} lớp
                </div>
              </div>

              {teachingClasses.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {teachingClasses.map((cls) => (
                    <article key={cls._id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            {cls.classCode}
                          </div>
                          <div className="mt-1 text-base font-semibold text-slate-900">
                            {cls.subject?.subjectCode || '-'} - {cls.subject?.subjectName || cls.className || '-'}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Học kỳ {cls.semester || '-'} / {cls.academicYear || '-'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {Number(cls.currentEnrollment || 0)}/{Number(cls.maxCapacity || 0)} SV
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Phòng</div>
                          <div className="mt-1 font-medium text-slate-900">{formatRoomLabel(cls.room)}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Ca hoc</div>
                          <div className="mt-1 font-medium text-slate-900">{formatTimeslotLabel(cls.timeslot)}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Lịch dạy</div>
                        {Array.isArray(cls.schedules) && cls.schedules.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {cls.schedules.map((schedule, index) => (
                              <span
                                key={schedule._id || `${cls._id}-${index}`}
                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                              >
                                {DAY_LABEL_BY_VALUE[Number(schedule.dayOfWeek)] || `Thứ ${schedule.dayOfWeek || '-'}`} - {formatDateRange(schedule.startDate, schedule.endDate)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Lớp này chưa có lịch học.
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Không có lớp học phần nào cho bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
