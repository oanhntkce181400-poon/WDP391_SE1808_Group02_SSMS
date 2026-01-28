// Subject Management Page - Main page for Subject CRUD operations (Tasks #XX)
// Features: Create, Read, Update, Delete, Search, Filter, Pagination, Export
import { useState, useEffect, useCallback } from 'react';
import SubjectList from '../../components/features/SubjectList';
import SubjectModal from '../../components/features/SubjectModal';
import SubjectDeleteModal from '../../components/features/SubjectDeleteModal';
import SubjectDetail from '../../components/features/SubjectDetail';
import subjectService from '../../services/subjectService';
import majorService from '../../services/majorService';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function SubjectManagement() {
  // State for subjects data
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    currentStart: 0,
    currentEnd: 0,
    limit: 10,
  });

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // State for selected subject
  const [selectedSubject, setSelectedSubject] = useState(null);

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State for majors mapping
  const [majors, setMajors] = useState([]);
  const majorCodeToName = new Map(
    (majors || []).map((m) => [String(m.majorCode || '').trim(), String(m.majorName || '').trim()])
  );

  // Fetch majors for mapping
  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const res = await majorService.getMajors({ isActive: true });
        setMajors(res.data?.data || []);
      } catch (e) {
        console.error('Error fetching majors:', e);
        setMajors([]);
      }
    };
    fetchMajors();
  }, []);

  // Fetch subjects from API
  const fetchSubjects = useCallback(async (page = 1, keyword = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await subjectService.getSubjects({
        page,
        limit: pagination.limit,
        keyword,
      });

      const { data, total, page: currentPage, totalPages } = response.data;

      // Transform data to match frontend field names
      const transformedData = (data || []).map((item) => ({
        _id: item._id,
        id: item._id,
        code: item.subjectCode,
        name: item.subjectName,
        credits: item.credits,
        department: item.majorCodes || item.majorCode || [],
        isCommon: item.isCommon || false,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setSubjects(transformedData);
      setPagination((prev) => ({
        ...prev,
        currentPage,
        totalPages,
        totalItems: total,
        currentStart: (currentPage - 1) * prev.limit + 1,
        currentEnd: Math.min(currentPage * prev.limit, total),
      }));
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Không thể tải danh sách môn học. Vui lòng thử lại sau.');

      // Mock data for development
      setSubjects([
        { _id: '1', code: 'CS101', name: 'Lập trình cơ bản', credits: 3, department: 'Khoa CNTT' },
        { _id: '2', code: 'CS102', name: 'Cấu trúc dữ liệu và Giải thuật', credits: 4, department: 'Khoa CNTT' },
        { _id: '3', code: 'MATH201', name: 'Giải tích I', credits: 3, department: 'Khoa Cơ bản' },
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
  }, [pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Handle search
  const handleSearch = (keyword) => {
    fetchSubjects(1, keyword);
  };

  // Handle filter (placeholder - implement based on requirements)
  const handleFilter = () => {
    showToast('Chức năng lọc đang được phát triển', 'info');
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchSubjects(page);
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
      department: subject.department || subject.majorCodes || subject.majorCode || [],
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

      console.log('Submitting subject data:', backendData);
      console.log('Department field:', backendData.department);

      if (selectedSubject) {
        // Update existing subject
        const response = await subjectService.updateSubject(selectedSubject._id, backendData);
        console.log('Update response:', response.data);
        showToast('Cập nhật môn học thành công!', 'success');
      } else {
        // Create new subject
        const response = await subjectService.createSubject(backendData);
        console.log('Create response:', response.data);
        showToast('Tạo môn học mới thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchSubjects(pagination.currentPage);
    } catch (err) {
      console.error('Error saving subject:', err);
      console.error('Error response:', err.response?.data);
      showToast(selectedSubject ? 'Cập nhật thất bại!' : 'Tạo mới thất bại!', 'error');
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
      showToast('Xóa môn học thành công!', 'success');
      setIsDeleteModalOpen(false);
      fetchSubjects(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting subject:', err);
      showToast('Xóa thất bại!', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-[1280px] px-6 gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <a className="hover:text-[#1A237E] dark:hover:text-white transition-colors" href="#">
              Dashboard
            </a>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">Môn học</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Môn học
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                Cập nhật danh mục môn học, số tín chỉ và cấu trúc khung chương trình đào tạo.
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
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                <button
                  className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
                  onClick={() => setError(null)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Subject List Component */}
          <SubjectList
            subjects={subjects}
            loading={loading}
            pagination={pagination}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
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

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            className="ml-2 text-white/80 hover:text-white"
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

