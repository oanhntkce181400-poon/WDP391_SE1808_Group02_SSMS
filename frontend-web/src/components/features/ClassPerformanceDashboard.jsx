import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import classPerformanceService from '../../services/classPerformanceService';

const DISTRIBUTION_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
const GRADE_DISTRIBUTION_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#2563eb'];

function formatDateLabel(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatLongDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN');
}

function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(2);
}

function formatScheduleDays(days = []) {
  const labels = {
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
    7: 'Chủ nhật',
  };

  return days.length
    ? days.map((day) => labels[day] || `Thứ ${day}`).join(', ')
    : 'Chưa có lịch';
}

function formatTimeslot(timeslot) {
  if (!timeslot) return 'Chưa có ca học';
  const group = timeslot.groupName ? `${timeslot.groupName}` : '';
  const range =
    timeslot.startTime && timeslot.endTime
      ? `${timeslot.startTime} - ${timeslot.endTime}`
      : '';
  return [group, range].filter(Boolean).join(' • ') || 'Chưa có ca học';
}

function EmptyChartState({ title, description }) {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="text-base font-semibold text-slate-700">{title}</div>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint, tone = 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-2xl font-bold ring-1 ${tones[tone] || tones.slate}`}
      >
        {value}
      </div>
      <div className="mt-3 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

export default function ClassPerformanceDashboard({ mode = 'admin' }) {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [performance, setPerformance] = useState(null);
  const [classSearch, setClassSearch] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [performanceError, setPerformanceError] = useState('');

  const deferredSearch = useDeferredValue(classSearch);
  const isLecturerMode = mode === 'lecturer';

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      setClassesError('');
      const response = await classPerformanceService.getAccessibleClasses();
      const nextClasses = response?.data?.data || [];
      setClasses(nextClasses);
      setSelectedClassId((current) => {
        if (current && nextClasses.some((item) => item._id === current)) {
          return current;
        }
        const preferredClass = [...nextClasses].sort(
          (a, b) => Number(b.taughtSlots || 0) - Number(a.taughtSlots || 0),
        )[0];
        return preferredClass?._id || nextClasses[0]?._id || '';
      });
    } catch (error) {
      setClasses([]);
      setSelectedClassId('');
      setClassesError('Không thể tải danh sách lớp để thống kê. Vui lòng thử lại.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadPerformance = async (classId) => {
    if (!classId) {
      setPerformance(null);
      return;
    }

    try {
      setLoadingPerformance(true);
      setPerformanceError('');
      const response = await classPerformanceService.getClassPerformance(classId);
      setPerformance(response?.data?.data || null);
    } catch (error) {
      setPerformance(null);
      setPerformanceError('Không thể tải thống kê điểm danh của lớp này. Vui lòng thử lại.');
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadPerformance(selectedClassId);
  }, [selectedClassId]);

  const filteredClasses = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) return classes;

    return classes.filter((item) => {
      const haystack = [
        item.classCode,
        item.className,
        item.subject?.subjectCode,
        item.subject?.subjectName,
        item.teacher?.fullName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [classes, deferredSearch]);

  const selectedClass = useMemo(
    () => classes.find((item) => item._id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const sessionTimelineData = useMemo(
    () =>
      (performance?.charts?.sessionTimeline || []).map((item) => ({
        ...item,
        label: formatDateLabel(item.slotDate || item.slotKey),
      })),
    [performance],
  );

  const distributionData = useMemo(
    () =>
      (performance?.charts?.attendanceDistribution || []).filter(
        (item) => Number(item.value || 0) > 0,
      ),
    [performance],
  );

  const riskStudents = useMemo(() => {
    const data = performance?.studentBreakdown || [];
    return data
      .filter((item) => Number(item.absentCount || 0) > 0 || Number(item.lateCount || 0) > 0)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        shortCode: item.studentCode || item.fullName,
      }));
  }, [performance]);

  const summary = performance?.summary;
  const classInfo = performance?.classSection;
  const meta = performance?.meta;
  const gradeSummary = performance?.gradeSummary;

  const gradeDistributionData = useMemo(
    () =>
      (gradeSummary?.scoreDistribution || []).filter(
        (item) => Number(item.value || 0) > 0,
      ),
    [gradeSummary],
  );

  const componentAverageData = useMemo(
    () => gradeSummary?.componentAverages || [],
    [gradeSummary],
  );

  const topScoreStudents = useMemo(
    () => gradeSummary?.topStudents || [],
    [gradeSummary],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isLecturerMode ? 'Theo dõi điểm danh lớp phụ trách' : 'Thống kê điểm danh lớp học'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {isLecturerMode
              ? 'Giảng viên chỉ xem được các lớp mình đang giảng dạy. Số liệu lấy trực tiếp từ bảng điểm danh đã lưu trong hệ thống.'
              : 'Admin có thể xem toàn bộ lớp có dữ liệu điểm danh thực tế. Phần điểm trung bình sẽ được nối vào dashboard này sau.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadClasses();
            if (selectedClassId) loadPerformance(selectedClassId);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Tải lại dữ liệu
        </button>
      </div>

      {classesError ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {classesError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Danh sách lớp</h2>
              <p className="text-sm text-slate-500">
                {isLecturerMode ? 'Các lớp giảng viên đang dạy' : 'Toàn bộ lớp có thể theo dõi'}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {classes.length} lớp
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={classSearch}
              onChange={(event) => setClassSearch(event.target.value)}
              placeholder="Tìm theo mã lớp, môn học, giảng viên..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none ring-0 transition focus:border-blue-300"
            />
          </div>

          <div className="mt-4 space-y-3">
            {loadingClasses ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Đang tải danh sách lớp...
              </div>
            ) : null}

            {!loadingClasses && filteredClasses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chưa tìm thấy lớp phù hợp.
              </div>
            ) : null}

            {!loadingClasses
              ? filteredClasses.map((item) => {
                  const isActive = item._id === selectedClassId;
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => setSelectedClassId(item._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {item.classCode || 'Chưa có mã lớp'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.subject?.subjectCode || '--'} • {item.subject?.subjectName || item.className || '--'}
                          </div>
                        </div>
                        <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {Number(item.avgAttendanceRate || 0)}%
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>Sĩ số: {Number(item.enrollmentCount || 0)}</div>
                        <div>Buổi đã chấm: {Number(item.taughtSlots || 0)}</div>
                        <div className="col-span-2">
                          {item.teacher?.fullName || 'Chưa có giảng viên'}
                        </div>
                      </div>
                    </button>
                  );
                })
              : null}
          </div>
        </aside>

        <section className="space-y-6">
          {!selectedClass && !loadingClasses ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <h3 className="text-xl font-semibold text-slate-900">Chưa có lớp để thống kê</h3>
              <p className="mt-2 text-sm text-slate-500">
                Khi lớp có dữ liệu điểm danh thực tế, dashboard sẽ hiển thị tại đây.
              </p>
            </div>
          ) : null}

          {selectedClass ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {classInfo?.subject?.subjectCode || selectedClass.subject?.subjectCode || 'CLASS'}
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-slate-900">
                      {classInfo?.classCode || selectedClass.classCode || '--'} •{' '}
                      {classInfo?.className || selectedClass.className || classInfo?.subject?.subjectName || '--'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {classInfo?.subject?.subjectName || selectedClass.subject?.subjectName || 'Chưa có tên môn học'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Giảng viên
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        {classInfo?.teacher?.fullName || selectedClass.teacher?.fullName || 'Chưa phân công'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Phòng / ca
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        {(classInfo?.room?.roomCode || selectedClass.room?.roomCode || 'Chưa có phòng')}{' '}
                        • {formatTimeslot(classInfo?.timeslot || selectedClass.timeslot)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Học kỳ
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        HK {classInfo?.semester || selectedClass.semester || '--'} •{' '}
                        {classInfo?.academicYear || selectedClass.academicYear || '--'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Lịch học
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        {formatScheduleDays(meta?.scheduleDays || selectedClass.scheduleDays || [])}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Thời gian lớp
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {formatLongDate(classInfo?.startDate || selectedClass.startDate)} -{' '}
                      {formatLongDate(classInfo?.endDate || selectedClass.endDate)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Sinh dữ liệu lúc
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {formatLongDate(meta?.generatedAt)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Đã mở đến ngày
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {summary?.sessionsToDate || 0} buổi theo lịch
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Cong thuc diem
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {gradeSummary?.gradingFormulaText || 'GK 30% • CK 50% • BT 20%'}
                    </div>
                  </div>
                </div>
              </div>

              {performanceError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {performanceError}
                </div>
              ) : null}

              {loadingPerformance ? (
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
                  Đang tải thống kê lớp học...
                </div>
              ) : null}

              {!loadingPerformance && performance ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <SummaryCard
                      label="Tỷ lệ tham gia"
                      value={`${Number(summary?.attendanceRate || 0)}%`}
                      hint="Tính trên toàn bộ bản ghi điểm danh đã chấm"
                      tone="emerald"
                    />
                    <SummaryCard
                      label="Buổi đã điểm danh"
                      value={`${summary?.sessionsMarked || 0}/${summary?.sessionsToDate || 0}`}
                      hint={`Còn ${summary?.sessionsPendingMarking || 0} buổi theo lịch chưa chấm`}
                      tone="blue"
                    />
                    <SummaryCard
                      label="Sĩ số hiện tại"
                      value={`${summary?.totalStudents || 0}`}
                      hint={`${summary?.markedRecords || 0} bản ghi điểm danh thực tế`}
                      tone="violet"
                    />
                    <SummaryCard
                      label="Lượt vắng"
                      value={`${summary?.absentCount || 0}`}
                      hint={`${summary?.lateCount || 0} lượt muộn • ${summary?.presentCount || 0} lượt có mặt`}
                      tone="rose"
                    />
                    <SummaryCard
                      label="Điểm trung bình"
                      value={formatScore(gradeSummary?.averageScore)}
                      hint={`${gradeSummary?.gradedStudentCount || 0}/${summary?.totalStudents || 0} SV có điểm tổng hợp`}
                      tone="amber"
                    />
                    <SummaryCard
                      label="Tỷ lệ đạt"
                      value={
                        gradeSummary?.passRate === null || gradeSummary?.passRate === undefined
                          ? '--'
                          : `${Number(gradeSummary.passRate)}%`
                      }
                      hint={`${gradeSummary?.passCount || 0} đạt • ${gradeSummary?.failCount || 0} chưa đạt`}
                      tone="slate"
                    />
                  </div>

                  {summary?.noAttendanceData ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                      <h3 className="text-xl font-semibold text-slate-900">
                        Lớp này chưa có dữ liệu điểm danh thực tế
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Hệ thống đã nối đúng lớp học và lịch học, nhưng hiện chưa có buổi nào được chấm điểm danh.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                              Xu hướng tỷ lệ tham gia theo buổi
                            </h3>
                            <p className="text-sm text-slate-500">
                              Mỗi điểm là một buổi học đã được điểm danh, lấy từ dữ liệu thực trong bảng Attendance.
                            </p>
                          </div>

                          {sessionTimelineData.length === 0 ? (
                            <EmptyChartState
                              title="Chưa có buổi điểm danh"
                              description="Khi giảng viên chấm điểm danh, biểu đồ theo buổi sẽ hiển thị tại đây."
                            />
                          ) : (
                            <div className="h-[320px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sessionTimelineData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="label" />
                                  <YAxis domain={[0, 100]} />
                                  <Tooltip
                                    formatter={(value, name) => [
                                      `${value}${name === 'attendanceRate' ? '%' : ''}`,
                                      name === 'attendanceRate' ? 'Tỷ lệ tham gia' : name,
                                    ]}
                                  />
                                  <Legend />
                                  <Line
                                    type="monotone"
                                    dataKey="attendanceRate"
                                    name="Tỷ lệ tham gia"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                              Phân bố trạng thái điểm danh
                            </h3>
                            <p className="text-sm text-slate-500">
                              Tổng hợp lượt có mặt, muộn và vắng của lớp đang chọn.
                            </p>
                          </div>

                          {distributionData.length === 0 ? (
                            <EmptyChartState
                              title="Chưa có phân bố trạng thái"
                              description="Sau khi có dữ liệu chấm công, biểu đồ tròn sẽ tự cập nhật."
                            />
                          ) : (
                            <div className="h-[320px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={distributionData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={72}
                                    outerRadius={108}
                                    paddingAngle={4}
                                  >
                                    {distributionData.map((entry, index) => (
                                      <Cell
                                        key={`${entry.name}-${index}`}
                                        fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => [`${value}`, 'Số lượt']} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </div>

                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                              Sinh viên vắng nhiều nhất
                            </h3>
                            <p className="text-sm text-slate-500">
                              Ưu tiên hiển thị các sinh viên có số buổi vắng và đi muộn cao.
                            </p>
                          </div>

                          {riskStudents.length === 0 ? (
                            <EmptyChartState
                              title="Chưa có sinh viên cần chú ý"
                              description="Khi có lượt vắng hoặc muộn, bảng và biểu đồ cảnh báo sẽ hiển thị ở đây."
                            />
                          ) : (
                            <>
                              <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={riskStudents}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="shortCode" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="absentCount" name="Vắng" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="lateCount" name="Muộn" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="mt-4 overflow-x-auto">
                                <table className="w-full min-w-[540px] text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-left text-slate-500">
                                      <th className="px-3 py-2">Mã SV</th>
                                      <th className="px-3 py-2">Họ tên</th>
                                      <th className="px-3 py-2">Vắng</th>
                                      <th className="px-3 py-2">Muộn</th>
                                      <th className="px-3 py-2">Tỷ lệ tham gia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {riskStudents.map((item) => (
                                      <tr key={item.studentId} className="border-b border-slate-100 text-slate-700">
                                        <td className="px-3 py-2 font-medium">{item.studentCode || '--'}</td>
                                        <td className="px-3 py-2">{item.fullName || '--'}</td>
                                        <td className="px-3 py-2">{item.absentCount || 0}</td>
                                        <td className="px-3 py-2">{item.lateCount || 0}</td>
                                        <td className="px-3 py-2">{Number(item.attendanceRate || 0)}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">
                              Tinh trang theo doi lop
                            </h3>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Do phu buoi da cham
                                </div>
                                <div className="mt-1 text-xl font-bold text-slate-900">
                                  {Number(summary?.sessionCoverageRate || 0)}%
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Tong buoi theo ke hoach
                                </div>
                                <div className="mt-1 text-xl font-bold text-slate-900">
                                  {summary?.totalSessionsPlanned || 0} buoi
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Du lieu ban ghi
                                </div>
                                <div className="mt-1 text-xl font-bold text-slate-900">
                                  {summary?.markedRecords || 0} dong diem danh
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Tien do diem
                                </div>
                                <div className="mt-1 text-sm font-medium text-slate-800">
                                  {gradeSummary?.message || 'Chua co du lieu diem'}
                                </div>
                              </div>
                            </div>
                          </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Phan bo diem tong ket
                        </h3>
                        <p className="text-sm text-slate-500">
                          Lay tu diem tong hop da luu, hoac tinh tu dong tu cac thanh phan diem neu da du du lieu.
                        </p>
                      </div>

                      {gradeDistributionData.length === 0 ? (
                        <EmptyChartState
                          title="Chua co diem tong ket"
                          description={gradeSummary?.message || 'Khi co du lieu diem, bieu do phan bo se hien thi tai day.'}
                        />
                      ) : (
                        <div className="h-[320px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeDistributionData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} />
                              <Tooltip formatter={(value) => [`${value}`, 'So sinh vien']} />
                              <Bar dataKey="value" name="So sinh vien" radius={[10, 10, 0, 0]}>
                                {gradeDistributionData.map((entry, index) => (
                                  <Cell
                                    key={`${entry.name}-${index}`}
                                    fill={GRADE_DISTRIBUTION_COLORS[index % GRADE_DISTRIBUTION_COLORS.length]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Thanh phan diem trung binh
                        </h3>

                        {componentAverageData.length === 0 ? (
                          <div className="mt-4">
                            <EmptyChartState
                              title="Chua co diem thanh phan"
                              description="Dashboard se tu hien trung binh GK, CK, BT, QT, PT khi lop co du lieu diem."
                            />
                          </div>
                        ) : (
                          <div className="mt-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={componentAverageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="code" />
                                <YAxis domain={[0, 10]} />
                                <Tooltip formatter={(value) => [formatScore(value), 'Diem TB']} />
                                <Bar dataKey="value" name="Diem TB" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Sinh vien diem cao
                        </h3>

                        {topScoreStudents.length === 0 ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            Chua co du lieu diem tong ket de xep hang.
                          </div>
                        ) : (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[420px] text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-500">
                                  <th className="px-3 py-2">Ma SV</th>
                                  <th className="px-3 py-2">Ho ten</th>
                                  <th className="px-3 py-2">Diem</th>
                                  <th className="px-3 py-2">Trang thai</th>
                                </tr>
                              </thead>
                              <tbody>
                                {topScoreStudents.map((item) => (
                                  <tr key={item.studentId} className="border-b border-slate-100 text-slate-700">
                                    <td className="px-3 py-2 font-medium">{item.studentCode || '--'}</td>
                                    <td className="px-3 py-2">{item.fullName || '--'}</td>
                                    <td className="px-3 py-2">{formatScore(item.finalScore)}</td>
                                    <td className="px-3 py-2">
                                      {item.isFinalized ? 'Finalized' : item.source === 'derived' ? 'Tam tinh' : 'Da luu'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
