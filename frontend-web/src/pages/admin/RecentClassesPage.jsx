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
  Calendar,
  MapPin,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import classService from "../../services/classService";
import semesterService from "../../services/semesterService";
import scheduleService from "../../services/scheduleService";
import timeslotService from "../../services/timeslotService";

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

const DAYS_OF_WEEK = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 7, label: "Chủ nhật" },
];

function formatScheduleDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

function schedulePeriodLabel(s) {
  if (!s) return "—";
  const a = Number(s.startPeriod);
  const b = Number(s.endPeriod ?? s.startPeriod);
  if (!Number.isFinite(a)) return "—";
  if (!Number.isFinite(b) || a === b) return `Tiết ${a}`;
  return `Tiết ${a}–${b}`;
}

const TIMETABLE_PALETTES = [
  "bg-indigo-50 border-indigo-200/80 text-indigo-950",
  "bg-emerald-50 border-emerald-200/80 text-emerald-950",
  "bg-amber-50 border-amber-200/80 text-amber-950",
  "bg-rose-50 border-rose-200/80 text-rose-950",
  "bg-violet-50 border-violet-200/80 text-violet-950",
  "bg-cyan-50 border-cyan-200/80 text-cyan-950",
  "bg-orange-50 border-orange-200/80 text-orange-950",
];

