// Room Management Page - Main page for Room CRUD operations
// Features: Create, Read, Update, Delete, Search, Filter, Pagination, Export
import { useState, useEffect, useCallback } from 'react';
import roomService from '../../services/roomService';
import RoomModal from '../../components/features/RoomModal';
import RoomDeleteModal from '../../components/features/RoomDeleteModal';
import RoomFilterPanel from '../../components/features/RoomFilterPanel';
import RoomDetailModal from '../../components/features/RoomDetailModal';
import RoomUsageHistoryModal from '../../components/features/RoomUsageHistoryModal';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function RoomManagement() {
  // State for rooms data
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State for selected room
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);

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

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    currentStart: 0,
    currentEnd: 0,
    limit: 10,
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch rooms from API
  const fetchRooms = useCallback(
    async (page = 1, keyword = '', filterParams = {}) => {
      setLoading(true);
      setError('');

      try {
        const response = await roomService.getRooms({
          page,
          limit: pagination.limit,
          keyword,
          ...filterParams,
        });

        const { data, total, page: currentPage, totalPages } = response.data;
        const normalizedRooms = (data || []).map((item) => ({
          _id: item._id,
          id: item._id,
          code: item.roomCode,
          name: item.roomName,
          capacity: item.capacity,
          building: item.roomType || 'N/A',
          roomType: item.roomType,
          status: item.operationalStatus || item.status || 'available',
          rawStatus: item.status || 'available',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          currentSemesterClassCount: item.currentSemesterClassCount || 0,
          currentSemesterEnrollmentCount: item.currentSemesterEnrollmentCount || 0,
          currentSemesterOccupancyRate: item.currentSemesterOccupancyRate || 0,
          currentSemesterClassCodes: item.currentSemesterClassCodes || [],
        }));

        setRooms(normalizedRooms);
        setPagination((prev) => ({
          ...prev,
          currentPage,
          totalPages,
          totalItems: total,
          currentStart: total === 0 ? 0 : (currentPage - 1) * prev.limit + 1,
          currentEnd: Math.min(currentPage * prev.limit, total),
        }));
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit],
  );

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handle search
  const handleSearch = (event) => {
    event.preventDefault();
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
  const handleDelete = async () => {
    if (!selectedRoom) return;

    setModalLoading(true);
    try {
      await roomService.deleteRoom(selectedRoom._id);
      showToast('Xóa phòng học thành công.');
      setIsDeleteModalOpen(false);
      setSelectedRoom(null);
      fetchRooms(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error deleting room:', err);
      showToast(err.response?.data?.message || err.message || 'Xóa phòng học thất bại.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle view room detail
  const handleView = (room) => {
    setSelectedRoom(room);
    setIsDetailModalOpen(true);
  };

  // Handle view usage history
  const handleViewUsageHistory = (room) => {
    setSelectedRoom(room);
    setIsUsageHistoryOpen(true);
  };

  // Handle submit form (create/update)
  const handleSubmitForm = async (formData) => {
    setModalLoading(true);

    try {
      if (selectedRoom) {
        await roomService.updateRoom(selectedRoom._id, formData);
        showToast('Cập nhật phòng học thành công.');
      } else {
        await roomService.createRoom(formData);
        showToast('Tạo phòng học thành công.');
      }

      setIsModalOpen(false);
      setSelectedRoom(null);
      fetchRooms(pagination.currentPage, searchQuery, filters);
    } catch (err) {
      console.error('Error saving room:', err);
      showToast(err.response?.data?.message || err.message || 'Có lỗi xảy ra.', 'error');
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex justify-center py-8">
        <div className="layout-content-container flex w-full max-w-[1280px] flex-col gap-6 px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <a className="transition-colors hover:text-[#1A237E] dark:hover:text-white" href="/admin">
              Dashboard
            </a>
            <img src={nextIcon} alt="Chevron" className="h-4 w-4" />
            <span className="font-medium text-slate-900 dark:text-white">Phòng học</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-[#0d141b] dark:text-white">
                Quản lý phòng học
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Quản lý thông tin phòng, sức chứa và trạng thái sử dụng theo lịch học thực tế.
              </p>
            </div>
            <button
              className="flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-lg bg-[#1A237E] px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0D1470]"
              onClick={() => {
                setSelectedRoom(null);
                setIsModalOpen(true);
              }}
            >
              <img src={addIcon} alt="Thêm" className="h-5 w-5" />
              <span>Tạo phòng học mới</span>
            </button>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <form onSubmit={handleSearch} className="min-w-[220px] flex-1">
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A237E] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Tìm theo mã phòng hoặc tên phòng..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </form>
              <button
                onClick={() => setIsFilterPanelOpen(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Bộ lọc
              </button>
              <button
                onClick={() => showToast('Chức năng xuất Excel chưa được triển khai.', 'info')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Xuất Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Mã phòng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Tên phòng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Sức chứa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Loại phòng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Không có phòng học nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{room.code}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{room.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {room.capacity} chỗ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{room.building}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              room.status === 'available'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                          >
                            {room.status === 'available' ? 'Đang trống' : 'Đang hoạt động'}
                          </span>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {room.currentSemesterEnrollmentCount} sinh viên / {room.currentSemesterClassCount} lớp trong kỳ hiện tại
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <ActionButton
                              title="Xem chi tiết"
                              onClick={() => handleView(room)}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553 2.276a1 1 0 010 1.789L15 16.34M9 16.34 4.447 14.065a1 1 0 010-1.79L9 10m0 6.34V10m6 0-6-3-6 3 6 3 6-3z"
                              />
                            </ActionButton>
                            <ActionButton
                              title="Chỉnh sửa"
                              onClick={() => handleEdit(room)}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </ActionButton>
                            <ActionButton
                              title="Lịch sử sử dụng"
                              onClick={() => handleViewUsageHistory(room)}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </ActionButton>
                            <ActionButton
                              title="Xóa"
                              onClick={() => {
                                setSelectedRoom(room);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && rooms.length > 0 && pagination.totalPages > 0 ? (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Hiển thị <span className="font-medium">{pagination.currentStart}</span> đến{' '}
                  <span className="font-medium">{pagination.currentEnd}</span> trong tổng số{' '}
                  <span className="font-medium">{pagination.totalItems}</span> phòng học
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
                    disabled={pagination.currentPage === 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19 8 12l7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      className={`flex h-9 w-9 items-center justify-center rounded text-sm transition-colors ${
                        page === pagination.currentPage
                          ? 'bg-[#1A237E] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700'
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <RoomModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoom(null);
        }}
        onSubmit={handleSubmitForm}
        room={selectedRoom}
        loading={modalLoading}
      />

      <RoomDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRoom(null);
        }}
        onConfirm={handleDelete}
        room={selectedRoom}
        loading={modalLoading}
      />

      <RoomDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onEdit={(room) => {
          setSelectedRoom(room);
          setIsModalOpen(true);
        }}
        onDelete={(room) => {
          setSelectedRoom(room);
          setIsDeleteModalOpen(true);
        }}
      />

      <RoomUsageHistoryModal
        isOpen={isUsageHistoryOpen}
        onClose={() => setIsUsageHistoryOpen(false)}
        room={selectedRoom}
        onEdit={(room) => {
          setSelectedRoom(room);
          setIsModalOpen(true);
        }}
        onDelete={(room) => {
          setSelectedRoom(room);
          setIsDeleteModalOpen(true);
        }}
      />

      <RoomFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          fetchRooms(1, searchQuery, newFilters);
        }}
        currentFilters={filters}
      />

      {toast.show ? (
        <div
          className={`fixed bottom-6 right-6 z-[200] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({ title, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 text-slate-500 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
      title={title}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {children}
      </svg>
    </button>
  );
}
