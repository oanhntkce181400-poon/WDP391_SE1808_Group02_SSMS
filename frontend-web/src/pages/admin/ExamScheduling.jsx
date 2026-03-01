// Exam Scheduling Page - Manage exam scheduling (Academic Admin)
// Features: Create, Read, Update, Delete exams with filtering by Subject, ExamDate, Room
import { useState, useEffect, useCallback } from 'react';
import examService from '../../services/examService';
import ExamModal from '../../components/features/ExamModal';
import ExamDeleteModal from '../../components/features/ExamDeleteModal';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function ExamScheduling() {
  // State for exams data
  const [exams, setExams] = useState([]);
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
  const [modalLoading, setModalLoading] = useState(false);

  // State for selected exam
  const [selectedExam, setSelectedExam] = useState(null);

  // State for conflict warnings
  const [conflictData, setConflictData] = useState({
    roomConflict: null,
    studentConflict: null,
  });

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    subject: '',
    room: '',
    examDate: '',
    startDate: '',
    endDate: '',
    status: '',
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch exams from API
  const fetchExams = useCallback(async (page = 1, keyword = '', filterParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await examService.getAllExams({
        page,
        limit: pagination.limit,
        keyword,
        ...filterParams,
      });

      const { data, total, page: currentPage, totalPages } = response.data;

      setExams(data || []);
      setPagination((prev) => ({
        ...prev,
        currentPage,
        totalPages,
        totalItems: total,
        currentStart: (currentPage - 1) * prev.limit + 1,
        currentEnd: Math.min(currentPage * prev.limit, total),
      }));
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('Không thể tải danh sách lịch thi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchExams(1, searchQuery, filters);
  };

  // Handle filter change
  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    fetchExams(1, searchQuery, newFilters);
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchExams(page, searchQuery, filters);
  };

  // Handle create new exam
  const handleCreate = () => {
    setSelectedExam(null);
    setConflictData({ roomConflict: null, studentConflict: null }); // Clear conflicts
    setIsModalOpen(true);
  };

  // Handle edit exam
  const handleEdit = (exam) => {
    setSelectedExam(exam);
    setConflictData({ roomConflict: null, studentConflict: null }); // Clear conflicts
    setIsModalOpen(true);
  };

  // Handle delete exam
  const handleDelete = (exam) => {
    setSelectedExam(exam);
    setIsDeleteModalOpen(true);
  };

  // Handle submit form (create/update)
  const handleSubmitForm = async (formData) => {
    setModalLoading(true);
    try {
      if (selectedExam) {
        // Update existing exam
        await examService.updateExam(selectedExam._id, formData);
        showToast('Cập nhật lịch thi thành công!', 'success');
      } else {
        // Create new exam
        await examService.createExam(formData);
        showToast('Tạo lịch thi mới thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchExams(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error saving exam:', err);
      
      // Check if this is a conflict error
      if (err.response?.status === 400 && err.response?.data) {
        const errorData = err.response.data;
        
        // If there are conflict warnings, show them in modal
        if (errorData.roomConflict || errorData.studentConflict) {
          // Update conflict data state to show in modal
          setConflictData({
            roomConflict: errorData.roomConflict || null,
            studentConflict: errorData.studentConflict || null,
          });
          showToast('⚠️ Phát hiện xung đột lịch thi. Vui lòng kiểm tra cảnh báo trong form.', 'warning');
          // Modal stays open to show warnings
        } else {
          // Generic validation error
          const errorMessage = errorData.message || 'Có lỗi xảy ra khi lưu lịch thi';
          const errorDetails = errorData.errors?.join(', ') || '';
          showToast(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`, 'error');
        }
      } else {
        // Network or other errors
        const errorMessage = err.message || 'Không thể kết nối đến server';
        showToast(errorMessage, 'error');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedExam) return;

    setModalLoading(true);
    try {
      await examService.deleteExam(selectedExam._id);
      showToast('Xóa lịch thi thành công!', 'success');
      setIsDeleteModalOpen(false);
      fetchExams(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error deleting exam:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Xóa thất bại!';
      showToast(errorMessage, 'error');
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

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-[1280px] px-6 gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <a className="hover:text-[#1A237E] dark:hover:text-white transition-colors" href="/admin">
              Dashboard
            </a>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">Xếp lịch thi</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Lịch thi
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                Tạo và quản lý lịch thi cho sinh viên. Hỗ trợ lọc theo môn học, ngày thi và phòng thi.
              </p>
            </div>
            <button
              className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-11 px-6 bg-[#1A237E] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#0D147A] transition-all shadow-sm"
              onClick={handleCreate}
            >
              <img src={addIcon} alt="Thêm" className="w-5 h-5" />
              <span>Tạo lịch thi mới</span>
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

          {/* Exam List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Search and Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-700 dark:text-white"
                    placeholder="Tìm kiếm theo mã kỳ thi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-700 dark:text-white"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  placeholder="Từ ngày"
                />
                <span className="text-slate-500 dark:text-slate-400">-</span>
                <input
                  type="date"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-700 dark:text-white"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  placeholder="Đến ngày"
                />
              </div>

              {/* Status Filter */}
              <select
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-700 dark:text-white"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="in-progress">Đang thi</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Mã kỳ thi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Môn học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Ngày thi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Giờ thi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Phòng thi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Đang tải...
                      </td>
                    </tr>
                  ) : exams.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Không có lịch thi nào
                      </td>
                    </tr>
                  ) : (
                    exams.map((exam) => (
                      <tr
                        key={exam._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {exam.examCode}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {exam.subject?.subjectCode}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {exam.subject?.subjectName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(exam.examDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {exam.startTime} - {exam.endTime}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {exam.room?.roomCode}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {exam.room?.roomName}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              exam.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : exam.status === 'in-progress'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                : exam.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {exam.status === 'scheduled'
                              ? 'Đã lên lịch'
                              : exam.status === 'in-progress'
                              ? 'Đang thi'
                              : exam.status === 'completed'
                              ? 'Hoàn thành'
                              : 'Đã hủy'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(exam)}
                              className="p-1.5 text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(exam)}
                              className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Xóa"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && exams.length > 0 && pagination.totalPages > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Hiển thị <span className="font-medium">{pagination.currentStart}</span> đến{' '}
                  <span className="font-medium">{pagination.currentEnd}</span> trong tổng số{' '}
                  <span className="font-medium">{pagination.totalItems}</span> kỳ thi
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="flex size-9 items-center justify-center rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pagination.currentPage === 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`text-sm font-normal flex size-9 items-center justify-center rounded transition-colors ${
                        page === pagination.currentPage
                          ? 'text-white bg-[#1A237E] shadow-sm'
                          : 'text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="flex size-9 items-center justify-center rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      <ExamModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setConflictData({ roomConflict: null, studentConflict: null }); // Clear on close
        }}
        onSubmit={handleSubmitForm}
        exam={selectedExam}
        loading={modalLoading}
        conflictData={conflictData}
      />

      {/* Delete Confirmation Modal */}
      <ExamDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        exam={selectedExam}
        loading={modalLoading}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            className="ml-2 text-white/80 hover:text-white"
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
