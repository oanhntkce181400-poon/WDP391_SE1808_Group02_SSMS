import { useState, useEffect, useRef } from 'react';

export default function StudentHome() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedItems, setHighlightedItems] = useState(new Set());
  const itemRefs = useRef({});

  useEffect(() => {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      setUser(JSON.parse(authUser));
    }
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
      ...procedures.map((item, idx) => ({ id: `proc-${idx}`, label: item.label, type: 'procedure' })),
      ...lookupItems.map((item, idx) => ({ id: `lookup-${idx}`, label: item.label, type: 'lookup' })),
      ...reportItems.map((item, idx) => ({ id: `report-${idx}`, label: item.label, type: 'report' })),
      ...regulationItems.map((item, idx) => ({ id: `reg-${idx}`, label: item.label, type: 'regulation' })),
    ];

    // Find matches
    allItems.forEach(item => {
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

  const newsItems = [
    {
      type: 'THÔNG BÁO QUAN TRỌNG',
      badge: 'badge-warning',
      title: 'Lưu ý về thời hạn nộp đơn cho kỳ học Spring 2024',
      description: 'Vui lòng kiểm tra kỳ học trước khi nộp đơn...',
      date: '28/01/2026',
    },
    {
      type: 'HỌC VỤ',
      badge: 'badge-info',
      title: 'Đăng ký chuyên ngành hợp HK Spring 2024',
      description: 'Hạn chót đăng ký 15/12/2023. Sinh viên lưu ý thao tác...',
      date: '25/01/2026',
    },
    {
      type: 'SỰ KIỆN',
      badge: 'badge-success',
      title: 'Ngày hội việc làm IT Job Fair 2024',
      description: 'Cơ hội thực tập tại các doanh nghiệp hàng đầu...',
      date: '20/01/2026',
    },
    {
      type: 'THI CỬ',
      badge: 'badge-purple',
      title: 'Lịch thi Final kỳ Fall 2023 - Đợt 2',
      description: 'Cập nhật danh sách phòng thi và giờ thi chi tiết...',
      date: '15/01/2026',
    },
  ];

  const procedures = [
    { label: 'Tạm hoãn học tập', count: null },
    { label: 'Đăng ký chuyên lớp', count: null },
    { label: 'Đăng ký thi cải thiện', count: null },
    { label: 'Xác nhận sinh viên', count: null },
    { label: 'Xem tất cả đơn từ...', isLink: true },
  ];

  const lookupItems = [
    { label: 'Tra cứu học phí', badge: null },
    { label: 'Lịch thi & Địa điểm', badge: 'MỚI' },
    { label: 'Đề cương môn học', badge: null },
    { label: 'Danh sách wishlist môn học', badge: null },
  ];

  const reportItems = [
    { label: 'Điểm danh (Attendance)' },
    { label: 'Bảng điểm học tập' },
    { label: 'Báo cáo Mark Report' },
    { label: 'Lịch sự giáo dịch' },
  ];

  const regulationItems = [
    { label: 'Nội quy đào tạo' },
    { label: 'Nội quy ký túc xá' },
    { label: 'Quy định xét học bổng' },
    { label: 'Quy trình thi cử' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header with Search */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Trang chủ</h1>
              <p className="mt-1 text-sm text-slate-500">
                Chào mừng bạn đến với Academic Portal - FPTU
              </p>
            </div>
            {/* Search Box */}
            <div className="relative w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm thủ tục, tra cứu, báo cáo..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            <div className="mt-2 text-sm text-slate-600">
              Tìm thấy{' '}
              <span className="font-semibold text-blue-600">{highlightedItems.size}</span>{' '}
              kết quả phù hợp
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column: news + procedures */}
          <div className="space-y-6 lg:col-span-2">
            {/* News */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Thông báo & tin tức</h2>
              <div className="space-y-3">
                {newsItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {item.type}
                        </span>
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Procedures */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Đơn từ & Thủ tục</h3>
              <div className="space-y-1">
                {procedures.map((item, index) => {
                  const itemId = `proc-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        highlighted
                          ? 'bg-yellow-100 ring-2 ring-yellow-400'
                          : item.isLink
                          ? 'font-medium text-blue-600 hover:bg-blue-50'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {!item.isLink && <span className="text-slate-400">→</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: lookup, reports, regulations, Coursera */}
          <div className="space-y-6">
            {/* Lookup */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Tra cứu thông tin</h3>
              <div className="space-y-1">
                {lookupItems.map((item, index) => {
                  const itemId = `lookup-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        highlighted
                          ? 'bg-yellow-100 ring-2 ring-yellow-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-slate-400">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reports */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Báo cáo học tập</h3>
              <div className="space-y-1">
                {reportItems.map((item, index) => {
                  const itemId = `report-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        highlighted
                          ? 'bg-yellow-100 ring-2 ring-yellow-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-slate-400">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regulations */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Quy định & Nội quy</h3>
              <div className="space-y-1">
                {regulationItems.map((item, index) => {
                  const itemId = `reg-${index}`;
                  const highlighted = isHighlighted(itemId);
                  return (
                    <button
                      key={index}
                      ref={(el) => setItemRef(itemId, el)}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        highlighted
                          ? 'bg-yellow-100 ring-2 ring-yellow-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-slate-400">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FPTU-Coursera Integration */}
            <div className="rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                <span className="text-xl font-bold text-slate-900">C</span>
              </div>
              <h3 className="mb-2 text-lg font-bold">FPTU-Coursera</h3>
              <p className="mb-4 text-sm text-slate-300">
                Nâng cao kỹ năng với hàng ngàn khóa học quốc tế.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium transition hover:bg-blue-700">
                  Vào học ngay
                </button>
                <button className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium transition hover:bg-slate-800">
                  Hướng dẫn
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
