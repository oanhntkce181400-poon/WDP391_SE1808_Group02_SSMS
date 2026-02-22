import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Camera,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from "lucide-react";
import lecturerService from "../../services/lecturerService";
import majorService from "../../services/majorService";

/* ───── Constants ───── */
const DEGREE_LABELS = {
  bachelors: "Cử nhân",
  masters: "Thạc sĩ",
  phd: "Tiến sĩ",
  professor: "Giáo sư",
};

const GENDER_LABELS = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const SPEC_PRESETS = [
  "Công nghệ phần mềm",
  "Trí tuệ nhân tạo / Machine Learning",
  "Khoa học máy tính",
  "Kỹ thuật phần mềm",
  "An toàn thông tin",
  "Hệ thống thông tin",
  "Mạng máy tính & Truyền thông",
  "Phát triển Web",
  "Phát triển ứng dụng di động",
  "Cơ sở dữ liệu",
  "Điện tử - Viễn thông",
  "Kỹ thuật điều khiển & Tự động hóa",
  "Toán học ứng dụng",
  "Kinh tế số",
  "Quản trị kinh doanh",
  "Kế toán - Tài chính",
  "Ngoại ngữ (Tiếng Anh)",
  "Giáo dục thể chất",
];

const SPEC_PALETTES = [
  "bg-sky-100 text-sky-700 ring-sky-200",
  "bg-teal-100 text-teal-700 ring-teal-200",
  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "bg-violet-100 text-violet-700 ring-violet-200",
  "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-amber-100 text-amber-700 ring-amber-200",
  "bg-lime-100 text-lime-700 ring-lime-200",
  "bg-cyan-100 text-cyan-700 ring-cyan-200",
  "bg-orange-100 text-orange-700 ring-orange-200",
];

