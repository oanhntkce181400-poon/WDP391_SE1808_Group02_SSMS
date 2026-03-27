import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import classService from "../../services/classService";

const STATUS_LABEL = {
  draft: "Nháp",
  scheduled: "Đã xếp lịch",
  published: "Đã công bố",
  locked: "Đã khóa",
  cancelled: "Đã hủy",
  completed: "Đã kết thúc",
};

function statusLabel(s) {
  return STATUS_LABEL[s] || s || "—";
}

export default function AdminClassDetailPage() {
  const { classSectionId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classSectionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [cRes, eRes] = await Promise.all([
          classService.getClassById(classSectionId),
          classService.getClassEnrollments(classSectionId, {
            status: "enrolled",
          }),
        ]);
        if (cancelled) return;
        setCls(cRes?.data?.data ?? null);
        const rows = eRes?.data?.data;
        setEnrollments(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message || "Không tải được thông tin lớp học phần.",
          );
          setCls(null);
          setEnrollments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classSectionId]);

  const subjectLine = useMemo(() => {
    const sub = cls?.subject;
    if (!sub) return "—";
    const code = sub.subjectCode || sub.code;
    const name = sub.subjectName || sub.name;
    return [code, name].filter(Boolean).join(" — ") || "—";
  }, [cls]);

  const teacherLine = useMemo(() => {
    const t = cls?.teacher;
    if (!t) return "—";
    return (
      [t.teacherCode, t.fullName].filter(Boolean).join(" — ") ||
      t.fullName ||
      "—"
    );
  }, [cls]);

  const curriculumLine = useMemo(() => {
    const c = cls?.curriculum;
    if (!c) return "— (lớp không gắn khung chương trình)";
    return [c.code, c.name].filter(Boolean).join(" — ") || "—";
  }, [cls]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/classes")}
            className="mb-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← Quản lý lớp
          </button>
          <Link
            to="/admin/auto-enrollment"
            className="mb-2 ml-2 inline-block rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Auto Enrollment
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Chi tiết lớp học phần
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Môn học, giảng viên, khung CT, kỳ và danh sách sinh viên đã ghi danh.
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Đang tải…</p>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && cls && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-slate-100 pb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tên hiển thị
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {cls.className || "—"}
              </div>
              <div className="mt-1 font-mono text-sm text-slate-600">
                Mã lớp: {cls.classCode || "—"}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    cls.status === "published"
                      ? "bg-emerald-100 text-emerald-800"
                      : cls.status === "draft"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {statusLabel(cls.status)}
                </span>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Học phần (môn)
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{subjectLine}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Giảng viên
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{teacherLine}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Khung chương trình
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{curriculumLine}</dd>
                {cls.curriculum?.academicYear && (
                  <dd className="mt-0.5 text-xs text-slate-500">
                    Niên khóa khung: {cls.curriculum.academicYear}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Kỳ &amp; niên khóa trên lớp
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  Kỳ (số trên ClassSection):{" "}
                  <span className="font-medium">HK {cls.semester}</span>
                  {" · "}
                  Niên khóa:{" "}
                  <span className="font-medium">{cls.academicYear || "—"}</span>
                </dd>
                {cls.curriculumSemesterOrder != null && (
                  <dd className="mt-1 text-xs text-slate-600">
                    Thứ tự kỳ trong khung CT:{" "}
                    <span className="font-medium">
                      {cls.curriculumSemesterOrder}
                    </span>
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Nhóm lớp học phần
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {cls.classGroup?.trim() ? cls.classGroup : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Sĩ số
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  Đã đăng ký: {enrollments.length} / {cls.maxCapacity ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Sinh viên đã ghi danh ({enrollments.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Mã SV
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Họ tên
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Ngành
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Khóa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Chưa có sinh viên trạng thái «đang học» trong lớp này.
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((row) => {
                      const st = row.student || {};
                      const eid = String(row._id ?? "");
                      return (
                        <tr key={eid || st.studentCode} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2 font-mono text-xs">
                            {st.studentCode ?? "—"}
                          </td>
                          <td className="px-4 py-2">{st.fullName ?? "—"}</td>
                          <td className="px-4 py-2">{st.majorCode ?? "—"}</td>
                          <td className="px-4 py-2">
                            {st.enrollmentYear ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
