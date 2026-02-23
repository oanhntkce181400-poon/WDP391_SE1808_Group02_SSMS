import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  CheckSquare,
} from "lucide-react";
import classService from "../../services/classService";
import subjectService from "../../services/subjectService";
import semesterService from "../../services/semesterService";
import lecturerService from "../../services/lecturerService";
import AssignScheduleModal from "../../components/features/AssignScheduleModal";

/* ───── helpers ───── */
// Kiểm tra xem lớp đã có lịch chưa (có thể mở lớp)
const hasSchedule = (cls) => {
  // Lớp đã ở trạng thái scheduled hoặc published = đã có lịch
  if (cls.status === "scheduled" || cls.status === "published") return true;
  // Hoặc có room/timeslot (format cũ)
  if (cls.room && cls.timeslot && cls.dayOfWeek) return true;
  return false;
};

const STATUS_CONFIG = {
  draft: { label: "Nháp", bg: "bg-gray-100", text: "text-gray-700" },
  scheduled: { label: "Đã xếp lịch", bg: "bg-blue-100", text: "text-blue-700" },
  published: { label: "Đã công bố", bg: "bg-green-100", text: "text-green-700" },
  locked: { label: "Đã khóa", bg: "bg-red-100", text: "text-red-700" },
  active: { label: "Đang mở", bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelled: { label: "Đã hủy", bg: "bg-red-100", text: "text-red-700" },
  completed: {
    label: "Đã kết thúc",
    bg: "bg-slate-100",
    text: "text-slate-600",
  },
};

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

function Toast({ toast, onClose }) {
  if (!toast.show) return null;
  const colors =
    toast.type === "success"
      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
      : "bg-red-50 border-red-300 text-red-800";
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${colors}`}
    >
      {toast.type === "success" ? (
        <CheckCircle size={18} />
      ) : (
        <XCircle size={18} />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-auto opacity-60 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ───── form initial state ───── */
const EMPTY_FORM = {
  classCode: "",
  className: "",
  subject: "",
  teacher: "",
  semester: "",
  academicYear: "",
  maxCapacity: "",
  status: "draft",
};

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 10,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // dropdowns
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [conflictData, setConflictData] = useState(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState(null);

  // Bulk selection state
  const [selectedClasses, setSelectedClasses] = useState([]);

  /* ── Toast helper ── */
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  /* ── Fetch classes ── */
  const fetchClasses = useCallback(
    async (page = 1, keyword = "", status = "") => {
      setLoading(true);
      try {
        const params = { page, limit: 10 };
        if (keyword) params.search = keyword;
        if (status) params.status = status;
        const res = await classService.getAllClasses(params);
        const d = res.data;
        setClasses(d.data || []);
        if (d.pagination) {
          setPagination({
            page: d.pagination.page,
            total: d.pagination.total,
            totalPages: d.pagination.totalPages,
            limit: d.pagination.limit,
          });
        }
      } catch {
        showToast("Không thể tải danh sách lớp học", "error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ── Fetch dropdown data ── */
  useEffect(() => {
    fetchClasses();
    subjectService
      .getSubjects({ limit: 200 })
      .then((r) => setSubjects(r.data.data || []))
      .catch(() => {});
    lecturerService
      .getAll({ limit: 200 })
      .then((r) => setTeachers(r.data.data || []))
      .catch(() => {});
  }, [fetchClasses]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClasses(1, search, statusFilter);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    fetchClasses(1, search, val);
  };

  /* ── Bulk Selection ── */
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Chỉ chọn các lớp đã có lịch
      const classesWithSchedule = classes.filter(cls => hasSchedule(cls)).map(c => c._id);
      setSelectedClasses(classesWithSchedule);
    } else {
      setSelectedClasses([]);
    }
  };

  const handleSelectOne = (classId) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleBulkPublish = async () => {
    if (selectedClasses.length === 0) return;
    setSubmitting(true);
    try {
      const res = await classService.bulkUpdateStatus(selectedClasses, "published");
      showToast(`Đã mở ${res.data.data.success.length}/${selectedClasses.length} lớp`);
      setSelectedClasses([]);
      fetchClasses(pagination.page, search, statusFilter);
    } catch (err) {
      const msg = err?.response?.data?.message || "Mở lớp thất bại";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedClasses.length === 0) return;
    setSubmitting(true);
    try {
      const res = await classService.bulkUpdateStatus(selectedClasses, newStatus);
      const { success, failed } = res.data.data;
      let msg = `Cập nhật thành công ${success.length}/${selectedClasses.length} lớp`;
      if (failed.length > 0) {
        msg += `. ${failed.length} lớp thất bại: ${failed.map(f => f.classCode).join(", ")}`;
      }
      showToast(msg, failed.length > 0 ? "warning" : "success");
      setSelectedClasses([]);
      fetchClasses(pagination.page, search, statusFilter);
    } catch (err) {
      const msg = err?.response?.data?.message || "Cập nhật thất bại";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Create ── */
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setConflictWarning(null);
    setConflictData(null);
    setShowCreate(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await classService.createClass({
        classCode: formData.classCode,
        className: formData.className,
        subject: formData.subject,
        teacher: formData.teacher,
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        maxCapacity: Number(formData.maxCapacity),
        status: formData.status,
      });
      showToast("Tạo lớp học thành công");
      setShowCreate(false);
      fetchClasses(1, search, statusFilter);
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Tạo lớp học thất bại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Edit ── */
  const openEdit = (cls) => {
    setSelected(cls);
    setFormData({
      classCode: cls.classCode,
      className: cls.className,
      subject: cls.subject?._id || cls.subject || "",
      teacher: cls.teacher?._id || cls.teacher || "",
      semester: cls.semester || "",
      academicYear: cls.academicYear || "",
      maxCapacity: cls.maxCapacity || "",
      status: cls.status || "draft",
    });
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await classService.updateClass(selected._id, {
        className: formData.className,
        subject: formData.subject,
        teacher: formData.teacher,
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        maxCapacity: Number(formData.maxCapacity),
        status: formData.status,
      });
      showToast("Cập nhật lớp học thành công");
      setShowEdit(false);
      fetchClasses(pagination.page, search, statusFilter);
    } catch (err) {
      showToast(err?.response?.data?.message || "Cập nhật thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const openDelete = (cls) => {
    setSelected(cls);
    setShowDelete(true);
  };

  /* ── Assign Schedule ── */
  const openAssignSchedule = (cls) => {
    setSelectedClassForSchedule(cls);
    setShowScheduleModal(true);
  };

  const confirmDelete = async () => {
    setSubmitting(true);
    try {
      await classService.deleteClass(selected._id);
      showToast("Đã xóa lớp học");
      setShowDelete(false);
      fetchClasses(pagination.page, search, statusFilter);
    } catch (err) {
      const msg = err?.response?.data?.message || "Xóa lớp học thất bại";
      showToast(msg, "error");
      setShowDelete(false);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Input change helper ── */
  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* ─────────── RENDER ─────────── */
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <Toast
        toast={toast}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={26} />
            Quản lý Lớp học phần
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng cộng {pagination.total} lớp học phần
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Mở lớp học
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã lớp, tên môn học..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Tìm
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="published">Đang mở</option>
            <option value="locked">Bị khóa</option>
            <option value="completed">Đã kết thúc</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-3" />
            Đang tải...
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BookOpen size={40} className="mb-3 opacity-40" />
            <p>Không có lớp học nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedClasses.length === classes.filter(c => hasSchedule(c)).length && classes.filter(c => hasSchedule(c)).length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      title="Chọn tất cả lớp đã có lịch"
                    />
                  </th>
                  {[
                    "Mã lớp",
                    "Tên lớp",
                    "Môn học",
                    "Năm học / HK",
                    "Giảng viên",
                    "Phòng",
                    "Sĩ số",
                    "Trạng thái",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => {
                  const clsHasSchedule = hasSchedule(cls);
                  return (
                  <tr
                    key={cls._id}
                    className={`hover:bg-slate-50 transition-colors ${selectedClasses.includes(cls._id) ? 'bg-indigo-50' : ''} ${!clsHasSchedule ? 'opacity-60' : ''}`}
                  >
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls._id)}
                        onChange={() => clsHasSchedule && handleSelectOne(cls._id)}
                        disabled={!clsHasSchedule}
                        title={!clsHasSchedule ? "Lớp chưa được gán lịch" : ""}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {cls.classCode}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium max-w-[180px] truncate">
                      {cls.className}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                      <div className="truncate">
                        {cls.subject?.subjectName || "—"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {cls.subject?.subjectCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {cls.academicYear}
                      <span className="ml-1 text-xs text-slate-400">
                        HK{cls.semester}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">
                      {cls.teacher?.fullName || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cls.room?.roomCode || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-slate-400" />
                        {cls.currentEnrollment}/{cls.maxCapacity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cls.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openAssignSchedule(cls)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Gán phòng và lịch"
                        >
                          <Calendar size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(cls)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => openDelete(cls)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedClasses.length > 0 && (
          <div className="fixed bottom-6 left-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-4 z-50" style={{ transform: "translateX(-50%)" }}>
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-indigo-400" />
              <span className="font-medium">{selectedClasses.length} lớp được chọn</span>
            </div>
            <div style={{ width: "1px", height: "24px", backgroundColor: "#334155" }}></div>
            <button
              onClick={() => handleBulkStatus("scheduled")}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Chuyển sang Duyệt
            </button>
            <button
              onClick={handleBulkPublish}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle size={16} />
              Mở lớp
            </button>
            <button
              onClick={() => handleBulkStatus("locked")}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Khóa lớp
            </button>
            <button
              onClick={() => handleBulkStatus("cancelled")}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Hủy lớp
            </button>
            <button
              onClick={() => setSelectedClasses([])}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              title="Bỏ chọn"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Trang {pagination.page} / {pagination.totalPages} —{" "}
              {pagination.total} lớp
            </p>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  fetchClasses(pagination.page - 1, search, statusFilter)
                }
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  fetchClasses(pagination.page + 1, search, statusFilter)
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {(showCreate || showEdit) && (
        <ClassFormModal
          title={showCreate ? "Mở lớp học phần mới" : "Chỉnh sửa lớp học"}
          formData={formData}
          onChange={handleChange}
          onSubmit={showCreate ? submitCreate : submitEdit}
          onClose={() => {
            setShowCreate(false);
            setShowEdit(false);
          }}
          submitting={submitting}
          subjects={subjects}
          teachers={teachers}
        />
      )}

      {/* ── Assign Schedule Modal ── */}
      {showScheduleModal && selectedClassForSchedule && (
        <AssignScheduleModal
          classSection={selectedClassForSchedule}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedClassForSchedule(null);
          }}
          onSuccess={() => {
            // Refresh class list after successful schedule assignment
            fetchClasses(pagination.page, search, statusFilter);
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Xác nhận xóa lớp học
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Bạn có chắc muốn xóa lớp{" "}
              <span className="font-semibold text-slate-900">
                {selected.className}
              </span>{" "}
              (<span className="font-mono">{selected.classCode}</span>)?
              {selected.currentEnrollment > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  ⚠ Lớp này đang có {selected.currentEnrollment} sinh viên đã
                  đăng ký. Không thể xóa.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={submitting || selected.currentEnrollment > 0}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Đang xóa..." : "Xóa lớp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Class Form Modal (shared by Create + Edit)
───────────────────────────────────────── */
function ClassFormModal({
  title,
  formData,
  onChange,
  onSubmit,
  onClose,
  submitting,
  subjects,
  teachers,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          id="class-form"
          onSubmit={onSubmit}
          className="overflow-y-auto px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* Mã lớp */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mã lớp <span className="text-red-500">*</span>
            </label>
            <input
              name="classCode"
              required
              value={formData.classCode}
              onChange={onChange}
              placeholder="VD: SE1720.1"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Tên lớp */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên lớp <span className="text-red-500">*</span>
            </label>
            <input
              name="className"
              required
              value={formData.className}
              onChange={onChange}
              placeholder="VD: Kỹ thuật phần mềm - Nhóm 1"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Môn học */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Môn học <span className="text-red-500">*</span>
            </label>
            <select
              name="subject"
              required
              value={formData.subject}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Giảng viên */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Giảng viên <span className="text-red-500">*</span>
            </label>
            <select
              name="teacher"
              required
              value={formData.teacher}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn giảng viên --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.teacherCode} — {t.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Học kỳ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Học kỳ <span className="text-red-500">*</span>
            </label>
            <select
              name="semester"
              required
              value={formData.semester}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn học kỳ --</option>
              <option value="1">Học kỳ 1</option>
              <option value="2">Học kỳ 2</option>
              <option value="3">Học kỳ 3 (hè)</option>
            </select>
          </div>

          {/* Năm học */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Năm học <span className="text-red-500">*</span>
            </label>
            <input
              name="academicYear"
              required
              value={formData.academicYear}
              onChange={onChange}
              placeholder="VD: 2024-2025"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Sĩ số tối đa */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sĩ số tối đa <span className="text-red-500">*</span>
            </label>
            <input
              name="maxCapacity"
              type="number"
              min="1"
              required
              value={formData.maxCapacity}
              onChange={onChange}
              placeholder="VD: 30"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trạng thái
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="draft">Bản nháp</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="published">Đang mở</option>
              <option value="locked">Bị khóa</option>
              <option value="completed">Đã kết thúc</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="class-form"
            disabled={submitting}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
