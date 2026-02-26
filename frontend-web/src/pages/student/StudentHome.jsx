import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamScheduleSummary from '../../components/features/ExamScheduleSummary';
import announcementService from '../../services/announcementService';

// Data arrays - procedures, lookupItems, reportItems, regulationItems
// (newsItems will be fetched from API)

const procedures = [
  { label: 'Tạm hoãn học tập',         path: '/student/applications' },
  { label: 'Đăng ký chuyển lớp',        path: '/student/applications' },
  { label: 'Đăng ký thi cải thiện',     path: '/student/applications' },
  { label: 'Xác nhận sinh viên',         path: '/student/applications' },
  { label: 'Xem tất cả đơn từ...', isLink: true, path: '/student/applications' },
];

const lookupItems = [
  { label: 'Tra cứu học phí',            badge: null, path: '/student/finance' },
  { label: 'Lịch thi & Địa điểm',        badge: 'MỚI', isLink: true, path: '/student/exams' },
  { label: 'Đề cương môn học',           badge: null, path: null },
  { label: 'Danh sách wishlist môn học', badge: null, path: null },
  { label: 'Đánh giá lớp học',           badge: null, isLink: true, path: '/student/feedback' },
];

const reportItems = [
  { label: 'Điểm danh (Attendance)',  path: '/student/schedule' },
  { label: 'Bảng điểm học tập',       path: null },
  { label: 'Báo cáo Mark Report',     path: null },
  { label: 'Lịch sử giao dịch',       path: '/student/finance' },
];

const regulationItems = [
  { label: 'Nội quy đào tạo' },
  { label: 'Nội quy ký túc xá' },
  { label: 'Quy định xét học bổng' },
  { label: 'Quy trình thi cử' },
];

