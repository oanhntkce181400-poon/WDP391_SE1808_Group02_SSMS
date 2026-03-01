// Announcement Page - Trang xem thông báo (Student)
import { useState, useEffect } from 'react';
import announcementService from '../../services/announcementService';
import { downloadCloudinaryFile } from '../../utils/cloudinaryHelper';

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Fetch announcements
  const fetchAnnouncements = async (page = 1) => {
    setLoading(true);
    try {
      const response = await announcementService.getActiveAnnouncements({
        page,
        limit: pagination.limit,
        category: selectedCategory,
      });

      const { announcements: data, totalPages } = response.data.data;
      setAnnouncements(data || []);
      setPagination((prev) => ({ ...prev, currentPage: page, totalPages }));
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedCategory]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
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
    return labels[category] || 'Khác';
  };

  // Get category badge color
  const getCategoryColor = (category) => {
    const colors = {
      hoc_vu: 'bg-blue-100 text-blue-700',
      tai_chinh: 'bg-green-100 text-green-700',
      su_kien: 'bg-purple-100 text-purple-700',
      khac: 'bg-slate-100 text-slate-700',
    };
    return colors[category] || colors.khac;
  };

  // View detail modal
  const openDetail = (announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const closeDetail = () => {
    setSelectedAnnouncement(null);
  };

  // Auto-open links in new tab and make them safe
  useEffect(() => {
    if (selectedAnnouncement) {
      // Wait for DOM to render
      setTimeout(() => {
        const modalContent = document.querySelector('.announcement-content');
        if (modalContent) {
          const links = modalContent.querySelectorAll('a');
          links.forEach((link) => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          });
        }
      }, 100);
    }
  }, [selectedAnnouncement]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">📢 Thông báo</h1>
          <p className="mt-1 text-sm text-slate-600">
            Các thông báo quan trọng từ nhà trường
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            } border border-slate-200`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSelectedCategory('hoc_vu')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'hoc_vu'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            } border border-slate-200`}
          >
            Học vụ
          </button>
          <button
            onClick={() => setSelectedCategory('tai_chinh')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'tai_chinh'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            } border border-slate-200`}
          >
            Tài chính
          </button>
          <button
            onClick={() => setSelectedCategory('su_kien')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'su_kien'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            } border border-slate-200`}
          >
            Sự kiện
          </button>
          <button
            onClick={() => setSelectedCategory('khac')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'khac'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            } border border-slate-200`}
          >
            Khác
          </button>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">Chưa có thông báo nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement._id || announcement.id}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100 cursor-pointer"
                onClick={() => openDetail(announcement)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(
                          announcement.category
                        )}`}
                      >
                        {getCategoryLabel(announcement.category).toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        <i className="fa-solid fa-calendar"></i> {formatDate(announcement.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 hover:text-blue-600">
                      {announcement.title}
                    </h3>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {announcement.content?.replace(/<[^>]*>/g, '')}
                </div>

                {/* Attachments */}
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span><i className="fa-solid fa-file"></i></span>
                    <span>{announcement.attachments.length} tệp đính kèm</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && announcements.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => fetchAnnouncements(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <span className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchAnnouncements(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(
                    selectedAnnouncement.category
                  )}`}
                >
                  {getCategoryLabel(selectedAnnouncement.category).toUpperCase()}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-3">
                  {selectedAnnouncement.title}
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  <i className="fa-solid fa-calendar"></i> {formatDate(selectedAnnouncement.createdAt)}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div
                className="announcement-content prose prose-sm max-w-none text-slate-700 
                  [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium 
                  [&_a:hover]:text-blue-800 [&_a:hover]:underline 
                  [&_a]:cursor-pointer [&_a]:transition-colors"
                dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
              ></div>

              {/* Attachments */}
              {selectedAnnouncement.attachments &&
                selectedAnnouncement.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      <i className="fa-solid fa-paperclip mr-2"></i>Tệp đính kèm
                    </h3>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => downloadCloudinaryFile(file.url, file.fileName)}
                          className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                        >
                          <span className="text-2xl"><i className="fa-solid fa-file"></i></span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-600">
                              {file.fileName}
                            </p>
                            {file.fileSize && (
                              <p className="text-xs text-slate-500">
                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <span className="text-blue-600"><i className="fa-solid fa-download"></i></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={closeDetail}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
