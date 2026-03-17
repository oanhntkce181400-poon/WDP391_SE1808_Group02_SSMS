import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import lecturerService from '../../services/lecturerService';
import scheduleService from '../../services/scheduleService';
import authService from '../../services/authService';

function normalizeLecturerOptions(response) {
  const list = response?.data?.data || response?.data || [];
  if (!Array.isArray(list)) return [];

  return list.map((item) => ({
    id: item._id,
    label: `${item.teacherCode || 'GV'} - ${item.fullName || 'Chua co ten'}`,
  }));
}

async function fetchAllLecturerOptions() {
  // API list giang vien dang phan trang, can gom tat ca trang de khong bi thieu account.
  const pageSize = 100;
  let currentPage = 1;
  let totalPages = 1;
  let allOptions = [];

  do {
    const response = await lecturerService.getAll({ limit: pageSize, page: currentPage });
    const options = normalizeLecturerOptions(response);
    allOptions = [...allOptions, ...options];

    totalPages = response?.data?.pagination?.totalPages || 1;
    currentPage += 1;
  } while (currentPage <= totalPages);

  return allOptions;
}

export default function TeachingSchedulePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [data, setData] = useState(null);
  const [lecturers, setLecturers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isLecturerRole, setIsLecturerRole] = useState(false);
  const [canEnterGrades, setCanEnterGrades] = useState(false);
  const [gradeEntryBasePath, setGradeEntryBasePath] = useState('/lecturer');
  const [currentAccountLabel, setCurrentAccountLabel] = useState('Tai khoan hien tai');

  const fetchSchedule = async (teacherId = '') => {
    setLoading(true);
    setError('');
    setHint('');

    try {
      // includeAllClasses=true de backend tra ve day du lop cua giang vien,
      // khong bi gioi han boi hoc ky hien tai.
      const params = {
        includeAllClasses: true,
        ...(teacherId ? { teacherId } : {}),
      };
      const response = await scheduleService.getTeachingSchedule(params);
      const scheduleData = response?.data?.data || null;
      setData(scheduleData);

      // Neu la lecturer thi label dropdown lay tu teacher profile (model Teacher)
      // thay vi lay tu user profile de dam bao dung teacherCode/fullName.
      if (isLecturerRole && scheduleData?.teacher) {
        const teacherCode = scheduleData.teacher.teacherCode || 'GV';
        const fullName = scheduleData.teacher.fullName || 'Giảng viên';
        setCurrentAccountLabel(`${teacherCode} - ${fullName}`);
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Không thể tải lịch giảng dạy. Vui lòng thử lại sau.';
      setData(null);

      if (!teacherId && message.includes('Please select a lecturer')) {
        setHint('Tài khoản hiện tại không gắn với hồ sơ giảng viên. Hay chọn một giảng viên để xem lịch.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        // Xac dinh role hien tai
        const meResponse = await authService.me();
        const currentRole = meResponse?.data?.user?.role;
        const currentUser = meResponse?.data?.user;
        const currentIsLecturer = currentRole === 'lecturer' || currentRole === 'teacher';
        setIsLecturerRole(currentIsLecturer);
        setCanEnterGrades(currentIsLecturer);
        setGradeEntryBasePath('/lecturer');

        if (currentIsLecturer) {
          const displayName = currentUser?.fullName || currentUser?.email || 'Tài khoản hiện tại';
          setCurrentAccountLabel(displayName);
        } else {
          setCurrentAccountLabel('Tìm giảng viên để xem lịch');
        }

        // Chi admin/staff moi can danh sach tat ca giang vien
        if (!currentIsLecturer) {
          setLoadingLecturers(true);
          const allLecturers = await fetchAllLecturerOptions();
          setLecturers(allLecturers);
        } else {
          setLecturers([]);
          setSelectedTeacherId('');
        }
      } catch (err) {
        console.error('Failed to initialize teaching schedule page', err);
      } finally {
        setLoadingLecturers(false);
      }

      // Load du lieu lich ngay sau khi init
      fetchSchedule('');
    };

    initPage();
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) return;
    fetchSchedule(selectedTeacherId);
  }, [selectedTeacherId]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch giảng dạy</h1>
          <p className="mt-1 text-sm text-slate-600">
            Xem các lớp học phần được phân công cho giảng viên trong học kỳ hiện tại.
          </p>
        </div>

        {!isLecturerRole && (
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
                <option value="">{currentAccountLabel}</option>
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
          </div>
        )}
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
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div>
                <span className="font-medium text-slate-700">Bộ môn:</span> {data.teacher?.department || '-'}
              </div>
              <div>
                <span className="font-medium text-slate-700">Học kỳ:</span> {data.semester?.semesterNum || '-'}
              </div>
              <div>
                <span className="font-medium text-slate-700">Năm học:</span> {data.semester?.academicYear || '-'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Danh sách lớp phụ trách</div>
              <div className="text-sm text-slate-500">{(data.classes || []).length} lớp</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2">Mã lớp</th>
                    <th className="px-3 py-2">Môn học</th>
                    <th className="px-3 py-2">Học kỳ</th>
                    <th className="px-3 py-2">Sĩ số</th>
                    <th className="px-3 py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.classes || []).map((item) => (
                    <tr key={item._id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-medium text-slate-900">{item.classCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{item.subject?.subjectCode || '-'}</div>
                        <div className="text-slate-500">{item.subject?.subjectName || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        {item.semester} / {item.academicYear}
                      </td>
                      <td className="px-3 py-2">
                        {item.currentEnrollment}/{item.maxCapacity}
                      </td>
                      <td className="px-3 py-2">
                        {canEnterGrades ? (
                          <button
                            onClick={() => navigate(`${gradeEntryBasePath}/grades/${item._id}`)}
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition"
                          >
                            Nhập Điểm
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(data.classes || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                        Không có lớp nào phù hợp với bộ lọc hiện tại.
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
