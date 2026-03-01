// Announcement Management Page - Trang quản lý thông báo (Admin/Staff)
// Features: Create, Read, Update, Delete, Search, Filter, Pagination
import { useState, useEffect, useCallback } from 'react';
import announcementService from '../../services/announcementService';
import AnnouncementModal from '../../components/features/AnnouncementModal';
import AnnouncementDeleteModal from '../../components/features/AnnouncementDeleteModal';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function AnnouncementManagement() {
  // State for announcements data
  const [announcements, setAnnouncements] = useState([]);
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

  // State for selected announcement
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // State for search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch announcements from API
  const fetchAnnouncements = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const response = await announcementService.getAnnouncements({
          page,
          limit: pagination.limit,
          search: searchQuery,
          category: selectedCategory,
        });

        const { announcements: data, total, page: currentPage, totalPages } = response.data.data;

        setAnnouncements(data || []);
        setPagination((prev) => ({
          ...prev,
          currentPage,
          totalPages,
          totalItems: total,
          currentStart: (currentPage - 1) * prev.limit + 1,
          currentEnd: Math.min(currentPage * prev.limit, total),
        }));
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Không thể tải danh sách thông báo. Vui lòng thử lại sau.');
        showToast('Không thể tải danh sách thông báo', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, searchQuery, selectedCategory]
  );

  // Initial fetch
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchAnnouncements(1);
  };

  // Handle filter change
  const handleFilterChange = () => {
    fetchAnnouncements(1);
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchAnnouncements(page);
  };

  // Handle create new announcement
  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setIsModalOpen(true);
  };

  // Handle edit announcement
  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  // Handle delete announcement
  const handleDelete = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteModalOpen(true);
  };

  // Handle modal submit (create or update)
  const handleModalSubmit = async (formData) => {
    setModalLoading(true);
    try {
      if (selectedAnnouncement) {
        // Update
        await announcementService.updateAnnouncement(selectedAnnouncement._id || selectedAnnouncement.id, formData);
        showToast('Cập nhật thông báo thành công!', 'success');
      } else {
        // Create
        await announcementService.createAnnouncement(formData);
        showToast('Tạo thông báo thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchAnnouncements(pagination.currentPage);
    } catch (err) {
      console.error('Error submitting announcement:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!selectedAnnouncement) return;

    setModalLoading(true);
    try {
      await announcementService.deleteAnnouncement(selectedAnnouncement._id || selectedAnnouncement.id);
      showToast('Xóa thông báo thành công!', 'success');
      setIsDeleteModalOpen(false);
      fetchAnnouncements(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi xóa', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get category label
  const getCategoryLabel = (category) => {
    const labels = {
      hoc_vu: 'Học vụ',
      tai_chinh: 'Tài chính',
      su_kien: 'Sự kiện',
      khac: 'Khác',
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top duration-300">
            <div
              className={`px-6 py-4 rounded-lg shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-500 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
            <a className="hover:text-[#1A237E] dark:hover:text-white transition-colors" href="/admin">
              Trang chủ
            </a>
            <img src={nextIcon} alt=">" className="w-4 h-4" />
            <span className="text-[#1A237E] dark:text-white font-semibold">Thông báo</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Quản lý Thông báo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tạo và quản lý các thông báo gửi đến sinh viên
          </p>
        </div>

        {/* Search, Filter & Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#1A237E] hover:bg-[#0D1642] text-white rounded-lg transition-colors"
                >
                  Tìm
                </button>
              </form>
            </div>

            {/* Category Filter */}
            <div>
              <select
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#1A237E] dark:bg-slate-900"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setTimeout(handleFilterChange, 100);
                }}
              >
                <option value="">Tất cả danh mục</option>
                <option value="hoc_vu">Học vụ</option>
                <option value="tai_chinh">Tài chính</option>
                <option value="su_kien">Sự kiện</option>
                <option value="khac">Khác</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Hiển thị {pagination.currentStart} - {pagination.currentEnd} trong tổng số{' '}
              {pagination.totalItems} thông báo
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] hover:bg-[#0D1642] text-white rounded-lg transition-colors"
            >
              <img src={addIcon} alt="Add" className="w-5 h-5" />
              <span>Tạo thông báo mới</span>
            </button>
          </div>
        </div>

        {/* Announcements Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              {error}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <p className="text-lg font-medium">Không có thông báo nào</p>
              <p className="text-sm">Hãy tạo thông báo mới</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Danh mục
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      File đính kèm
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {announcements.map((announcement) => (
                    <tr
                      key={announcement._id || announcement.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {announcement.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {announcement.content?.replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {getCategoryLabel(announcement.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(announcement.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {announcement.attachments && announcement.attachments.length > 0 ? (
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            <i className="fa-solid fa-file mr-1"></i> {announcement.attachments.length} file
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(announcement)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            Xóa
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
          {!loading && announcements.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Trang {pagination.currentPage} / {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        announcement={selectedAnnouncement}
        loading={modalLoading}
      />

      <AnnouncementDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        announcement={selectedAnnouncement}
        loading={modalLoading}
      />
    </div>
  );
}
