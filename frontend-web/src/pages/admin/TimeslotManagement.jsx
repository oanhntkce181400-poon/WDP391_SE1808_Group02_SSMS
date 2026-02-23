// Timeslot Management Page - Main page for Timeslot CRUD operations
import { useState, useEffect, useCallback } from 'react';
import timeslotService from '../../services/timeslotService';
import TimeslotModal from '../../components/features/TimeslotModal';
import TimeslotDeleteModal from '../../components/features/TimeslotDeleteModal';
import TimeslotDetailModal from '../../components/features/TimeslotDetailModal';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function TimeslotManagement() {
  // State for timeslots data
  const [timeslots, setTimeslots] = useState([]);
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

  // State for selected timeslot
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch timeslots from API
  const fetchTimeslots = useCallback(async (page = 1, keyword = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await timeslotService.getTimeslots({
        page,
        limit: pagination.limit,
        keyword,
      });

      const { data, total, page: currentPage, totalPages } = response.data;

      // Transform data
      const transformedData = (data || []).map((item) => ({
        _id: item._id,
        id: item._id,
        groupName: item.groupName,
        description: item.description || '',
        startTime: item.startTime,
        endTime: item.endTime,
        startPeriod: item.startPeriod,
        endPeriod: item.endPeriod,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setTimeslots(transformedData);
      setPagination((prev) => ({
        ...prev,
        currentPage,
        totalPages,
        totalItems: total,
        currentStart: (currentPage - 1) * prev.limit + 1,
        currentEnd: Math.min(currentPage * prev.limit, total),
      }));
    } catch (err) {
      console.error('Error fetching timeslots:', err);
      setError('Không thể tải danh sách giờ học. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchTimeslots();
  }, [fetchTimeslots]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchTimeslots(1, searchQuery);
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchTimeslots(page, searchQuery);
  };

  // Handle export Excel
  const handleExport = () => {
    showToast('Chức năng xuất Excel đang được phát triển', 'info');
  };

  // Handle create new timeslot
  const handleCreate = () => {
    setSelectedTimeslot(null);
    setIsModalOpen(true);
  };

  // Handle edit timeslot
  const handleEdit = (timeslot) => {
    setSelectedTimeslot(timeslot);
    setIsModalOpen(true);
  };

  // Handle delete timeslot
  const handleDelete = (timeslot) => {
    setSelectedTimeslot(timeslot);
    setIsDeleteModalOpen(true);
  };

  // Handle view timeslot detail
  const handleView = (timeslot) => {
    setSelectedTimeslot(timeslot);
    setIsDetailModalOpen(true);
  };

  // Handle submit form (create/update)
  const handleSubmitForm = async (formData) => {
    setModalLoading(true);
    try {
      if (selectedTimeslot) {
        // Update existing timeslot
        await timeslotService.updateTimeslot(selectedTimeslot._id, formData);
        showToast('Cập nhật giờ học thành công!', 'success');
      } else {
        // Create new timeslot
        await timeslotService.createTimeslot(formData);
        showToast('Tạo giờ học mới thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchTimeslots(pagination.currentPage, searchQuery);
    } catch (err) {
      console.error('Error saving timeslot:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
      showToast(errorMessage, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedTimeslot) return;

    setModalLoading(true);
    try {
      await timeslotService.deleteTimeslot(selectedTimeslot._id);
      showToast('Xóa giờ học thành công!', 'success');
      setIsDeleteModalOpen(false);
      fetchTimeslots(pagination.currentPage, searchQuery);
    } catch (err) {
      console.error('Error deleting timeslot:', err);
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <span>Dashboard</span>
          <img src={nextIcon} alt="next" className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Giờ học</span>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý Thời gian học</h1>
            <p className="text-gray-600">
              Cập nhật danh mục thời gian học nhóm môn, sức chứa và cấu trúc khung thời gian học.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-[#1A237E] hover:bg-[#0D147A] text-white px-6 py-3 rounded-lg transition-colors"
          >
            <img src={addIcon} alt="add" className="w-5 h-5" />
            Thêm khung giờ mới
          </button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm theo tên nhóm môn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          <button
            onClick={handleExport}
            className="ml-4 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên ca
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiết
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Giờ học
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : timeslots.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              timeslots.map((timeslot) => (
                <tr key={timeslot._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{timeslot.groupName}</div>
                    {timeslot.description && (
                      <div className="text-sm text-gray-500">{timeslot.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Tiết {timeslot.startPeriod} - {timeslot.endPeriod}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {timeslot.startTime} - {timeslot.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(timeslot)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Xem chi tiết"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(timeslot)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Chỉnh sửa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(timeslot)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Xóa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && timeslots.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Hiển thị {pagination.currentStart} đến {pagination.currentEnd} trong tổng số {pagination.totalItems} khung giờ
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                let page;
                if (pagination.totalPages <= 5) {
                  page = index + 1;
                } else if (pagination.currentPage <= 3) {
                  page = index + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  page = pagination.totalPages - 4 + index;
                } else {
                  page = pagination.currentPage - 2 + index;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[40px] px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                      page === pagination.currentPage
                        ? 'bg-[#1A237E] text-white border-[#1A237E]'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <TimeslotModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitForm}
          timeslot={selectedTimeslot}
          loading={modalLoading}
        />
      )}

      {isDeleteModalOpen && (
        <TimeslotDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          timeslot={selectedTimeslot}
          loading={modalLoading}
        />
      )}

      {isDetailModalOpen && (
        <TimeslotDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          timeslot={selectedTimeslot}
        />
      )}
    </div>
  );
}
