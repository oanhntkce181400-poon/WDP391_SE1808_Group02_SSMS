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
} from "lucide-react";
import classService from "../../services/classService";
import subjectService from "../../services/subjectService";
import semesterService from "../../services/semesterService";
import lecturerService from "../../services/lecturerService";
import roomService from "../../services/roomService";
import timeslotService from "../../services/timeslotService";

/* ───── helpers ───── */
const STATUS_CONFIG = {
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
  room: "",
  timeslot: "",
  dayOfWeek: "",
  semester: "",
  academicYear: "",
  maxCapacity: "",
  status: "active",
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
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Conflict checking state
  const [conflictWarning, setConflictWarning] = useState(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictData, setConflictData] = useState(null);

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
    roomService
      .getRooms({ limit: 200 })
      .then((r) => {
        const raw = r.data;
        setRooms(raw.data || raw.rooms || []);
      })
      .catch(() => {});
    timeslotService
      .getTimeslots({ limit: 200 })
      .then((r) => setTimeslots(r.data.data || r.data.timeslots || []))
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

  /* ── Create ── */
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setConflictWarning(null);
    setConflictData(null);
    setShowCreate(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    // Prevent submit if there's a conflict
    if (conflictWarning) {
      showToast("Vui lòng chọn lịch khác để tránh trùng lịch!", "error");
      return;
    }
    setSubmitting(true);
    try {
      await classService.createClass({
        classCode: formData.classCode,
        className: formData.className,
        subject: formData.subject,
        teacher: formData.teacher,
        room: formData.room,
        timeslot: formData.timeslot,
        dayOfWeek: Number(formData.dayOfWeek),
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
      room: cls.room?._id || cls.room || "",
      timeslot: cls.timeslot?._id || cls.timeslot || "",
      dayOfWeek: cls.dayOfWeek?.toString() || "",
      semester: cls.semester || "",
      academicYear: cls.academicYear || "",
      maxCapacity: cls.maxCapacity || "",
      status: cls.status || "active",
    });
    setConflictWarning(null);
    setConflictData(null);
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    // Prevent submit if there's a conflict
    if (conflictWarning) {
      showToast("Vui lòng chọn lịch khác để tránh trùng lịch!", "error");
      return;
    }
    setSubmitting(true);
    try {
      await classService.updateClass(selected._id, {
        className: formData.className,
        subject: formData.subject,
        teacher: formData.teacher,
        room: formData.room,
        timeslot: formData.timeslot,
        dayOfWeek: Number(formData.dayOfWeek),
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

  /* ── Check schedule conflict ── */
  const checkConflict = useCallback(async (data) => {
    // Only check if we have all required fields
    if (!data.teacher || !data.room || !data.timeslot || !data.dayOfWeek || !data.semester || !data.academicYear) {
      setConflictWarning(null);
      setConflictData(null);
      return;
    }

    setCheckingConflict(true);
    try {
      const response = await classService.checkConflict({
        teacherId: data.teacher,
        roomId: data.room,
        timeslotId: data.timeslot,
        dayOfWeek: data.dayOfWeek,
        semester: data.semester,
        academicYear: data.academicYear,
        excludeClassId: selected?._id || null
      });

      const result = response.data;
      if (result.hasConflict && result.conflicts?.length > 0) {
        const conflicts = result.conflicts;
        const teacherConflict = conflicts.find(c => String(c.teacher?._id) === data.teacher);
        const roomConflict = conflicts.find(c => String(c.room?._id) === data.room);

        let message = "⚠️ Trùng lịch giảng dạy! ";
        const conflictDetails = [];

        if (teacherConflict) {
          conflictDetails.push(`GV ${teacherConflict.teacher?.fullName || teacherConflict.teacher} đã dạy lớp ${teacherConflict.classCode} (${teacherConflict.subject?.subjectCode})`);
        }
        if (roomConflict) {
          conflictDetails.push(`Phòng ${roomConflict.room?.roomCode || roomConflict.room} đã được đặt cho lớp ${roomConflict.classCode}`);
        }

        setConflictWarning(message + conflictDetails.join(" | "));
        setConflictData(conflicts);
      } else {
        setConflictWarning(null);
        setConflictData(null);
      }
    } catch (err) {
      console.error("Error checking conflict:", err);
      // Don't show error to user, just reset conflict state
      setConflictWarning(null);
      setConflictData(null);
    } finally {
      setCheckingConflict(false);
    }
  }, [selected]);

  // Debounced check conflict when form data changes
  useEffect(() => {
    if (!showCreate && !showEdit) return;

    const timer = setTimeout(() => {
      checkConflict(formData);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [formData.teacher, formData.room, formData.timeslot, formData.dayOfWeek, formData.semester, formData.academicYear, showCreate, showEdit, checkConflict]);

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
            <option value="active">Đang mở</option>
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
                {classes.map((cls) => (
                  <tr
                    key={cls._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
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
                ))}
              </tbody>
            </table>
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
            setConflictWarning(null);
            setConflictData(null);
          }}
          submitting={submitting}
          subjects={subjects}
          teachers={teachers}
          rooms={rooms}
          timeslots={timeslots}
          conflictWarning={conflictWarning}
          checkingConflict={checkingConflict}
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
  rooms,
  timeslots,
  conflictWarning,
  checkingConflict,
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

        {/* Conflict Warning */}
        {conflictWarning && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{conflictWarning}</p>
            </div>
          </div>
        )}

        {/* Checking status */}
        {checkingConflict && !conflictWarning && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-blue-700">Đang kiểm tra trùng lịch...</span>
            </div>
          </div>
        )}

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

          {/* Phòng học */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phòng học <span className="text-red-500">*</span>
            </label>
            <select
              name="room"
              required
              value={formData.room}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roomCode} — {r.roomName}
                </option>
              ))}
            </select>
          </div>

          {/* Lịch học */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ca học <span className="text-red-500">*</span>
            </label>
            <select
              name="timeslot"
              required
              value={formData.timeslot}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn ca học --</option>
              {timeslots.map((ts) => (
                <option key={ts._id} value={ts._id}>
                  {ts.groupName}
                </option>
              ))}
            </select>
          </div>

          {/* Thứ trong tuần */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Thứ <span className="text-red-500">*</span>
            </label>
            <select
              name="dayOfWeek"
              required
              value={formData.dayOfWeek}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Chọn thứ --</option>
              <option value="1">Thứ 2 (Monday)</option>
              <option value="2">Thứ 3 (Tuesday)</option>
              <option value="3">Thứ 4 (Wednesday)</option>
              <option value="4">Thứ 5 (Thursday)</option>
              <option value="5">Thứ 6 (Friday)</option>
              <option value="6">Thứ 7 (Saturday)</option>
              <option value="7">Chủ nhật (Sunday)</option>
            </select>
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
              <option value="active">Đang mở</option>
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
            disabled={submitting || !!conflictWarning}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "Đang lưu..." : conflictWarning ? "Không thể lưu (Trùng lịch)" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
