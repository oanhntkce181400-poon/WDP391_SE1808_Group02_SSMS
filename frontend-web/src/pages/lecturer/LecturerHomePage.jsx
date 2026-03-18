import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../../services/scheduleService';

function formatCapacityPercent(currentEnrollment, maxCapacity) {
  if (!maxCapacity) return 0;
  return Math.min(100, Math.round((Number(currentEnrollment || 0) / Number(maxCapacity || 1)) * 100));
}

export default function LecturerHomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState(null);

  const loadAssignedClasses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await scheduleService.getTeachingSchedule({ includeAllClasses: true });
      setScheduleData(response?.data?.data || null);
    } catch (err) {
      setError('Không thể tải danh sách lớp phụ trách. Vui lòng thử lại.');
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedClasses();
  }, []);

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
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trang chủ giảng viên</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi các lớp đang được phân công và truy cập nhanh danh sách sinh viên theo từng lớp.
          </p>
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
          <div className="text-sm text-slate-500">Tỉ lệ lớp đầy trung bình</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.avgFillRate}%</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Danh sách lớp được phân công</h2>
            <p className="text-sm text-slate-500">Bấm vào từng lớp để xem chi tiết danh sách sinh viên.</p>
          </div>
          <button
            type="button"
            onClick={loadAssignedClasses}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Đang tải dữ liệu lớp học...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
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
                      Chưa có lớp nào được phân công.
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
