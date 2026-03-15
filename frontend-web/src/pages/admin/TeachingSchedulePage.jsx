import { useEffect, useState } from 'react';
import lecturerService from '../../services/lecturerService';
import scheduleService from '../../services/scheduleService';

function normalizeLecturerOptions(response) {
  const list = response?.data?.data || response?.data || [];
  if (!Array.isArray(list)) return [];

  return list.map((item) => ({
    id: item._id,
    label: `${item.teacherCode || 'GV'} - ${item.fullName || 'Chua co ten'}`,
  }));
}

export default function TeachingSchedulePage() {
  const [loading, setLoading] = useState(false);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [data, setData] = useState(null);
  const [lecturers, setLecturers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

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

  useEffect(() => {
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
    fetchSchedule('');
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) return;
    fetchSchedule(selectedTeacherId);
  }, [selectedTeacherId]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lich giang day</h1>
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
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div>
                <span className="font-medium text-slate-700">Bo mon:</span> {data.teacher?.department || '-'}
              </div>
              <div>
                <span className="font-medium text-slate-700">Hoc ky:</span> {data.semester?.semesterNum || '-'}
              </div>
              <div>
                <span className="font-medium text-slate-700">Nam hoc:</span> {data.semester?.academicYear || '-'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Danh sach lop phu trach</div>
              <div className="text-sm text-slate-500">{(data.classes || []).length} lop</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2">Ma lop</th>
                    <th className="px-3 py-2">Mon hoc</th>
                    <th className="px-3 py-2">Hoc ky</th>
                    <th className="px-3 py-2">Phong</th>
                    <th className="px-3 py-2">Ca hoc</th>
                    <th className="px-3 py-2">Si so</th>
                    <th className="px-3 py-2">Lich</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.classes || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-medium text-slate-900">{item.classCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{item.subject?.subjectCode || '-'}</div>
                        <div className="text-slate-500">{item.subject?.subjectName || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        {item.semester} / {item.academicYear}
                      </td>
                      <td className="px-3 py-2">{item.room?.roomCode || '-'}</td>
                      <td className="px-3 py-2">{item.timeslot?.groupName || '-'}</td>
                      <td className="px-3 py-2">
                        {item.currentEnrollment}/{item.maxCapacity}
                      </td>
                      <td className="px-3 py-2">
                        {(item.schedules || []).length === 0 ? (
                          <span className="text-slate-400">Chua co lich</span>
                        ) : (
                          <div className="space-y-1">
                            {item.schedules.map((schedule) => (
                              <div
                                key={schedule._id}
                                className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
                              >
                                Thu {schedule.dayOfWeek} | Tiet {schedule.startPeriod}-{schedule.endPeriod} |{' '}
                                {schedule.room?.roomCode || 'Chua co phong'}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(data.classes || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
                        Khong co lop nao phu hop voi bo loc hien tai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
