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
  GraduationCap,
} from "lucide-react";
import classService from "../../services/classService";
import subjectService from "../../services/subjectService";
import semesterService from "../../services/semesterService";
import lecturerService from "../../services/lecturerService";
import curriculumService from "../../services/curriculumService";
import AssignScheduleModal from "../../components/features/AssignScheduleModal";
import ReassignClassModal from "../../components/features/ReassignClassModal";

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
  sourceType: "all", // "all" = all subjects, "curriculum" = from curriculum
  classCode: "",
  className: "",
  subject: "",
  teacher: "",
  semester: "",
  academicYear: "",
  maxCapacity: "",
  status: "draft",
  // Dates from semester
  startDate: "",
  endDate: "",
  // Curriculum fields
  curriculum: "",
  curriculumSemester: "",
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

function resolveMongoId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const normalized = value.trim();
    return OBJECT_ID_REGEX.test(normalized) ? normalized : "";
  }

  if (typeof value === "object") {
    const candidates = [value._id, value.id, value.subjectId, value.subject];
    for (const candidate of candidates) {
      const resolved = resolveMongoId(candidate);
      if (resolved) return resolved;
    }
  }

  return "";
}

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}/${year + 1}`;
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
  // Curriculum dropdown data
  const [curriculums, setCurriculums] = useState([]);
  const [curriculumSemesters, setCurriculumSemesters] = useState([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  // Institutional semesters (Kỳ TV)
  const [institutionalSemesters, setInstitutionalSemesters] = useState([]);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [assigningLecturerClassId, setAssigningLecturerClassId] = useState(null);
  const [lecturerSelections, setLecturerSelections] = useState({});
  const [conflictWarning, setConflictWarning] = useState(null);
  const [conflictData, setConflictData] = useState(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState(null);

  // Reassign class modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedClassForReassign, setSelectedClassForReassign] = useState(null);

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
        setLecturerSelections(
          Object.fromEntries(
            (d.data || []).map((cls) => [
              cls._id,
              String(cls.teacher?._id || cls.teacher || ""),
            ]),
          ),
        );
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
    // Fetch curriculums for create form
    curriculumService.getCurriculums({ limit: 100 })
      .then(r => setCurriculums(r.data.data || []))
      .catch(() => {});
  }, [fetchClasses]);

  // Fetch curriculum semesters when curriculum changes in create form
  useEffect(() => {
    if (!showCreate || !formData.curriculum) {
      setCurriculumSemesters([]);
      setCurriculumSubjects([]);
      return;
    }

    const selectedCur = curriculums.find(c => c._id === formData.curriculum);
    if (selectedCur?.semesters && selectedCur.semesters.length > 0) {
      setCurriculumSemesters(selectedCur.semesters);
    } else {
      curriculumService.getSemesters(formData.curriculum)
        .then(r => setCurriculumSemesters(r?.data?.data || []))
        .catch(() => setCurriculumSemesters([]));
    }
  }, [showCreate, formData.curriculum, curriculums]);

  // Fetch subjects when curriculum semester changes
  useEffect(() => {
    if (!showCreate || !formData.curriculum || !formData.curriculumSemester) {
      setCurriculumSubjects([]);
      return;
    }

    const semesterData = curriculumSemesters.find(s => s._id === formData.curriculumSemester);

    // Always use API to get subjects with populated subject data
    // Use semesterOrder if available, otherwise use id, otherwise use semester (number)
    const semesterParam = semesterData?.semesterOrder || semesterData?.id || semesterData?.semester || formData.curriculumSemester;
    curriculumService.getSubjectsBySemester(formData.curriculum, semesterParam)
      .then(r => {
        if (r?.data?.data?.length > 0) {
        }
        setCurriculumSubjects(r?.data?.data || [])
      })
      .catch(() => setCurriculumSubjects([]));
  }, [showCreate, formData.curriculum, formData.curriculumSemester, curriculumSemesters]);

  // Fetch institutional semesters (Kỳ TV) when sourceType = "all"
  useEffect(() => {
    if (!showCreate || formData.sourceType !== "all") {
      setInstitutionalSemesters([]);
      return;
    }

    semesterService.getAll({ limit: 100 })
      .then(r => {
        setInstitutionalSemesters(r.data.data || []);
      })
      .catch(() => setInstitutionalSemesters([]));
  }, [showCreate, formData.sourceType]);

  // Auto-fill semester and academicYear when curriculum semester is selected
  useEffect(() => {
    if (!showCreate || formData.sourceType !== "curriculum" || !formData.curriculumSemester) return;

    const selectedCur = curriculums.find(c => c._id === formData.curriculum);
    if (selectedCur?.academicYear) {
      setFormData(p => ({ ...p, academicYear: selectedCur.academicYear }));
    }

    // Find semester number from curriculumSemesters array
    const selectedSem = curriculumSemesters.find(s => s._id === formData.curriculumSemester);
    const semesterNum = selectedSem?.semesterOrder || selectedSem?.semester || 1;
    setFormData(p => ({ ...p, semester: semesterNum }));
  }, [showCreate, formData.curriculumSemester, formData.sourceType, curriculums, curriculumSemesters]);

  // Auto-fill academicYear, startDate, endDate when institutional semester is selected
  useEffect(() => {
    if (!showCreate || formData.sourceType !== "all" || !formData.semester) return;

    // Find the selected institutional semester to get academicYear and dates
    const selectedSem = institutionalSemesters.find(s => s.semesterNum == formData.semester);
    if (selectedSem) {
      const updates = { academicYear: selectedSem.academicYear || "" };
      
      // Auto-fill dates from semester if available
      if (selectedSem.startDate) {
        updates.startDate = selectedSem.startDate.split('T')[0]; // Format YYYY-MM-DD
      }
      if (selectedSem.endDate) {
        updates.endDate = selectedSem.endDate.split('T')[0]; // Format YYYY-MM-DD
      }
      
      setFormData(p => ({ ...p, ...updates }));
    }
  }, [showCreate, formData.semester, formData.sourceType, institutionalSemesters]);

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
    setFormData({ ...EMPTY_FORM, academicYear: getCurrentAcademicYear() });
    setConflictWarning(null);
    setConflictData(null);
    setCurriculumSemesters([]);
    setCurriculumSubjects([]);
    setShowCreate(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ưu tiên giữ subject hiện tại nếu resolve được, nhưng không chặn việc đổi status chỉ vì subject cũ bị thiếu.
      const subjectId = resolveMongoId(formData.subject);
      if (!subjectId) {
        showToast("Vui lòng chọn môn học hợp lệ", "error");
        setSubmitting(false);
        return;
      }
      
      await classService.createClass({
        classCode: formData.classCode,
        className: formData.className,
        subject: subjectId,
        teacher: formData.teacher,
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        maxCapacity: Number(formData.maxCapacity),
        status: formData.status,
        // Dates from semester
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      });
      showToast("Tạo lớp học thành công");
      setShowCreate(false);
      fetchClasses(1, search, statusFilter);
    } catch (err) {
      console.log("Create class error:", err?.response?.data);
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
      sourceType: "all", // Edit always uses "all subjects" mode
      classCode: cls.classCode,
      className: cls.className,
      subject: resolveMongoId(cls.subject),
      subjectCode: cls.subject?.subjectCode || "",
      subjectName: cls.subject?.subjectName || "",
      teacher: cls.teacher?._id || cls.teacher || "",
      semester: cls.semester || "",
      academicYear: cls.academicYear || "",
      maxCapacity: cls.maxCapacity || "",
      status: cls.status || "draft",
      curriculum: "",
      curriculumSemester: "",
    });
    setCurriculumSemesters([]);
    setCurriculumSubjects([]);
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Khi edit, ưu tiên dùng subject hiện tại nếu resolve được; không chặn đổi status nếu subject cũ đang bị rỗng.
      const subjectId = resolveMongoId(formData.subject) || resolveMongoId(selected?.subject);
      if (!subjectId && formData.subject) {
        showToast("Vui lòng chọn môn học hợp lệ", "error");
        setSubmitting(false);
        return;
      }

      const payload = {
        className: formData.className,
        teacher: formData.teacher,
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        maxCapacity: Number(formData.maxCapacity),
        status: formData.status,
      };
      if (subjectId) {
        payload.subject = subjectId;
      }
      await classService.updateClass(selected._id, payload);
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
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Khi đổi môn học thì reset giảng viên để tránh giữ GV không phù hợp
      if (name === "subject") {
        next.teacher = "";
      }
      return next;
    });
  };

  const handleLecturerSelect = (classId, lecturerId) => {
    setLecturerSelections((prev) => ({ ...prev, [classId]: lecturerId }));
  };

  const handleAssignLecturer = async (cls) => {
    const lecturerId = lecturerSelections[cls._id];
    if (!lecturerId) {
      showToast("Vui lòng chọn giảng viên", "error");
      return;
    }

    setAssigningLecturerClassId(cls._id);
    try {
      await classService.assignLecturer(cls._id, lecturerId);
      showToast("Phân công giảng viên thành công");
      fetchClasses(pagination.page, search, statusFilter);
    } catch (err) {
      showToast(err?.response?.data?.message || "Phân công giảng viên thất bại", "error");
    } finally {
      setAssigningLecturerClassId(null);
    }
  };

  // Handle subject selection from curriculum - auto-fill className
  const handleCurriculumSubjectChange = (subjectId) => {
    const subject = curriculumSubjects.find(s => 
      (s.subject?._id || s.subjectId || s.subject) === subjectId
    );
    
    const subjectName = subject?.subject?.subjectName || subject?.subjectName || subject?.name || "";
    const subjectCode = subject?.subject?.subjectCode || subject?.subjectCode || subject?.code || "";
    
    setFormData(p => ({
      ...p,
      subject: subjectId,
      className: subjectName,
      classCode: subjectCode ? `${subjectCode}-${p.academicYear?.replace("/", "") || "00"}-${p.semester || "1"}-${Date.now().toString(36).toUpperCase()}` : ""
    }));
  };

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
                    <td className="px-4 py-3 text-slate-600 min-w-[250px]">
                      <div className="space-y-1">
                        <select
                          value={lecturerSelections[cls._id] || ""}
                          onChange={(e) => handleLecturerSelect(cls._id, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="">Chọn giảng viên</option>
                          {teachers.map((t) => (
                            <option key={t._id} value={t._id}>
                              {(t.teacherCode || "GV")} - {(t.fullName || "Chưa có tên")}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignLecturer(cls)}
                          disabled={!lecturerSelections[cls._id] || assigningLecturerClassId === cls._id}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:bg-slate-400"
                        >
                          <GraduationCap size={12} />
                          {assigningLecturerClassId === cls._id ? "Đang lưu..." : "Lưu GV"}
                        </button>
                      </div>
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
                        {cls.currentEnrollment > 0 && (cls.status === "published" || cls.status === "scheduled" || cls.status === "active") && (
                          <button
                            onClick={() => {
                              setSelectedClassForReassign(cls);
                              setShowReassignModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chuyển lớp"
                          >
                            <Users size={15} />
                          </button>
                        )}
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
          curriculums={curriculums}
          curriculumSemesters={curriculumSemesters}
          curriculumSubjects={curriculumSubjects}
          institutionalSemesters={institutionalSemesters}
          handleCurriculumSubjectChange={handleCurriculumSubjectChange}
          isEdit={showEdit}
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

      {/* ── Reassign Class Modal ── */}
      {showReassignModal && selectedClassForReassign && (
        <ReassignClassModal
          sourceClass={selectedClassForReassign}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedClassForReassign(null);
          }}
          onSuccess={() => {
            // Refresh class list after successful reassign
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
  // Curriculum props
  curriculums = [],
  curriculumSemesters = [],
  curriculumSubjects = [],
  institutionalSemesters = [],
  handleCurriculumSubjectChange,
  isEdit = false,
}) {
  const isCreate = title.toLowerCase().includes("mới");
  
  // Lọc danh sách giảng viên theo môn học đã chọn
  let teacherOptions = teachers || [];
  if (Array.isArray(subjects) && formData.subject) {
    const subjectDoc = subjects.find(
      (s) => String(s._id) === String(formData.subject),
    );
    if (subjectDoc && Array.isArray(subjectDoc.teachers) && subjectDoc.teachers.length > 0) {
      const allowedIds = new Set(
        subjectDoc.teachers.map((t) => String(t._id || t.id)),
      );
      teacherOptions = teacherOptions.filter((t) =>
        allowedIds.has(String(t._id)),
      );
      // Đảm bảo vẫn hiển thị giảng viên hiện đang được chọn (kể cả khi không nằm trong danh sách được gán)
      if (
        formData.teacher &&
        !teacherOptions.some((t) => String(t._id) === String(formData.teacher))
      ) {
        const current = teachers.find(
          (t) => String(t._id) === String(formData.teacher),
        );
        if (current) {
          teacherOptions = [...teacherOptions, current];
        }
      }
    }
  }

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
          {/* Nguồn môn học - chỉ hiển thị khi tạo mới */}
          {isCreate && (
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nguồn môn học <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="all"
                    checked={formData.sourceType === "all"}
                    onChange={onChange}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Tất cả môn học</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="curriculum"
                    checked={formData.sourceType === "curriculum"}
                    onChange={onChange}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Từ khung CT</span>
                </label>
              </div>
            </div>
          )}

          {/* Khung chương trình - chỉ hiển thị khi tạo mới và chọn nguồn từ CT */}
          {isCreate && formData.sourceType === "curriculum" && (
            <>
              <div className="col-span-1 sm:col-span-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Khung chương trình <span className="text-red-500">*</span>
                </label>
                <select
                  name="curriculum"
                  value={formData.curriculum}
                  onChange={onChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white mb-3"
                >
                  <option value="">-- Chọn khung chương trình --</option>
                  {curriculums.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>

                {formData.curriculum && (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Học kỳ trong CT <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="curriculumSemester"
                      value={formData.curriculumSemester}
                      onChange={onChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white mb-3"
                    >
                      <option value="">-- Chọn học kỳ --</option>
                      {curriculumSemesters.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.name || `Học kỳ ${s.semesterOrder}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {formData.curriculum && formData.curriculumSemester && (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Môn học <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => handleCurriculumSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {curriculumSubjects.map((s, idx) => {
                        // Ưu tiên lấy _id từ subject object, sau đó subjectId, cuối cùng mới là subject (có thể là string)
                        const subjectId = (s.subject && typeof s.subject === 'object' && s.subject._id) 
                          ? s.subject._id 
                          : (s.subjectId || s._id || s.id || "");
                        const subjectCode = s.subject?.subjectCode || s.subjectCode || s.code || "";
                        const subjectName = s.subject?.subjectName || s.subjectName || s.name || "";
                        return (
                          <option key={idx} value={subjectId}>
                            {subjectCode} — {subjectName}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {curriculumSubjects.length} môn học trong học kỳ này
                    </p>
                  </>
                )}
              </div>
            </>
          )}

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

          {/* Học kỳ - chỉ hiển thị khi chọn "Tất cả môn học" */}
          {isCreate && formData.sourceType === "all" && (
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
                {institutionalSemesters.map((s) => (
                  <option key={s._id} value={s.semesterNum}>
                    {s.name} ({s.academicYear})
                    {s.startDate && s.endDate && ` | ${new Date(s.startDate).toLocaleDateString('vi-VN')} → ${new Date(s.endDate).toLocaleDateString('vi-VN')}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Môn học - chỉ hiển thị khi chọn "Tất cả môn học" */}
          {isCreate && formData.sourceType === "all" && (
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
          )}

          {/* Hiển thị thông tin môn học đã chọn từ CT */}
          {isCreate && formData.sourceType === "curriculum" && formData.subject && (
            <div className="col-span-1 sm:col-span-2 p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 font-medium">✓ Đã chọn môn học</p>
              <p className="text-sm text-green-600">ID: {formData.subject}</p>
            </div>
          )}

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
              {teacherOptions.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.teacherCode} — {t.fullName}
                </option>
              ))}
            </select>
            {formData.subject && (
              <p className="mt-1 text-xs text-slate-500">
                Chỉ hiển thị các giảng viên đã được gán vào môn học này (nếu có).
              </p>
            )}
          </div>

          {/* Học kỳ - chỉ hiển thị khi chọn "Từ khung CT" (không hiển thị khi "Tất cả môn học") */}
          {isCreate && formData.sourceType !== "all" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Học kỳ <span className="text-red-500">*</span>
            </label>
            <select
              name="semester"
              required
              value={formData.semester}
              onChange={onChange}
              disabled={isCreate && formData.sourceType === "curriculum"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none bg-white disabled:bg-slate-100"
            >
              <option value="">-- Chọn học kỳ --</option>
              {formData.sourceType === "curriculum" ? (
                curriculumSemesters.map(s => (
                  <option key={s.id || s.semesterOrder || s._id} value={s.id || s.semesterOrder || s.semester}>
                    {s.name || `Học kỳ ${s.id || s.semesterOrder || s.semester}`}
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Học kỳ 1</option>
                  <option value="2">Học kỳ 2</option>
                  <option value="3">Học kỳ 3 (hè)</option>
                </>
              )}
            </select>
            {isCreate && formData.sourceType === "curriculum" && (
              <p className="text-xs text-slate-500 mt-1">Được tự động điền từ học kỳ trong CT</p>
            )}
          </div>
          )}

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
              disabled={isCreate && formData.sourceType === "curriculum"}
              placeholder="VD: 2024-2025"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none disabled:bg-slate-100"
            />
            {isCreate && formData.sourceType === "curriculum" && (
              <p className="text-xs text-slate-500 mt-1">Được tự động điền từ khung CT</p>
            )}
          </div>

          {/* Ngày bắt đầu - chỉ hiển thị khi chọn "Tất cả môn học" */}
          {isCreate && formData.sourceType === "all" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày bắt đầu học phần
              </label>
              <input
                name="startDate"
                type="date"
                value={formData.startDate}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Được tự động điền từ Kỳ học</p>
            </div>
          )}

          {/* Ngày kết thúc - chỉ hiển thị khi chọn "Tất cả môn học" */}
          {isCreate && formData.sourceType === "all" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày kết thúc học phần
              </label>
              <input
                name="endDate"
                type="date"
                value={formData.endDate}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Được tự động điền từ Kỳ học</p>
            </div>
          )}

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

          {/* Trạng thái - chỉ hiển thị khi edit */}
          {isEdit && (
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
          )}
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
