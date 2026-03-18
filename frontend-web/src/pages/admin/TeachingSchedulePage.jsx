import { useEffect, useMemo, useState } from 'react';
import lecturerService from '../../services/lecturerService';
import scheduleService from '../../services/scheduleService';
import subjectService from '../../services/subjectService';
import roomService from '../../services/roomService';
import timeslotService from '../../services/timeslotService';

const DAYS = [
  { value: 1, label: 'Thu 2' },
  { value: 2, label: 'Thu 3' },
  { value: 3, label: 'Thu 4' },
  { value: 4, label: 'Thu 5' },
  { value: 5, label: 'Thu 6' },
  { value: 6, label: 'Thu 7' },
];

function normalizeLecturerOptions(response) {
  const list = response?.data?.data || response?.data || [];
  if (!Array.isArray(list)) return [];

  return list.map((item) => ({
    id: item._id,
    label: `${item.teacherCode || 'GV'} - ${item.fullName || 'Chua co ten'}`,
  }));
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

  const fetchSchedule = async (teacherId = '') => {
    setLoading(true);
    setError('');
    setHint('');

    try {
      const params = teacherId ? { teacherId } : {};
      const response = await scheduleService.getTeachingSchedule(params);
      setData(response?.data?.data || null);
    } catch (err) {
      const message = err?.response?.data?.message || 'Khong tai duoc lich giang day';
      setData(null);

      if (!teacherId && message.includes('Please select a lecturer')) {
        setHint('Tai khoan hien tai khong gan voi ho so giang vien. Hay chon mot giang vien de xem lich.');
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
      setGenerateError('Khong tai duoc du lieu mon hoc / phong / timeslot.');
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
      setGenerateError('Vui long chon it nhat 1 hoc phan de generate.');
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
        setTimeout(() => reject(new Error('Generate timeout: vuot qua 30 giay. Vui long giam so mon hoac bo loc hep hon.')), 30000);
      });

      const response = await Promise.race([
        scheduleService.autoGenerateTimetables(payload),
        timeoutPromise,
      ]);
      setGenerateResult(response?.data?.data || null);
      await fetchGeneratedFromDb(generateForm.semester, generateForm.academicYear, selectedTeacherId);
    } catch (err) {
      setGenerateError(err?.response?.data?.message || err?.message || 'Generate timetable that bai.');
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
      setGenerateError(err?.response?.data?.message || 'Khong the dieu chinh lich do xung dot.');
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
      {isAdminOrStaff && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Generate Timetables</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chon hoc phan theo hoc ky, he thong tu tao class section va xep phong/ca hoc. Sau do co the keo-tha de chinh tay.
          </p>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Hoc ky</label>
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
            <label className="block text-sm font-medium text-slate-700">Nam hoc</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={generateForm.academicYear}
              onChange={(e) => setGenerateForm((p) => ({ ...p, academicYear: e.target.value }))}
              placeholder="2025-2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Expected enrollment / lop</label>
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
              <label className="block text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End date</label>
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
              <label className="block text-sm font-medium text-slate-700">Loc theo khoa</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
              >
                <option value="">Tat ca khoa</option>
                {facultyOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Loc theo nganh</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
              >
                <option value="">Tat ca nganh</option>
                {majorOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Chon hoc phan can generate ({selectedSubjectIds.length} da chon / {filteredSubjects.length} hien thi)
            </p>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setSelectedSubjectIds(filteredSubjects.map((s) => s._id))}
            >
              Chon tat ca
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
            {generating ? 'Dang generate...' : 'Generate Timetable'}
          </button>
          {generateResult?.summary && (
            <p className="text-sm text-slate-600">
              Generated: <strong>{generateResult.summary.generatedClasses}</strong> | Unassigned: <strong>{generateResult.summary.unassignedClasses}</strong>
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
            <p className="font-semibold">Canh bao lop chua xep duoc:</p>
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
                    <th className="border border-slate-200 p-2 text-left">Timeslot</th>
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
                        <div className="text-xs text-slate-500">Tiet {slot.startPeriod}-{slot.endPeriod}</div>
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
                                  title="Drag den o khac de dieu chinh"
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
            <h2 className="text-2xl font-bold text-slate-900">Lich giang day</h2>
            <p className="mt-1 text-sm text-slate-600">
              Xem cac lop hoc phan duoc phan cong cho giang vien trong hoc ky hien tai.
            </p>
          </div>

          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="teacherId">
              Giang vien
            </label>
            <div className="flex gap-3">
              <select
                id="teacherId"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                disabled={loadingLecturers}
              >
                <option value="">Tai khoan hien tai</option>
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
                {loading ? 'Dang tai...' : 'Xem lich'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Neu dang nhap bang tai khoan giang vien, ban co the de trong bo loc nay.
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Dang tai lich giang day...
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
              <div className="text-sm text-slate-500">Giang vien</div>
              <div className="text-lg font-bold text-slate-900">{data.teacher?.fullName || '-'}</div>
              <div className="text-sm text-slate-600">{data.teacher?.teacherCode || '-'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