function paletteClassForCode(code) {
  const s = String(code ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return TIMETABLE_PALETTES[h % TIMETABLE_PALETTES.length];
}

/** Chuẩn bị ma trận TKB: tiết × thứ, có rowSpan */
function buildGroupTimetable(sections) {
  const entries = [];
  for (const sec of sections || []) {
    for (const sch of sec.schedules || []) {
      if (sch.status === "cancelled") continue;
      const sp = Number(sch.startPeriod);
      const ep = Number(sch.endPeriod ?? sch.startPeriod);
      const day = Number(sch.dayOfWeek);
      if (!Number.isFinite(sp) || !Number.isFinite(ep) || !Number.isFinite(day)) continue;
      const span = Math.max(1, ep - sp + 1);
      entries.push({ sec, sch, sp, ep, day, span });
    }
  }

  let minP = 1;
  let maxP = 10;
  for (const e of entries) {
    minP = Math.min(minP, e.sp);
    maxP = Math.max(maxP, e.ep);
  }
  const periods = [];
  for (let p = minP; p <= maxP; p += 1) periods.push(p);

  const covered = new Set();
  const starts = new Map();
  for (const e of entries) {
    for (let p = e.sp + 1; p <= e.ep; p += 1) {
      covered.add(`${p}-${e.day}`);
    }
    const key = `${e.sp}-${e.day}`;
    if (!starts.has(key)) starts.set(key, []);
    starts.get(key).push(e);
  }

  return { periods, days: DAYS_OF_WEEK, starts, covered, entries };
}

/** Ca học bao phủ một tiết (theo startPeriod/endPeriod của timeslot) */
function timeslotCoveringPeriod(timeslots, period) {
  const p = Number(period);
  if (!Number.isFinite(p)) return null;
  return (
    (timeslots || []).find((ts) => {
      const sp = Number(ts.startPeriod);
      const ep = Number(ts.endPeriod ?? ts.startPeriod);
      if (!Number.isFinite(sp) || !Number.isFinite(ep)) return false;
      return p >= sp && p <= ep;
    }) || null
  );
}

/** Khung giờ cho một tiết đơn (VD: 07:00–09:00) */
function formatSinglePeriodClock(timeslots, period) {
  const ts = timeslotCoveringPeriod(timeslots, period);
  if (!ts) return null;
  return `${ts.startTime}–${ts.endTime}`;
}

/** Khung giờ gộp từ tiết đầu đến tiết cuối (VD tiết 1–2 → bắt đầu ca 1 + kết thúc ca 2) */
function formatSpanClock(timeslots, startPeriod, endPeriod) {
  const sp = Number(startPeriod);
  const ep = Number(endPeriod ?? startPeriod);
  if (!Number.isFinite(sp) || !Number.isFinite(ep)) return null;
  const first = timeslotCoveringPeriod(timeslots, sp);
  const last = timeslotCoveringPeriod(timeslots, ep);
  if (first && last) return `${first.startTime} – ${last.endTime}`;
  if (first) return `${first.startTime}–${first.endTime}`;
  return null;
}

function GroupTimetableGrid({ sections, timeslots = [] }) {
  const { periods, days, starts, covered } = buildGroupTimetable(sections);
  const hasAny = (sections || []).some((s) => (s.schedules || []).length > 0);

  if (!hasAny) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
        Chưa có lịch học để hiển thị dạng thời khóa biểu.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-xs border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-200 px-2 py-2 text-left font-semibold text-slate-600 min-w-[5.25rem] sticky left-0 bg-slate-100 z-10">
              <div>Tiết</div>
              <div className="text-[10px] font-normal text-slate-400 font-sans mt-0.5">
                (giờ)
              </div>
            </th>
            {days.map((d) => (
              <th
                key={d.value}
                className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700 min-w-[120px]"
              >
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p} className="hover:bg-slate-50/50">
              <td className="border border-slate-200 px-2 py-2 text-center bg-slate-50/90 sticky left-0 z-10 align-middle">
                <div className="font-mono font-semibold text-slate-700">{p}</div>
                <div className="text-[10px] text-slate-500 tabular-nums leading-tight mt-1">
                  {formatSinglePeriodClock(timeslots, p) || (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              </td>
              {days.map((d) => {
                const startList = starts.get(`${p}-${d.value}`) || [];
                if (startList.length > 0) {
                  const rowSpan = Math.max(...startList.map((e) => e.span));
                  return (
                    <td
                      key={d.value}
                      rowSpan={rowSpan}
                      className="border border-slate-200 p-0 align-top"
                    >
                      <div className="flex flex-col gap-1.5 p-1.5 min-h-[3rem]">
                        {startList.map((e) => {
                          const pal = paletteClassForCode(
                            e.sec.classCode || e.sec.subjectCode,
                          );
                          const slotClock = formatSpanClock(
                            timeslots,
                            e.sp,
                            e.ep,
                          );
                          return (
                            <Link
                              key={e.sch._id}
                              to={`/admin/classes/${e.sec._id}`}
                              className={`block rounded-lg border px-2 py-1.5 ${pal} hover:brightness-[0.97] transition-all text-left no-underline`}
                            >
                              {slotClock ? (
                                <div className="text-[10px] font-semibold tabular-nums flex items-center gap-1 mb-1 opacity-95">
                                  <Clock size={10} className="shrink-0 opacity-80" />
                                  {slotClock}
                                </div>
                              ) : null}
                              <div className="font-semibold leading-tight line-clamp-2">
                                {e.sec.subjectName || e.sec.className || "—"}
                              </div>
                              <div className="font-mono text-[10px] opacity-80 mt-0.5">
                                {e.sec.classCode}
                                {e.sec.subjectCode ? ` · ${e.sec.subjectCode}` : ""}
                              </div>
                              <div className="text-[10px] mt-1 flex items-start gap-1 opacity-90">
                                <MapPin
                                  size={10}
                                  className="shrink-0 mt-0.5 opacity-70"
                                />
                                <span className="line-clamp-2">
                                  {e.sch.room?.roomCode}
                                  {e.sch.room?.roomName
                                    ? ` — ${e.sch.room.roomName}`
                                    : ""}
                                </span>
                              </div>
                              <div className="text-[10px] tabular-nums text-slate-600 mt-0.5">
                                {formatScheduleDate(e.sch.startDate)} →{" "}
                                {formatScheduleDate(e.sch.endDate)}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  );
                }
                if (covered.has(`${p}-${d.value}`)) {
                  return null;
                }
                return (
                  <td
                    key={d.value}
                    className="border border-slate-200 bg-white min-h-[2.5rem]"
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  /** null | { classGroup, academicYear, semester, loading, error, sections } */
  const [groupScheduleModal, setGroupScheduleModal] = useState(null);
  const [groupScheduleTab, setGroupScheduleTab] = useState("timetable");

  const openGroupScheduleModal = useCallback(async (g) => {
    const sections = g.sections || [];
    setGroupScheduleTab("timetable");
    setGroupScheduleModal({
      classGroup: g.classGroup,
      academicYear: g.academicYear,
      semester: g.semester,
      loading: true,
      error: "",
      sections: [],
      timeslots: [],
    });
    try {
      const [tsRes, pairs] = await Promise.all([
        timeslotService.getTimeslots({ limit: 200 }).catch(() => ({ data: {} })),
        Promise.all(
          sections.map(async (cls) => {
            const res = await scheduleService.getClassSchedules(cls._id);
            const list = res.data?.data || [];
            return {
              _id: cls._id,
              classCode: cls.classCode,
              className: cls.className,
              subjectName: cls.subject?.subjectName,
              subjectCode: cls.subject?.subjectCode,
              schedules: list,
            };
          }),
        ),
      ]);
      const timeslots =
        tsRes.data?.data || tsRes.data?.timeslots || [];
      setGroupScheduleModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              sections: pairs,
              timeslots,
              error: "",
            }
          : null,
      );
    } catch (err) {
      setGroupScheduleModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              timeslots: prev.timeslots || [],
              error:
                err?.response?.data?.message ||
                "Không tải được lịch học của nhóm.",
            }
          : null,
      );
    }
  }, []);

  useEffect(() => {
    if (!groupScheduleModal) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setGroupScheduleModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupScheduleModal]);

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
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => openGroupScheduleModal(g)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    <Calendar size={14} />
                    Xem lịch nhóm
                  </button>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={14} />
                    Nhóm bắt đầu: {formatCreatedAt(g.firstCreatedAt)}
                  </div>
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

      {groupScheduleModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGroupScheduleModal(null);
          }}
          role="presentation"
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-h-[85vh] flex flex-col ${
              groupScheduleTab === "timetable" ? "max-w-5xl" : "max-w-3xl"
            }`}
            role="dialog"
            aria-labelledby="group-schedule-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="min-w-0">
                <h2
                  id="group-schedule-title"
                  className="text-lg font-bold text-slate-900 flex items-center gap-2"
                >
                  <Calendar className="text-indigo-600 shrink-0" size={22} />
                  Lịch học nhóm
                </h2>
                <p className="text-sm font-mono font-semibold text-indigo-800 mt-1 truncate">
                  {groupScheduleModal.classGroup}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {groupScheduleModal.academicYear || "—"} · HK
                  {groupScheduleModal.semester ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGroupScheduleModal(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex-shrink-0"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {groupScheduleModal.loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
                  Đang tải lịch...
                </div>
              ) : groupScheduleModal.error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {groupScheduleModal.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Tổng hợp lịch từng học phần trong nhóm (theo dữ liệu đã gán phòng
                    / tiết).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupScheduleTab("timetable")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        groupScheduleTab === "timetable"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <LayoutGrid size={14} />
                      Thời khóa biểu
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupScheduleTab("list")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        groupScheduleTab === "list"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <List size={14} />
                      Danh sách chi tiết
                    </button>
                  </div>

                  {groupScheduleTab === "timetable" ? (
                    <GroupTimetableGrid
                      sections={groupScheduleModal.sections}
                      timeslots={groupScheduleModal.timeslots || []}
                    />
                  ) : null}

                  {groupScheduleTab === "list" ? (
                    <div className="space-y-4 pt-1">
                  {groupScheduleModal.sections.map((sec) => (
                    <article
                      key={sec._id}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="bg-slate-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <Link
                              to={`/admin/classes/${sec._id}`}
                              className="text-indigo-600 hover:underline font-mono text-sm shrink-0"
                            >
                              {sec.classCode}
                            </Link>
                            <span className="text-slate-700 font-normal text-sm truncate">
                              {sec.subjectName || sec.className || "—"}
                            </span>
                          </div>
                          {sec.subjectCode ? (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              {sec.subjectCode}
                            </div>
                          ) : null}
                        </div>
                        <Link
                          to={`/admin/classes/${sec._id}`}
                          className="text-xs font-medium text-indigo-600 hover:underline shrink-0"
                        >
                          Chi tiết lớp
                        </Link>
                      </div>
                      <div className="px-4 py-3 bg-white">
                        {sec.schedules.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            Chưa có lịch học
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {sec.schedules.map((sch) => {
                              const spanClock = formatSpanClock(
                                groupScheduleModal.timeslots || [],
                                sch.startPeriod,
                                sch.endPeriod,
                              );
                              return (
                              <li
                                key={sch._id}
                                className="text-sm rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5"
                              >
                                <div className="font-medium text-slate-800">
                                  {DAYS_OF_WEEK.find(
                                    (d) => d.value === sch.dayOfWeek,
                                  )?.label || `Thứ ${sch.dayOfWeek}`}{" "}
                                  · {schedulePeriodLabel(sch)}
                                </div>
                                {spanClock ? (
                                  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-700 tabular-nums">
                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                    {spanClock}
                                  </div>
                                ) : null}
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                  <span className="inline-flex items-center gap-1 min-w-0">
                                    <MapPin
                                      size={12}
                                      className="text-slate-400 shrink-0"
                                    />
                                    <span className="truncate">
                                      {sch.room?.roomCode}
                                      {sch.room?.roomName
                                        ? ` — ${sch.room.roomName}`
                                        : ""}
                                      {sch.room?.capacity != null
                                        ? ` (${sch.room.capacity} chỗ)`
                                        : ""}
                                    </span>
                                  </span>
                                  <span className="tabular-nums text-slate-500">
                                    Hiệu lực:{" "}
                                    {formatScheduleDate(sch.startDate)} →{" "}
                                    {formatScheduleDate(sch.endDate)}
                                  </span>
                                </div>
                              </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setGroupScheduleModal(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