function specColor(str) {
  if (!str) return SPEC_PALETTES[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return SPEC_PALETTES[h % SPEC_PALETTES.length];
}

function SpecializationBadge({ value }) {
  if (!value) return null;
  const palette = specColor(value);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${palette} max-w-full`}
    >
      <span className="shrink-0 text-[9px]">✦</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

/* ───── Helpers ───── */
function Avatar({ src, name, size = "md" }) {
  const [err, setErr] = useState(false);
  const initials = name
    ? name
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "GV";
  const sizeClass = size === "lg" ? "w-20 h-20 text-xl" : "w-11 h-11 text-sm";
  if (!err && src) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white ring-2 ring-white shadow`}
    >
      {initials}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
        ${checked ? "bg-emerald-500" : "bg-slate-200"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
        ${checked ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
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

const EMPTY_FORM = {
  teacherCode: "",
  fullName: "",
  email: "",
  department: "",
  phone: "",
  specialization: "",
  degree: "bachelors",
  gender: "",
};

export default function LecturerManagement() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 12,
  });
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    dept: "",
    degree: "",
    status: "",
    gender: "",
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [departments, setDepartments] = useState([]);
  const [specChoice, setSpecChoice] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  /* ── Fetch ── */
  const fetchLecturers = useCallback(
    async (page = 1, keyword = "", activeFilters = {}) => {
      setLoading(true);
      try {
        const params = { page, limit: 12 };
        if (keyword) params.name = keyword;
        if (activeFilters.dept) params.dept = activeFilters.dept;
        if (activeFilters.degree) params.degree = activeFilters.degree;
        if (activeFilters.status) params.status = activeFilters.status;
        if (activeFilters.gender) params.gender = activeFilters.gender;
        const res = await lecturerService.getAll(params);
        const d = res.data;
        setLecturers(d.data || []);
        if (d.pagination) setPagination(d.pagination);
      } catch {
        showToast("Không thể tải danh sách giảng viên", "error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  useEffect(() => {
    majorService
      .getMajors({ isActive: true, limit: 200 })
      .then((res) => {
        const list = res?.data?.data || res?.data || [];
        setDepartments(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  /* ── Avatar file handler ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Create ── */
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setSpecChoice("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowCreate(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (avatarFile) fd.append("avatar", avatarFile);
      await lecturerService.create(fd);
      showToast("Tạo giảng viên thành công");
      setShowCreate(false);
      fetchLecturers(1, search, filters);
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Tạo giảng viên thất bại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Edit ── */
  const openEdit = (lec) => {
    setSelected(lec);
    setFormData({
      teacherCode: lec.teacherCode || "",
      fullName: lec.fullName || "",
      email: lec.email || "",
      department: lec.department || "",
      phone: lec.phone || "",
      specialization: lec.specialization || "",
      degree: lec.degree || "bachelors",
      gender: lec.gender || "",
      isActive: lec.isActive,
    });
    setAvatarFile(null);
    setAvatarPreview(lec.avatarUrl || null);
    setSpecChoice(
      SPEC_PRESETS.includes(lec.specialization)
        ? lec.specialization || ""
        : lec.specialization
          ? "__other__"
          : "",
    );
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      const { teacherCode: _tc, email: _em, ...editableFields } = formData; // teacherCode + email not editable
      Object.entries(editableFields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      if (avatarFile) fd.append("avatar", avatarFile);
      await lecturerService.update(selected._id, fd);
      showToast("Cập nhật giảng viên thành công");
      setShowEdit(false);
      fetchLecturers(pagination.page, search, filters);
    } catch (err) {
      showToast(err?.response?.data?.message || "Cập nhật thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Toggle status ── */
  const handleToggle = async (lec) => {
    try {
      await lecturerService.toggleStatus(lec._id, !lec.isActive);
      showToast(
        lec.isActive ? "Đã vô hiệu hóa giảng viên" : "Đã kích hoạt giảng viên",
      );
      fetchLecturers(pagination.page, search, filters);
    } catch {
      showToast("Cập nhật trạng thái thất bại", "error");
    }
  };

  /* ── Delete ── */
  const openDelete = (lec) => {
    setSelected(lec);
    setShowDelete(true);
  };
  const confirmDelete = async () => {
    setSubmitting(true);
    try {
      await lecturerService.remove(selected._id);
      showToast("Đã xoá giảng viên (vô hiệu hóa)");
      setShowDelete(false);
      fetchLecturers(pagination.page, search, filters);
    } catch (err) {
      showToast(err?.response?.data?.message || "Xóa thất bại", "error");
      setShowDelete(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    fetchLecturers(1, search, newFilters);
    setShowFilter(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

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
            <UserCog className="text-indigo-600" size={26} />
            Quản lý Giảng viên
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng cộng {pagination.total} giảng viên
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Thêm giảng viên
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLecturers(1, search, filters);
            }}
            className="flex flex-1 gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, mã giảng viên..."
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
          <button
            onClick={() => setShowFilter(true)}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm border rounded-xl transition-colors
              ${activeFilterCount > 0 ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <Filter size={15} />
            Lọc
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-3" />
          Đang tải...
        </div>
      ) : lecturers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <UserCog size={40} className="mb-3 opacity-40" />
          <p>Không có giảng viên nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lecturers.map((lec) => (
            <div
              key={lec._id}
              className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3
              ${!lec.isActive ? "opacity-60" : ""}`}
            >
              {/* Top: avatar + status toggle */}
              <div className="flex items-start justify-between">
                <Avatar src={lec.avatarUrl} name={lec.fullName} />
                <Toggle
                  checked={lec.isActive}
                  onChange={() => handleToggle(lec)}
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                  {lec.fullName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lec.teacherCode}
                </p>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {lec.email}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {lec.department}
                  </span>
                  {lec.degree && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {DEGREE_LABELS[lec.degree] || lec.degree}
                    </span>
                  )}
                </div>
                {lec.specialization && (
                  <div className="mt-1.5">
                    <SpecializationBadge value={lec.specialization} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => openEdit(lec)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={13} />
                  Sửa
                </button>
                <button
                  onClick={() => openDelete(lec)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-slate-500">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() =>
                fetchLecturers(pagination.page - 1, search, filters)
              }
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() =>
                fetchLecturers(pagination.page + 1, search, filters)
              }
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Filter Sidebar ── */}
      {showFilter && (
        <FilterSidebar
          filters={filters}
          onApply={applyFilters}
          onClose={() => setShowFilter(false)}
          departments={departments}
        />
      )}

      {/* ── Create / Edit Modal ── */}
      {(showCreate || showEdit) && (
        <LecturerFormModal
          title={showCreate ? "Thêm giảng viên mới" : "Chỉnh sửa thông tin"}
          formData={formData}
          onChange={handleChange}
          onSubmit={showCreate ? submitCreate : submitEdit}
          onClose={() => {
            setShowCreate(false);
            setShowEdit(false);
          }}
          submitting={submitting}
          avatarPreview={avatarPreview}
          fileInputRef={fileInputRef}
          onAvatarChange={handleAvatarChange}
          isEdit={showEdit}
          departments={departments}
          specChoice={specChoice}
          onSpecChoiceChange={(v) => {
            setSpecChoice(v);
            if (v !== "__other__")
              setFormData((p) => ({ ...p, specialization: v }));
            else setFormData((p) => ({ ...p, specialization: "" }));
          }}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {showDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              Xác nhận vô hiệu hóa
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Bạn có chắc muốn vô hiệu hóa giảng viên{" "}
              <span className="font-semibold">{selected.fullName}</span>? Tài
              khoản đăng nhập sẽ bị khóa.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Đang xử lý..." : "Vô hiệu hóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Lecturer Form Modal
───────────────────────────────────────── */
function LecturerFormModal({
  title,
  formData,
  onChange,
  onSubmit,
  onClose,
  submitting,
  avatarPreview,
  fileInputRef,
  onAvatarChange,
  isEdit,
  departments = [],
  specChoice = "",
  onSpecChoiceChange,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form
          id="lecturer-form"
          onSubmit={onSubmit}
          className="overflow-y-auto px-6 py-5"
        >
          {/* Avatar upload */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {formData.fullName
                      ? formData.fullName.split(" ").pop()[0]
                      : "GV"}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 shadow"
              >
                <Camera size={12} />
              </button>
            </div>
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-700">Ảnh đại diện</p>
              <p>JPG, PNG — tối đa 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Teacher Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mã giảng viên <span className="text-red-500">*</span>
              </label>
              <input
                name="teacherCode"
                required
                value={formData.teacherCode}
                onChange={onChange}
                disabled={isEdit}
                placeholder="VD: GV001"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                name="fullName"
                required
                value={formData.fullName}
                onChange={onChange}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={onChange}
                disabled={isEdit}
                placeholder="email@fpt.edu.vn"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                name="phone"
                value={formData.phone}
                onChange={onChange}
                placeholder="0901234567"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bộ môn <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                required
                value={formData.department}
                onChange={onChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">-- Chọn bộ môn --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.majorName}>
                    {d.majorName}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chuyên môn
              </label>
              <select
                value={specChoice}
                onChange={(e) => onSpecChoiceChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">-- Chọn chuyên môn --</option>
                {SPEC_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__other__">Khác...</option>
              </select>
              {specChoice === "__other__" && (
                <input
                  name="specialization"
                  value={formData.specialization}
                  onChange={onChange}
                  placeholder="Nhập chuyên môn..."
                  className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              )}
            </div>

            {/* Degree */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Học vị
              </label>
              <select
                name="degree"
                value={formData.degree}
                onChange={onChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="bachelors">Cử nhân</option>
                <option value="masters">Thạc sĩ</option>
                <option value="phd">Tiến sĩ</option>
                <option value="professor">Giáo sư</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={onChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">-- Không xác định --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            {/* isActive toggle (edit only) */}
            {isEdit && (
              <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">
                  Trạng thái hoạt động
                </span>
                <Toggle
                  checked={
                    formData.isActive !== false && formData.isActive !== "false"
                  }
                  onChange={(val) =>
                    onChange({ target: { name: "isActive", value: val } })
                  }
                />
                <span
                  className={`text-xs font-medium ${formData.isActive !== false ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {formData.isActive !== false
                    ? "Đang hoạt động"
                    : "Không hoạt động"}
                </span>
              </div>
            )}
          </div>

          {!isEdit && (
            <p className="mt-4 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              📌 Mật khẩu mặc định:{" "}
              <span className="font-mono font-semibold">Teacher@123</span> —
              giảng viên phải đổi khi đăng nhập lần đầu.
            </p>
          )}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="lecturer-form"
            disabled={submitting}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Filter Sidebar
───────────────────────────────────────── */
function FilterSidebar({ filters, onApply, onClose, departments = [] }) {
  const [local, setLocal] = useState({ ...filters });

  const handleChange = (e) =>
    setLocal((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleReset = () =>
    setLocal({ dept: "", degree: "", status: "", gender: "" });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-72 bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Bộ lọc nâng cao</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bộ môn
            </label>
            <select
              name="dept"
              value={local.dept}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="">Tất cả</option>
              {departments.map((d) => (
                <option key={d._id} value={d.majorName}>
                  {d.majorName}
                </option>
              ))}
            </select>
          </div>

          {/* Degree */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Học vị
            </label>
            <select
              name="degree"
              value={local.degree}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="">Tất cả</option>
              <option value="bachelors">Cử nhân</option>
              <option value="masters">Thạc sĩ</option>
              <option value="phd">Tiến sĩ</option>
              <option value="professor">Giáo sư</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Giới tính
            </label>
            <select
              name="gender"
              value={local.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="">Tất cả</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Trạng thái
            </label>
            <select
              name="status"
              value={local.status}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 py-2 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
          >
            Đặt lại
          </button>
          <button
            onClick={() => onApply(local)}
            className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
