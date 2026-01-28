// Room Management Page - Main page for Room CRUD operations
// Features: Create, Read, Update, Delete, Search, Filter, Pagination, Export
import { useState, useEffect, useCallback } from 'react';
import roomService from '../../services/roomService';
import RoomModal from '../../components/features/RoomModal';
import RoomDeleteModal from '../../components/features/RoomDeleteModal';
import RoomFilterPanel from '../../components/features/RoomFilterPanel';
import RoomDetailModal from '../../components/features/RoomDetailModal';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function RoomManagement() {
  // State for rooms data
  const [rooms, setRooms] = useState([]);
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
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // State for selected room
  const [selectedRoom, setSelectedRoom] = useState(null);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // State for filters
  const [filters, setFilters] = useState({
    roomType: '',
    minCapacity: '',
    maxCapacity: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch rooms from API
  const fetchRooms = useCallback(async (page = 1, keyword = '', filterParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await roomService.getRooms({
        page,
        limit: pagination.limit,
        keyword,
        ...filterParams,
      });

      const { data, total, page: currentPage, totalPages } = response.data;

      // Transform data to match frontend field names
      const transformedData = (data || []).map((item) => ({
        _id: item._id,
        id: item._id,
        code: item.roomCode,
        name: item.roomName,
        capacity: item.capacity,
        building: item.roomType || 'N/A',
        roomType: item.roomType,
        status: item.status || 'available',
        floor: 1,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setRooms(transformedData);
      setPagination((prev) => ({
        ...prev,
        currentPage,
        totalPages,
        totalItems: total,
        currentStart: (currentPage - 1) * prev.limit + 1,
        currentEnd: Math.min(currentPage * prev.limit, total),
      }));
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Không thể tải danh sách phòng học. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchRooms(1, searchQuery, filters);
  };

  // Handle filter
  const handleFilter = () => {
    setIsFilterPanelOpen(true);
  };

  // Handle apply filters
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    fetchRooms(1, searchQuery, newFilters);
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchRooms(page, searchQuery, filters);
  };

  // Handle export Excel
  const handleExport = () => {
    showToast('Chức năng xuất Excel đang được phát triển', 'info');
  };

  // Handle create new room
  const handleCreate = () => {
    setSelectedRoom(null);
    setIsModalOpen(true);
  };

  // Handle edit room
  const handleEdit = (room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  // Handle delete room
  const handleDelete = (room) => {
    setSelectedRoom(room);
    setIsDeleteModalOpen(true);
  };

  // Handle view room detail
  const handleView = (room) => {
    setSelectedRoom(room);
    setIsDetailModalOpen(true);
  };

  // Handle submit form (create/update)
  const handleSubmitForm = async (formData) => {
    setModalLoading(true);
    try {
      if (selectedRoom) {
        // Update existing room
        await roomService.updateRoom(selectedRoom._id, formData);
        showToast('Cập nhật phòng học thành công!', 'success');
      } else {
        // Create new room
        await roomService.createRoom(formData);
        showToast('Tạo phòng học mới thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchRooms(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error saving room:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
      showToast(errorMessage, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedRoom) return;

    setModalLoading(true);
    try {
      await roomService.deleteRoom(selectedRoom._id);
      showToast('Xóa phòng học thành công!', 'success');
      setIsDeleteModalOpen(false);
      fetchRooms(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error deleting room:', err);
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
            <span className="text-slate-900 dark:text-white font-medium">Phòng học</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Phòng học
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                Cập nhật danh mục phòng học, sức chứa và cấu trúc khung phòng học đào tạo.
              </p>
            </div>
            <button
              className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-11 px-6 bg-[#1A237E] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#0D147A] transition-all shadow-sm"
              onClick={handleCreate}
            >
              <img src={addIcon} alt="Thêm" className="w-5 h-5" />
              <span>Tạo phòng học mới</span>
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

          {/* Room List */}
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
                    placeholder="Tìm kiếm theo mã phòng hoặc tên phòng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              <button
                onClick={handleFilter}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Lọc
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Xuất Excel
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Mã Phòng học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Tên Phòng học
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Sức chứa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Tòa nhà
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
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Đang tải...
                      </td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Không có phòng học nào
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr
                        key={room._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {room.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {room.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {room.capacity} chỗ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {room.building}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              room.status === 'available'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                          >
                            {room.status === 'available' ? 'Đang trống' : 'Đang hoạt động'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(room)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Xem lịch"
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
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(room)}
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
                              onClick={() => handleDelete(room)}
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
            {!loading && rooms.length > 0 && pagination.totalPages > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Hiển thị <span className="font-medium">{pagination.currentStart}</span> đến{' '}
                  <span className="font-medium">{pagination.currentEnd}</span> trong tổng số{' '}
                  <span className="font-medium">{pagination.totalItems}</span> phòng học
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
      <RoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        room={selectedRoom}
        loading={modalLoading}
      />

      {/* Delete Confirmation Modal */}
      <RoomDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        room={selectedRoom}
        loading={modalLoading}
      />

      {/* Room Detail Modal */}
      <RoomDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        room={selectedRoom}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Filter Panel */}
      <RoomFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
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
