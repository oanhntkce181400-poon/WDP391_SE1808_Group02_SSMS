import { useEffect, useMemo, useState } from 'react';
import examService from '../../services/examService';

function formatDate(value) {
  if (!value) return 'Chưa cập nhật ngày thi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật ngày thi';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getSubjectDisplay(exam) {
  const code = exam.subject?.subjectCode;
  const name = exam.subject?.subjectName;

  if (!code && !name) return 'Chưa cập nhật môn';
  if (code && name) return `${code} - ${name}`;
  return code || name;
}

function getClassDisplay(exam) {
  return exam.classSection?.classCode || 'Chưa cập nhật lớp';
}

function getTimeDisplay(exam) {
  const start = exam.startTime || exam.slot?.startTime;
  const end = exam.endTime || exam.slot?.endTime;

  if (!start && !end) return 'Chưa cập nhật giờ thi';
  if (!start || !end) return `${start || 'Chưa rõ'} - ${end || 'Chưa rõ'}`;
  return `${start} - ${end}`;
}

function getRoomDisplay(exam) {
  const code = exam.room?.roomCode;
  const name = exam.room?.roomName;

  if (!code && !name) return 'Chưa phân phòng';
  if (code && name) return `${code} (${name})`;
  return code || name;
}

function getRoleLabel(roleInExam) {
  if (roleInExam === 'teaching') return 'Giảng viên bộ môn';
  if (roleInExam === 'invigilator') return 'Cán bộ coi thi';
  if (roleInExam === 'teaching-and-invigilator') return 'Vừa dạy vừa coi thi';
  return 'Liên quan';
}

function getStatusLabel(status) {
  const map = {
    scheduled: 'Đã xếp lịch',
    'in-progress': 'Đang diễn ra',
    completed: 'Đã hoàn thành',
    cancelled: 'Đã hủy',
  };
  return map[status] || 'Không xác định';
}

function getStatusBadgeClass(status) {
  const map = {
    scheduled: 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export default function LecturerExamSchedulePage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'scheduled', label: 'Đã xếp lịch' },
    { value: 'in-progress', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  const fetchLecturerExams = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await examService.getMyLecturerExams();
      setExams(response?.data?.data || []);
    } catch (err) {
      setError('Không thể tải lịch gác thi của giảng viên. Vui lòng thử lại.');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLecturerExams();
  }, []);

  const filteredExams = useMemo(() => {
    if (statusFilter === 'all') return exams;
    return exams.filter((item) => item.status === statusFilter);
  }, [exams, statusFilter]);

  const stats = useMemo(() => {
    const upcoming = exams.filter((item) => new Date(item.examDate) >= new Date()).length;
    const completed = exams.filter((item) => item.status === 'completed').length;
    const inProgress = exams.filter((item) => item.status === 'in-progress').length;

    return {
      total: exams.length,
      upcoming,
      completed,
      inProgress,
    };
  }, [exams]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch gác thi của giảng viên</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi các ca thi được phân công để chủ động chuẩn bị và thực hiện coi thi.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLecturerExams}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Tải lại
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Tổng ca gác thi</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Ca sắp tới</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.upcoming}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Đã coi thi</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.completed}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Đang coi thi</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.inProgress}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">Danh sách lịch gác thi</div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  statusFilter === option.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Đang tải lịch gác thi...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Môn học / Lớp</th>
                  <th className="px-3 py-2">Ngày thi</th>
                  <th className="px-3 py-2">Giờ thi</th>
                  <th className="px-3 py-2">Phòng</th>
                  <th className="px-3 py-2">Vai trò</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam._id} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">
                        {getSubjectDisplay(exam)}
                      </div>
                      <div className="text-slate-500">
                        Lớp: {getClassDisplay(exam)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatDate(exam.examDate)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {getTimeDisplay(exam)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {getRoomDisplay(exam)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{getRoleLabel(exam.roleInExam)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(exam.status)}`}>
                        {getStatusLabel(exam.status)}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredExams.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                      Không có lịch gác thi phù hợp.
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
