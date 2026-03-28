import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../../services/scheduleService';

const ALL_SEMESTERS_VALUE = 'all';

function formatCapacityPercent(currentEnrollment, maxCapacity) {
  if (!maxCapacity) return 0;
  return Math.min(100, Math.round((Number(currentEnrollment || 0) / Number(maxCapacity || 1)) * 100));
}

function formatSemesterLabel(semester) {
  if (!semester) return 'Học kỳ hiện tại';
  if (semester.label) return semester.label;

  const baseLabel =
    semester.name ||
    (semester.semesterNum && semester.academicYear
      ? `Học kỳ ${semester.semesterNum} / ${semester.academicYear}`
      : semester.code || 'Học kỳ');

  return semester.isCurrent ? `${baseLabel} (hiện tại)` : baseLabel;
}

function buildClassSemesterOptions(classes = []) {
  const options = new Map();

  classes.forEach((item) => {
    const semesterNum = Number(item?.semester);
    const academicYear = String(item?.academicYear || '').trim();

    if (!Number.isFinite(semesterNum) || !academicYear) return;

    const key = `${semesterNum}::${academicYear}`;
    if (!options.has(key)) {
      options.set(key, {
        id: key,
        semesterNum,
        academicYear,
        label: `Học kỳ ${semesterNum} / ${academicYear}`,
      });
    }
  });

  return Array.from(options.values()).sort((a, b) => {
    const yearCompare = String(b.academicYear || '').localeCompare(String(a.academicYear || ''));
    if (yearCompare !== 0) return yearCompare;
    return Number(b.semesterNum || 0) - Number(a.semesterNum || 0);
  });
}

export default function LecturerHomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');

  const selectedSemester = useMemo(
    () => semesterOptions.find((item) => String(item.id) === String(selectedSemesterId)) || null,
    [semesterOptions, selectedSemesterId],
  );
  const isViewingAllSemesters = selectedSemesterId === ALL_SEMESTERS_VALUE;

  const semesterSummary = useMemo(() => {
    if (isViewingAllSemesters) return 'tất cả học kỳ';
    if (selectedSemester) return formatSemesterLabel(selectedSemester);
    if (scheduleData?.semester?.semesterNum && scheduleData?.semester?.academicYear) {
      return `Học kỳ ${scheduleData.semester.semesterNum} / ${scheduleData.semester.academicYear}`;
    }
    return 'học kỳ hiện tại';
  }, [isViewingAllSemesters, scheduleData, selectedSemester]);

  const loadAvailableSemesters = async () => {
    try {
      setInitializing(true);
      const response = await scheduleService.getTeachingSchedule({ includeAllClasses: true });
      const allData = response?.data?.data || null;
      const options = buildClassSemesterOptions(allData?.classes || []);
      setSemesterOptions(options);

      setSelectedSemesterId((prev) => {
        if (prev === ALL_SEMESTERS_VALUE) return prev;
        if (prev && options.some((item) => String(item.id) === String(prev))) return prev;
        return options[0]?.id || ALL_SEMESTERS_VALUE;
      });
    } catch (err) {
      setSemesterOptions([]);
      setSelectedSemesterId((prev) => prev || ALL_SEMESTERS_VALUE);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu học kỳ của giảng viên.');
    } finally {
      setInitializing(false);
    }
  };

  const loadAssignedClasses = async () => {
    if (!selectedSemesterId) return;

    try {
      setLoading(true);
      setError('');
      setHint('');

      const params = {};
      if (selectedSemesterId === ALL_SEMESTERS_VALUE) {
        params.includeAllClasses = true;
      } else if (selectedSemester) {
        params.semester = selectedSemester.semesterNum;
        params.academicYear = selectedSemester.academicYear;
      }

      const response = await scheduleService.getTeachingSchedule(params);
      const nextData = response?.data?.data || null;
      setScheduleData(nextData);

      if (!nextData?.classes?.length && selectedSemesterId !== ALL_SEMESTERS_VALUE) {
        setHint('Không có lớp được phân công trong học kỳ đã chọn. Bạn có thể chuyển sang "Tất cả học kỳ" để xem toàn bộ.');
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Không thể tải danh sách lớp được phân công. Vui lòng thử lại.',
      );
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableSemesters();
  }, []);

  useEffect(() => {
    if (!initializing && selectedSemesterId) {
      loadAssignedClasses();
    }
  }, [initializing, selectedSemesterId]);

  const assignedClasses = scheduleData?.classes || [];

  const stats = useMemo(() => {
    const totalClasses = assignedClasses.length;
    const totalStudents = assignedClasses.reduce(
      (sum, item) => sum + Number(item.currentEnrollment || 0),
      0,
    );

    const avgFillRate =
      totalClasses === 0
        ? 0
        : Math.round(
            assignedClasses.reduce(
              (sum, item) => sum + formatCapacityPercent(item.currentEnrollment, item.maxCapacity),
              0,
            ) / totalClasses,
          );

    return {
      totalClasses,
      totalStudents,
      avgFillRate,
    };
  }, [assignedClasses]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trang chủ giảng viên</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi các lớp học phần được phân công theo đúng học kỳ có trong dữ liệu lớp và truy cập nhanh danh sách sinh viên của từng lớp.
          </p>
        </div>

        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">Phạm vi học kỳ</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedSemesterId}
              onChange={(event) => setSelectedSemesterId(event.target.value)}
              disabled={initializing}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            >
              <option value={ALL_SEMESTERS_VALUE}>Tất cả học kỳ</option>
              {semesterOptions.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {formatSemesterLabel(semester)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadAssignedClasses}
              disabled={loading || initializing || !selectedSemesterId}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {loading ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Đang xem dữ liệu của {semesterSummary}.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Tổng số lớp phụ trách</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.totalClasses}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Tổng số sinh viên</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.totalStudents}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Tỷ lệ đầy lớp trung bình</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.avgFillRate}%</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Danh sách lớp được phân công</h2>
            <p className="text-sm text-slate-500">
              Bấm vào từng lớp để xem danh sách sinh viên. Dữ liệu đang hiển thị theo {semesterSummary}.
            </p>
          </div>
        </div>

        {loading || initializing ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Đang tải dữ liệu lớp học...
          </div>
        ) : null}

        {!loading && !initializing && hint ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {hint}
          </div>
        ) : null}

        {!loading && !initializing && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !initializing && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
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
                {assignedClasses.map((item) => {
                  const fillPercent = formatCapacityPercent(item.currentEnrollment, item.maxCapacity);
                  return (
                    <tr key={item._id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3 font-medium text-slate-900">{item.classCode || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{item.subject?.subjectCode || '-'}</div>
                        <div className="text-slate-500">{item.subject?.subjectName || '-'}</div>
                      </td>
                      <td className="px-3 py-3">
                        {item.semester || '-'} / {item.academicYear || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">
                          {Number(item.currentEnrollment || 0)}/{Number(item.maxCapacity || 0)}
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/lecturer/classes/${item._id}`)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Xem sinh viên
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/lecturer/grades/${item._id}`)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Nhập điểm
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {assignedClasses.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                      Không có lớp nào được phân công trong phạm vi đang chọn.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
