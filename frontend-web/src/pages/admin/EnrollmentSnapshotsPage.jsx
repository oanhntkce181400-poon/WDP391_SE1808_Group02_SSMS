import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  UserPlus,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import enrollmentSnapshotService from "../../services/enrollmentSnapshotService";
import studentService from "../../services/studentService";
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

  // Add student to snapshot state
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedForAdd, setSelectedForAdd] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [addResult, setAddResult] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

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
    setShowAddStudents(false);
    setStudentSearchQuery("");
    setSearchResults([]);
    setSelectedForAdd([]);
    setAddResult(null);
    try {
      const res = await enrollmentSnapshotService.getById(id);
      setDetail(res?.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Không tải chi tiết");
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setShowAddStudents(false);
    setStudentSearchQuery("");
    setSearchResults([]);
    setSelectedForAdd([]);
    setAddResult(null);
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

  // ── Student search & add ──
  const handleStudentSearchChange = (e) => {
    const value = e.target.value;
    setStudentSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await studentService.getStudents({
          search: value.trim(),
          academicStatus: "enrolled",
          limit: 20,
        });
        const data = res.data?.data || [];
        // Filter out students already in snapshot
        const existingIds = new Set(
          (detail?.logs || []).map((l) => String(l.studentId))
        );
        setSearchResults(data.filter((s) => !existingIds.has(String(s._id))));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimeout(t);
  };

  const toggleStudentForAdd = (id) => {
    setSelectedForAdd((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddStudents = async () => {
    if (selectedForAdd.length === 0 || !detail?._id) return;
    setAddingStudents(true);
    setAddResult(null);
    setError("");
    try {
      const res = await enrollmentSnapshotService.addStudentsToSnapshot(
        detail._id,
        selectedForAdd
      );
      setAddResult(res.data?.data || {});
      setSelectedForAdd([]);
      setStudentSearchQuery("");
      setSearchResults([]);
      // Refresh detail
      const fresh = await enrollmentSnapshotService.getById(detail._id);
      setDetail(fresh?.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Thêm sinh viên thất bại");
    } finally {
      setAddingStudents(false);
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
              <div className="flex items-center gap-2">
                {!detail.dryRun && (
                  <button
                    type="button"
                    onClick={() => setShowAddStudents((v) => !v)}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    {showAddStudents ? "Ẩn" : "Thêm SV"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => closeDetail()}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* ── Add Students Section ── */}
            {showAddStudents && !detail.dryRun && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <UserPlus size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      Thêm sinh viên vào bản lưu này
                    </p>
                    <p className="text-xs text-slate-600">
                      SV sẽ được ghi danh vào <strong>tất cả học phần</strong> trong
                      snapshot cùng lúc.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                  </div>
                )}

                {addResult && (
                  <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium mb-1">
                      <CheckCircle size={14} className="shrink-0" />
                      Thêm thành công!
                    </div>
                    <p className="text-xs text-emerald-600 ml-5">
                      {addResult.studentsFound} SV tìm thấy ·{" "}
                      {addResult.classSectionsCount} học phần ·{" "}
                      {addResult.summary?.totalEnrollments} enroll ·{" "}
                      {addResult.summary?.duplicates} skip ·{" "}
                      {addResult.summary?.failed} lỗi
                      {addResult.studentsNotFound?.length > 0 && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-red-600">
                            {addResult.studentsNotFound.length} không tìm thấy:{" "}
                            {addResult.studentsNotFound.join(", ")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={handleStudentSearchChange}
                      placeholder="Nhập mã SV hoặc tên (ít nhất 2 ký tự)..."
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    {searching && (
                      <Loader2
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                      />
                    )}
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white mb-2">
                    {searchResults.map((s) => {
                      const isSelected = selectedForAdd.includes(s.studentCode);
                      return (
                        <div
                          key={s._id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b border-slate-100 last:border-0 ${
                            isSelected
                              ? "bg-emerald-50"
                              : "hover:bg-slate-50"
                          }`}
                          onClick={() => toggleStudentForAdd(s.studentCode)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="shrink-0 w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
                          />
                          <span className="font-medium text-slate-800">
                            {s.fullName}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            {s.studentCode}
                          </span>
                          {s.majorCode && (
                            <span className="text-xs text-slate-400">
                              · {s.majorCode}
                            </span>
                          )}
                          {s.cohort && (
                            <span className="text-xs text-slate-400">
                              · K{s.cohort}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {studentSearchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                  <p className="text-xs text-slate-500 mb-2">
                    Không tìm thấy sinh viên phù hợp hoặc tất cả đã nằm trong
                    snapshot.
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {selectedForAdd.length > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        {selectedForAdd.length} sinh viên được chọn
                      </span>
                    ) : (
                      "Chọn sinh viên để thêm vào snapshot"
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={selectedForAdd.length === 0 || addingStudents}
                    onClick={handleAddStudents}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {addingStudents ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Đang thêm...
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} />
                        Thêm {selectedForAdd.length > 0 ? `${selectedForAdd.length} SV` : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

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
