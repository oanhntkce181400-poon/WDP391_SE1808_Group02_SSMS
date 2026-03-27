import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Layers,
  GraduationCap,
  BookMarked,
} from "lucide-react";
import classService from "../../services/classService";
import semesterService from "../../services/semesterService";

const STATUS_CONFIG = {
  draft: { label: "Nháp", bg: "bg-gray-100", text: "text-gray-700" },
  scheduled: { label: "Đã xếp lịch", bg: "bg-blue-100", text: "text-blue-700" },
  published: { label: "Đã công bố", bg: "bg-green-100", text: "text-green-700" },
  locked: { label: "Đã khóa", bg: "bg-red-100", text: "text-red-700" },
  active: { label: "Đang mở", bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelled: { label: "Đã hủy", bg: "bg-red-100", text: "text-red-700" },
  completed: { label: "Đã kết thúc", bg: "bg-slate-100", text: "text-slate-600" },
};

const TIME_RANGES = [
  { label: "Không lọc theo ngày", value: 0 },
  { label: "7 ngày gần đây", value: 7 },
  { label: "14 ngày", value: 14 },
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

function formatCreatedAt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function RecentClassesPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 8,
  });
  const [timeRange, setTimeRange] = useState(7);
  const [institutionalSemesters, setInstitutionalSemesters] = useState([]);
  const [filterSemester, setFilterSemester] = useState("");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");

  useEffect(() => {
    semesterService
      .getAll({ limit: 100 })
      .then((r) => setInstitutionalSemesters(r.data.data || []))
      .catch(() => setInstitutionalSemesters([]));
  }, []);

  const fetchOverview = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page,
          limit: 8,
        };
        if (filterSemester !== "") {
          params.semester = Number(filterSemester);
        }
        if (filterAcademicYear.trim()) {
          params.academicYear = filterAcademicYear.trim();
        }
        if (timeRange > 0) {
          const afterDate = new Date();
          afterDate.setDate(afterDate.getDate() - timeRange);
          afterDate.setHours(0, 0, 0, 0);
          params.createdAfter = afterDate.toISOString();
        }

        const res = await classService.getClassGroupsOverview(params);
        const body = res.data;
        setGroups(body.data || []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            total: body.pagination.total,
            totalPages: body.pagination.totalPages,
            limit: body.pagination.limit,
          });
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Không tải được danh sách nhóm lớp học phần.",
        );
        setGroups([]);
      } finally {
        setLoading(false);
      }
    },
    [timeRange, filterSemester, filterAcademicYear],
  );

  useEffect(() => {
    fetchOverview(1);
  }, [timeRange, filterSemester, filterAcademicYear, fetchOverview]);

  const onInstitutionalSemChange = (semesterNum) => {
    setFilterSemester(semesterNum);
    const s = institutionalSemesters.find(
      (x) => String(x.semesterNum) === String(semesterNum),
    );
    if (s?.academicYear) {
      setFilterAcademicYear(s.academicYear);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="text-indigo-600" size={26} />
          Nhóm lớp học phần mới
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Mỗi dòng là một <span className="font-medium text-slate-700">nhóm</span>{" "}
          (giá trị <span className="font-mono">classGroup</span>, ví dụ SEKhuong,
          SE1821-01): trong nhóm có nhiều lớp học phần — mỗi học phần một môn và
          giảng viên đã gán. Phù hợp lớp vừa tạo / gán nhóm để enroll thủ công
          hoặc chạy Auto Enrollment.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Học kỳ hệ thống (tùy chọn)
            </label>
            <select
              value={filterSemester}
              onChange={(e) => onInstitutionalSemChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="">— Tất cả —</option>
              {institutionalSemesters.map((s) => (
                <option key={s._id} value={s.semesterNum}>
                  {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Niên khóa trên lớp (tùy chọn)
            </label>
            <input
              type="text"
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              placeholder="VD: 2025/2026 hoặc 2026-2030"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">
            Nhóm có học phần tạo trong khoảng:
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-1.5 text-sm rounded-xl transition-colors ${
                  timeRange === range.value
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            “Mới” theo thời điểm học phần <strong>đầu tiên</strong> trong nhóm được
            tạo (min createdAt). Chọn “Không lọc” để xem mọi nhóm khớp bộ lọc kỳ.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-3" />
          Đang tải...
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <CheckCircle size={40} className="mb-3 opacity-40" />
          <p>Không có nhóm lớp học phần nào khớp bộ lọc.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <article
              key={g.classGroup}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between bg-slate-50/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-mono text-sm font-semibold">
                    {g.classGroup}
                  </span>
                  <span className="text-sm text-slate-600">
                    {g.academicYear || "—"}{" "}
                    <span className="text-slate-400">
                      · HK{g.semester ?? "—"}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <BookMarked size={14} />
                    {g.sectionCount} học phần
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={14} />
                  Nhóm bắt đầu: {formatCreatedAt(g.firstCreatedAt)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-slate-100">
                    <tr>
                      {[
                        "Mã lớp HP",
                        "Tên lớp",
                        "Môn học",
                        "Giảng viên",
                        "Sĩ số",
                        "Trạng thái",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(g.sections || []).map((cls) => (
                      <tr
                        key={cls._id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <Link
                            to={`/admin/classes/${cls._id}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {cls.classCode}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 max-w-[200px] truncate">
                          {cls.className}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-[220px]">
                          <div className="truncate">
                            {cls.subject?.subjectName || "—"}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {cls.subject?.subjectCode}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <div className="flex items-start gap-1.5">
                            <GraduationCap
                              size={16}
                              className="text-slate-400 shrink-0 mt-0.5"
                            />
                            <span>
                              {cls.teacher?.fullName || "—"}
                              {cls.teacher?.teacherCode ? (
                                <span className="block text-xs text-slate-400 font-mono">
                                  {cls.teacher.teacherCode}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} className="text-slate-400" />
                            {cls.currentEnrollment ?? 0}/{cls.maxCapacity ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={cls.status} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link
                            to={`/admin/classes/${cls._id}`}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-xs text-slate-500">
            Trang {pagination.page} / {pagination.totalPages} — {pagination.total}{" "}
            nhóm
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fetchOverview(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => fetchOverview(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