export default function StudentHome() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedItems, setHighlightedItems] = useState(new Set());
  const [newsItems, setNewsItems] = useState([]); // State for announcements
  const [loadingNews, setLoadingNews] = useState(false);
  const itemRefs = useRef({});
  const navigate = useNavigate();

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getCategoryLabel = (category) => {
    const labels = {
      hoc_vu: 'Học vụ',
      tai_chinh: 'Tài chính',
      su_kien: 'Sự kiện',
      khac: 'Khác',
    };
    return labels[category] || 'Thông báo';
  };

  useEffect(() => {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      setUser(JSON.parse(authUser));
    }
  }, []);

  // Fetch announcements (top 4 mới nhất)
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingNews(true);
      try {
        const response = await announcementService.getActiveAnnouncements({
          page: 1,
          limit: 4,
        });
        const announcements = response.data.data.announcements || [];
        
        // Transform to match newsItems format
        const transformedNews = announcements.map((ann) => ({
          type: getCategoryLabel(ann.category).toUpperCase(),
          title: ann.title,
          description: ann.content?.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
          date: formatDate(ann.createdAt),
          id: ann._id || ann.id,
        }));
        
        setNewsItems(transformedNews);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        // Fallback to empty array
        setNewsItems([]);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Search and highlight logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedItems(new Set());
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches = new Set();

    // Collect all items
    const allItems = [
      ...procedures.map((item, idx) => ({ id: `proc-${idx}`, label: item.label })),
      ...lookupItems.map((item, idx) => ({ id: `lookup-${idx}`, label: item.label })),
      ...reportItems.map((item, idx) => ({ id: `report-${idx}`, label: item.label })),
      ...regulationItems.map((item, idx) => ({ id: `reg-${idx}`, label: item.label })),
    ];

    // Find matches
    allItems.forEach((item) => {
      if (item.label.toLowerCase().includes(query)) {
        matches.add(item.id);
      }
    });

    setHighlightedItems(matches);

    // Scroll to first match
    if (matches.size > 0) {
      const firstMatch = Array.from(matches)[0];
      const element = itemRefs.current[firstMatch];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchQuery]);

  const setItemRef = (id, element) => {
    if (element) {
      itemRefs.current[id] = element;
    }
  };

  const isHighlighted = (id) => highlightedItems.has(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header with Search */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Xin chào, {user?.fullName || 'Sinh viên'}! 👋
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Chào mừng bạn đến với Cổng thông tin Sinh viên - FPT University
              </p>
            </div>
            {/* Search Box */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Tìm kiếm thủ tục, tra cứu, báo cáo..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Search results count */}
          {searchQuery && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
              <span className="font-medium">
                🎯 Tìm thấy{' '}
                <span className="font-bold text-blue-600">{highlightedItems.size}</span> kết quả
                cho "{searchQuery}"
              </span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column: news + procedures */}
          <div className="space-y-6 lg:col-span-2">
            {/* News */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📢</span>
                  <h2 className="text-lg font-bold text-slate-900">Thông báo & Tin tức</h2>
                </div>
                <button
                  onClick={() => navigate('/student/announcements')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Xem tất cả »
                </button>
              </div>
              {loadingNews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : newsItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-4xl mb-2 block">📭</span>
                  <p className="text-sm">Chưa có thông báo nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newsItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="group cursor-pointer rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-3 transition hover:border-blue-300 hover:shadow-md"
                      onClick={() => navigate('/student/announcements')}
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-md bg-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            {item.type}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {item.date}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 transition group-hover:text-blue-700">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Procedures */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <h3 className="text-lg font-bold text-slate-900">Đơn từ & Thủ tục</h3>
              </div>
              <div className="space-y-2">
                {procedures.map((item, index) => {
                  const itemId = `proc-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      onClick={() => item.path && navigate(item.path)}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                        highlighted
                          ? 'bg-yellow-100 shadow-md ring-2 ring-yellow-400'
                          : item.isLink
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md cursor-pointer'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {!item.isLink && <span className="text-lg">📄</span>}
                        {item.label}
                      </span>
                      <span className={`${item.isLink ? 'text-blue-600' : 'text-slate-400'}`}>
                        {item.isLink ? '»' : '→'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: lookup, reports, regulations, Coursera */}
          <div className="space-y-6">
            {/* Lookup */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">🔎</span>
                <h3 className="text-lg font-bold text-slate-900">Tra cứu thông tin</h3>
              </div>
              <div className="space-y-2">
                {lookupItems.map((item, index) => {
                  const itemId = `lookup-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      onClick={() => {
                        if (item.isLink) {
                          if (item.label === 'Lịch thi & Địa điểm') {
                            navigate('/student/exams');
                          } else if (item.label === 'Đánh giá lớp học') {
                            navigate('/student/feedback');
                          }
                        } else if (item.path) {
                          navigate(item.path);
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                        highlighted
                          ? 'bg-yellow-100 shadow-md ring-2 ring-yellow-400'
                          : item.path
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md cursor-pointer'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-sm cursor-default'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">🔍</span>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            {item.badge}
                          </span>
                        )}
                        <span className={`${item.isLink ? 'text-blue-600' : 'text-slate-400'}`}>
                          {item.isLink ? '»' : '→'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exam Schedule Summary */}
            <ExamScheduleSummary />

            {/* Reports */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h3 className="text-lg font-bold text-slate-900">Báo cáo học tập</h3>
              </div>
              <div className="space-y-2">
                {reportItems.map((item, index) => {
                  const itemId = `report-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      onClick={() => item.path && navigate(item.path)}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                        highlighted
                          ? 'bg-yellow-100 shadow-md ring-2 ring-yellow-400'
                          : item.path
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md cursor-pointer'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-sm cursor-default'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        {item.label}
                      </span>
                      <span className={item.path ? 'text-blue-600' : 'text-slate-400'}>→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regulations */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                <h3 className="text-lg font-bold text-slate-900">Quy định & Nội quy</h3>
              </div>
              <div className="space-y-2">
                {regulationItems.map((item, index) => {
                  const itemId = `reg-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                        highlighted
                          ? 'bg-yellow-100 shadow-md ring-2 ring-yellow-400'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📜</span>
                        {item.label}
                      </span>
                      <span className="text-slate-400">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FPTU-Coursera Integration */}
            <div className="group overflow-hidden rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl transition-all hover:shadow-2xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg transition-transform group-hover:scale-110">
                <span className="text-2xl font-extrabold text-blue-600">C</span>
              </div>
              <h3 className="mb-2 text-xl font-extrabold">FPTU × Coursera</h3>
              <p className="mb-5 text-sm leading-relaxed text-blue-100">
                🎓 Nâng cao kỹ năng với hàng ngàn khóa học quốc tế từ các trường đại học hàng đầu
                thế giới!
              </p>
              <div className="flex gap-3">
                <button className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 hover:shadow-lg">
                  Vào học ngay →
                </button>
                <button className="rounded-lg border-2 border-white/50 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition hover:border-white hover:bg-white/10">
                  Hướng dẫn
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-200">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                </svg>
                <span>Miễn phí 100% cho sinh viên FPT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
