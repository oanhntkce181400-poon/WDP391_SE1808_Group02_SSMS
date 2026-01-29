import { useState, useEffect, useCallback, useMemo } from "react";
import SubjectList from "../../components/features/SubjectList";
import SubjectModal from "../../components/features/SubjectModal";
import SubjectDeleteModal from "../../components/features/SubjectDeleteModal";
import SubjectDetail from "../../components/features/SubjectDetail";
import SubjectFilterModal from "../../components/features/SubjectFilterModal";
import subjectService from "../../services/subjectService";
import majorService from "../../services/majorService";
import nextIcon from "../../assets/next.png";
import addIcon from "../../assets/circle.png";

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // const majorCodeToName = new Map([
  //   ['SE', 'Software Engineering'],
  //   ['CA', 'Computer Architecture'], 
  //   ['CA', 'Computer Architecture'],
  //   ['BA', 'Business Administration'],
  //   ['CE', 'Computer Engineering'],
  // ]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    currentStart: 0,
    currentEnd: 0,
    limit: 10,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(null);

  const [activeFilters, setActiveFilters] = useState({});
  const [searchKeyword, setSearchKeyword] = useState("");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const majorCodeToName = useMemo(() => {
    const map = new Map();
    majors.forEach((major) => {
      if (major.majorCode && major.majorName) {
        map.set(major.majorCode, major.majorName);
      }
    });
    return map;
  }, [majors]);

  const fetchSubjects = useCallback(
    async (page = 1, keyword = "", filters = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await subjectService.getSubjects({
          page,
          limit: pagination.limit,
          keyword,
          ...filters,
        });

        const { data, total, page: currentPage, totalPages } = response.data;

        let transformedData = (data || []).map((item) => ({
          _id: item._id,
          id: item._id,
          code: item.subjectCode,
          name: item.subjectName,
          credits: item.credits,
          tuitionFee: item.tuitionFee || item.credits * 630000,
          department: item.majorCodes || item.majorCode || [],
          isCommon: item.isCommon || false,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        if (Object.keys(filters).length > 0) {
          transformedData = applyFilters(transformedData, filters);
        }

        setSubjects(transformedData);
        setPagination((prev) => ({
          ...prev,
          currentPage,
          totalPages,
          totalItems: transformedData.length || total,
          currentStart: (currentPage - 1) * prev.limit + 1,
          currentEnd: Math.min(
            currentPage * prev.limit,
            transformedData.length || total,
          ),
        }));
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setError("Không thể tải danh sách môn học. Vui lòng thử lại sau.");

        setSubjects([
          {
            _id: "1",
            code: "CS101",
            name: "Lập trình cơ bản",
            credits: 3,
            department: "Khoa CNTT",
          },
          {
            _id: "2",
            code: "CS102",
            name: "Cấu trúc dữ liệu và Giải thuật",
            credits: 4,
            department: "Khoa CNTT",
          },
          {
            _id: "3",
            code: "MATH201",
            name: "Giải tích I",
            credits: 3,
            department: "Khoa Cơ bản",
          },
        ]);
        setPagination((prev) => ({
          ...prev,
          currentPage: 1,
          totalPages: 5,
          totalItems: 42,
          currentStart: 1,
          currentEnd: 3,
        }));
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit],
  );

  const fetchMajors = useCallback(async () => {
    try {
      const response = await majorService.getMajors({});
      if (response?.data?.success && response.data.data) {
        setMajors(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching majors:", err);
    }
  }, []);

  // Apply filters to data
  const applyFilters = (data, filters) => {
    let filtered = [...data];

    // Filter by credits
    if (filters.credits) {
      filtered = filtered.filter(
        (subject) => subject.credits === parseInt(filters.credits),
      );
    }

    // Filter by code prefix
    if (filters.codePrefix) {
      filtered = filtered.filter((subject) =>
        subject.code.toUpperCase().startsWith(filters.codePrefix.toUpperCase()),
      );
    }

    // Filter by department
    if (filters.department) {
      filtered = filtered.filter((subject) => {
        const dept = Array.isArray(subject.department)
          ? subject.department
          : [subject.department];
        return dept.some((d) => d && d.includes(filters.department));
      });
    }

    // Filter by isCommon status
    if (filters.isCommon !== "" && filters.isCommon !== undefined) {
      const isCommonBool =
        filters.isCommon === "true" || filters.isCommon === true;
      filtered = filtered.filter(
        (subject) => subject.isCommon === isCommonBool,
      );
    }

    return filtered;
  };

  // Initial fetch
  useEffect(() => {
    fetchMajors();
    fetchSubjects(1, searchKeyword, activeFilters);
  }, []);

  // Refetch when filters or search change
  useEffect(() => {
    if (searchKeyword || Object.keys(activeFilters).length > 0) {
      fetchSubjects(1, searchKeyword, activeFilters);
    }
  }, [searchKeyword, activeFilters]);

  // Handle search
  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
    fetchSubjects(1, keyword, activeFilters);
  };

  // Handle filter modal open
  const handleFilterOpen = () => {
    setIsFilterModalOpen(true);
  };

  // Handle filter apply
  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    fetchSubjects(1, searchKeyword, filters);

    // Show toast with filter count
    const filterCount = Object.keys(filters).length;
    if (filterCount > 0) {
      showToast(`Đã áp dụng ${filterCount} bộ lọc`, "success");
    } else {
      showToast("Đã xóa tất cả bộ lọc", "info");
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchSubjects(page, searchKeyword, activeFilters);
  };

  // Handle create new subject
  const handleCreate = () => {
    setSelectedSubject(null);
    setIsModalOpen(true);
  };

  // Handle edit subject
  const handleEdit = (subject) => {
    // Transform backend fields to frontend fields
    const transformedSubject = {
      _id: subject._id || subject.id,
      id: subject._id || subject.id,
      code: subject.code || subject.subjectCode,
      name: subject.name || subject.subjectName,
      credits: subject.credits,
      department:
        subject.department || subject.majorCodes || subject.majorCode || [],
      isCommon: subject.isCommon || false,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
    setSelectedSubject(transformedSubject);
    setIsModalOpen(true);
  };

  // Handle delete subject
  const handleDelete = (subject) => {
    const transformedSubject = {
      _id: subject._id || subject.id,
      code: subject.code || subject.subjectCode,
      name: subject.name || subject.subjectName,
      credits: subject.credits,
    };
    setSelectedSubject(transformedSubject);
    setIsDeleteModalOpen(true);
  };

  // Handle view subject detail
  const handleView = (subject) => {
    const transformedSubject = {
      _id: subject._id || subject.id,
      id: subject._id || subject.id,
      code: subject.code || subject.subjectCode,
      name: subject.name || subject.subjectName,
      credits: subject.credits,
      department: subject.department || subject.majorCode,
      isCommon: subject.isCommon || false,
      description: subject.description,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
    setSelectedSubject(transformedSubject);
    setIsDetailModalOpen(true);
  };

  // Handle prerequisites
  const handlePrerequisites = (subject) => {
    // Navigate to prerequisites page - you can use window.location or react-router
    const transformedSubject = {
      _id: subject._id || subject.id,
      id: subject._id || subject.id,
      code: subject.code || subject.subjectCode,
      name: subject.name || subject.subjectName,
      credits: subject.credits,
      department: subject.department || subject.majorCode,
    };
    setSelectedSubject(transformedSubject);
    // Redirect to prerequisites page with subject ID
    window.location.href = `/admin/prerequisites/${transformedSubject._id || transformedSubject.id}`;
  };

  // Handle submit form (create/update)
  const handleSubmitForm = async (formData) => {
    setModalLoading(true);
    try {
      // Transform frontend fields to backend fields
      const backendData = {
        code: formData.code,
        name: formData.name,
        credits: formData.credits,
        department: formData.department,
        isCommon: formData.isCommon || false, // Môn chung cho toàn khoa
      };

      if (selectedSubject) {
        // Update existing subject
        await subjectService.updateSubject(selectedSubject._id, backendData);
        showToast("Cập nhật môn học thành công!", "success");
      } else {
        // Create new subject
        await subjectService.createSubject(backendData);
        showToast("Tạo môn học mới thành công!", "success");
      }
      setIsModalOpen(false);
      fetchSubjects(pagination.currentPage);
    } catch (err) {
      console.error("Error saving subject:", err);
      showToast(
        selectedSubject ? "Cập nhật thất bại!" : "Tạo mới thất bại!",
        "error",
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedSubject) return;

    setModalLoading(true);
    try {
      await subjectService.deleteSubject(selectedSubject._id);
      showToast("Xóa môn học thành công!", "success");
      setIsDeleteModalOpen(false);
      fetchSubjects(pagination.currentPage);
    } catch (err) {
      console.error("Error deleting subject:", err);
      showToast("Xóa thất bại!", "error");
    } finally {
      setModalLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-[1280px] px-6 gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <a
              className="hover:text-[#1A237E] dark:hover:text-white transition-colors"
              href="#"
            >
              Dashboard
            </a>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">
              Môn học
            </span>
          </div>

          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Môn học
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                Cập nhật danh mục môn học, số tín chỉ và cấu trúc khung chương
                trình đào tạo.
              </p>
            </div>
            <button
              className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-11 px-6 bg-[#1A237E] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#0D147A] transition-all shadow-sm"
              onClick={handleCreate}
            >
              <img src={addIcon} alt="Thêm" className="w-5 h-5" />
              <span>Tạo môn học mới</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">
                  error
                </span>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
                <button
                  className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
                  onClick={() => setError(null)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Filters Badge */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Đang lọc: {Object.keys(activeFilters).length} tiêu chí
              </span>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {activeFilters.credits && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                    Tín chỉ: {activeFilters.credits}
                  </span>
                )}
                {activeFilters.codePrefix && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                    Mã: {activeFilters.codePrefix}*
                  </span>
                )}
                {activeFilters.department && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                    Khoa: {activeFilters.department}
                  </span>
                )}
                {activeFilters.isCommon !== undefined &&
                  activeFilters.isCommon !== "" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                      {activeFilters.isCommon === "true" ||
                      activeFilters.isCommon === true
                        ? "Môn chung"
                        : "Môn chuyên ngành"}
                    </span>
                  )}
              </div>
              <button
                className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
                onClick={() => handleFilterApply({})}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Subject List Component */}
          <SubjectList
            subjects={subjects}
            loading={loading}
            pagination={pagination}
            onSearch={handleSearch}
            onFilter={handleFilterOpen}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPrerequisites={handlePrerequisites}
            onPageChange={handlePageChange}
            majorCodeToName={majorCodeToName}
          />
        </div>
      </main>

      {/* Create/Edit Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        subject={selectedSubject}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <SubjectDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        subject={selectedSubject}
        loading={modalLoading}
      />

      {/* Subject Detail Modal */}
      <SubjectDetail
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        subject={selectedSubject}
      />

      {/* Filter Modal */}
      <SubjectFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleFilterApply}
        currentFilters={activeFilters}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          <span className="material-symbols-outlined">
            {toast.type === "success"
              ? "check_circle"
              : toast.type === "error"
                ? "error"
                : "info"}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            className="ml-2 text-white/80 hover:text-white"
            onClick={() =>
              setToast({ show: false, message: "", type: "success" })
            }
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
