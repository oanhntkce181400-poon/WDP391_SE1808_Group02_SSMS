import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import enrollmentSnapshotService from "../../services/enrollmentSnapshotService";
import {
  collectUniqueEnrolledSubjectCodes,
  formatEnrollmentLogDetail,
} from "../../utils/formatEnrollmentLogDetail";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function EnrollmentSnapshotsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await enrollmentSnapshotService.list({ page, limit });
      setItems(res?.data?.data || []);
      setTotal(res?.data?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải được danh sách");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    setError("");
    try {
      const res = await enrollmentSnapshotService.getById(id);
      setDetail(res?.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải chi tiết");
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditTitle(row.title || "");
    setEditDescription(row.description || "");
  };

  const saveEdit = async () => {
    if (!editRow?._id) return;
    setSaving(true);
    setError("");
    try {
      await enrollmentSnapshotService.update(editRow._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setEditRow(null);
      await load();
      if (detail?._id === editRow._id) {
        const res = await enrollmentSnapshotService.getById(editRow._id);
        setDetail(res?.data?.data || null);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa bản lưu này?")) return;
    setError("");
    try {
      await enrollmentSnapshotService.remove(id);
      if (detail?._id === id) setDetail(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Xóa thất bại");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lịch sử xếp lớp (đã lưu)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Các bản chụp kết quả sau khi bấm &quot;Lưu lớp&quot; trên trang Auto
            Enrollment — chỉnh sửa tên / ghi chú hoặc xóa.
          </p>
        </div>
        <Link
          to="/admin/auto-enrollment"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Quay lại Auto Enrollment
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Tổng: <strong>{total}</strong> bản ghi
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Tên lớp / bản lưu
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Học kỳ
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Khung CT
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Chế độ
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Ngày lưu
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row._id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.title}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.semesterSnapshot?.name ||
                        row.semesterSnapshot?.code ||
                        "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.curriculumCode || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {row.dryRun ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Dry run
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Live
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(row._id)}
                          className="text-blue-600 hover:underline"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-slate-700 hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row._id)}
                          className="text-red-600 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Chưa có bản lưu nào. Chạy Auto Enrollment rồi bấm &quot;Lưu
            lớp&quot; để tạo bản ghi tại đây.
          </p>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {detail.title}
                </h2>
                {detail.description ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {detail.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  {detail.semesterSnapshot?.name} ·{" "}
                  {detail.curriculumCode || "—"} ·{" "}
                  {detail.dryRun ? "Dry run" : "Live"} ·{" "}
                  {formatDate(detail.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
              >
                Đóng
              </button>
            </div>

            {detail.summary && (
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <Stat label="SV xử lý" value={detail.summary.totalStudents} />
                <Stat
                  label="Enrollments"
                  value={detail.summary.totalEnrollments}
                />
                <Stat label="Duplicates" value={detail.summary.duplicates} />
              </div>
            )}

            {(() => {
              const codes = collectUniqueEnrolledSubjectCodes(detail.logs);
              if (codes.length === 0) return null;
              return (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">
                    Học phần có trong bản lưu ({codes.length})
                  </p>
                  <p className="mt-1 break-words text-slate-600">
                    {codes.join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Mỗi dòng bên dưới là một sinh viên; cột Detail liệt kê đủ mã
                    môn đã xếp cho SV đó trong lần chạy này.
                  </p>
                </div>
              );
            })()}

            <h3 className="mb-2 font-semibold text-slate-800">
              Execution Logs
            </h3>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Student
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Enrolled
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Waitlisted
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Skipped
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Errors
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Chi tiết (mã môn)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.logs || []).map((row) => {
                    const d = formatEnrollmentLogDetail(row);
                    return (
                      <tr
                        key={row.studentId || row.studentCode}
                        className="border-b border-slate-100 align-top"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">
                            {row.fullName || "-"}
                          </div>
                          <div className="break-all text-xs text-slate-600">
                            {row.email || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.studentCode || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-green-700">
                          {row.enrolled?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-amber-700">
                          {row.waitlisted?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.skipped?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-red-700">
                          {row.errors?.length || 0}
                        </td>
                        <td className="max-w-[280px] px-3 py-2 text-xs break-words text-slate-600">
                          {d}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Sửa bản lưu</h2>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Tên
            </label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Ghi chú
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !editTitle.trim()}
                onClick={saveEdit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900">{value ?? 0}</div>
    </div>
  );
}
