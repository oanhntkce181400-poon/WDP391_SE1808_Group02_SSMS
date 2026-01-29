import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      setUser(JSON.parse(authUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('auth_user');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API fails
      localStorage.removeItem('auth_user');
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'Trang chủ', href: '/student', icon: '🏠' },
    { label: 'Đơn tư & Thủ tục', href: '/student/procedures', icon: '📋' },
    { label: 'Thời khóa biểu', href: '/student/schedule', icon: '📅' },
    { label: 'Kết quả học tập', href: '/student/grades', icon: '📊' },
    { label: 'Tài chính', href: '/student/finance', icon: '💰' },
    { label: 'Giáo trình & Tài liệu', href: '/student/materials', icon: '📚' },
  ];

  const isActive = (href) => {
    if (href === '/student') {
      return location.pathname === '/student';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-200 shadow-sm transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">🎓</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Academic Portal</h1>
              <p className="text-xs text-slate-500">Student Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Support Hotline */}
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="mb-1 text-xs font-semibold text-slate-600">Support Hotline</p>
              <p className="text-base font-bold text-slate-900">0292 730 1988</p>
              <button className="mt-2 w-full rounded-md bg-slate-100 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200">
                Liên hệ hỗ trợ
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              {/* Search */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Tìm kiếm thủ tục..."
                  className="w-64 rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification */}
              <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <span className="text-xl">🔔</span>
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {/* User menu */}
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.fullName || 'Nguyen Van A'}
                  </p>
                  <p className="text-xs text-slate-500">SE160XXX • FPTU-Cần Thơ</p>
                </div>
                <div className="relative">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white ring-2 ring-blue-100">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'N'}
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sm:block"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex gap-4">
              <button className="hover:text-slate-700">Trợ giúp (Help Desk)</button>
              <button className="hover:text-slate-700">Hệ thống CMS</button>
              <button className="hover:text-slate-700">Thư viện (Library)</button>
            </div>
            <p>© 2023 FPT University | Developed by Academic Affairs Office</p>
          </div>
        </footer>
      </div>
    </div>
  );
}