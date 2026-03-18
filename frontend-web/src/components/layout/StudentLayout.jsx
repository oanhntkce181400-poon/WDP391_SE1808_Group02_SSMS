import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import authService from '../../services/authService';
import gpaService from '../../services/gpaService';

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); }
    catch { return {}; }
  });

  const [gpa, setGpa] = useState(null);
  const [gpaLoading, setGpaLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [semesterGPA, setSemesterGPA] = useState(null);
  const [semesterGPALoading, setSemesterGPALoading] = useState(false);

  // Refresh user info from server on mount
  useEffect(() => {
    authService.me()
      .then(res => {
        const fresh = res?.data?.user;
        if (fresh) {
          localStorage.setItem('auth_user', JSON.stringify(fresh));
          setUser(fresh);
        }
      })
      .catch(() => {}); // ignore if token expired / offline
  }, []);

  // Fetch GPA on mount
  useEffect(() => {
    const fetchGPA = async () => {
      try {
        setGpaLoading(true);
        const res = await gpaService.getMyGPA();
        if (res?.data?.success) {
          setGpa(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching GPA:', err);
        // Silently fail - GPA is optional
      } finally {
        setGpaLoading(false);
      }
    };

    fetchGPA();
  }, []);

  // Fetch semester list
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await gpaService.getMySemesters();
        if (res?.data?.success && res.data.data.length > 0) {
          setSemesters(res.data.data);
          // Select the first semester (most recent)
          setSelectedSemester(res.data.data[0]);
        }
      } catch (err) {
        console.error('Error fetching semesters:', err);
      }
    };

    fetchSemesters();
  }, []);

  // Fetch semester GPA when selected semester changes
  useEffect(() => {
    const fetchSemesterGPA = async () => {
      if (!selectedSemester) return;

      try {
        setSemesterGPALoading(true);
        const res = await gpaService.getMyGPABySemester(
          selectedSemester.semesterNumber,
          selectedSemester.academicYear
        );
        if (res?.data?.success) {
          setSemesterGPA(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching semester GPA:', err);
        setSemesterGPA(null);
      } finally {
        setSemesterGPALoading(false);
      }
    };

    fetchSemesterGPA();
  }, [selectedSemester]);

  const navItems = [
    { name: 'Trang chủ', path: '/student', icon: '🏠' },
    { name: 'Hồ sơ cá nhân', path: '/student/profile', icon: '👤' },
    { name: 'Thông báo', path: '/student/announcements', icon: '📢' },
    { name: 'Khung chương trình của tôi', path: '/student/curriculum', icon: '📖' },
    { name: 'Lịch thi của tôi', path: '/student/exams', icon: '📅' },
    { name: 'Báo cáo điểm danh', path: '/student/attendance-report', icon: '✅' },
    { name: 'Đơn từ & Thủ tục', path: '/student/applications', icon: '📄' },
    { name: 'Thời khóa biểu', path: '/student/schedule', icon: '📋' },
    { name: 'Lịch nghỉ năm', path: '/student/academic-calendar', icon: '🗓️' },
    { name: 'Wishlist', path: '/student/wishlist', icon: '⏳' },
    { name: 'Kết quả học tập', path: '/student/grades', icon: '📊' },
    { name: 'Tài chính', path: '/student/finance', icon: '💰' },
    { name: 'Ví của tôi', path: '/student/wallet', icon: '💳' },
    { name: 'Giáo trình & Tài liệu', path: '/student/materials', icon: '📚' },
  ];

  navItems.splice(4, 0, {
    name: 'Đăng ký môn học',
    path: '/student/registration',
    icon: '📝',
  });

  const handleLogout = async () => {
    try {
      // Try to logout on server
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue anyway to clear client-side data
    } finally {
      // Always clear all auth data from localStorage
      localStorage.clear();
      // Redirect to login
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } border-r border-slate-200 bg-white shadow-sm`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            {isSidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-sm font-bold text-white">FU</span>
                </div>
                <span className="font-semibold text-slate-800">Academic Portal</span>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-1.5 hover:bg-slate-100"
            >
              <span className="text-slate-600">☰</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {isSidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Support Card */}
          {isSidebarOpen && (
            <div className="border-t border-slate-200 p-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">Cần hỗ trợ?</p>
                <p className="mb-3 text-xs text-slate-500">
                  Liên hệ phòng Công tác Sinh viên
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    Hotline
                  </button>
                  <button className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                    Email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex flex-1 items-center gap-4">
              {/* Search */}
              <div className="relative w-96">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
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
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* GPA Display */}
              {gpa && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  gpa.warning
                    ? 'border-red-300 bg-red-50'
                    : 'border-green-300 bg-green-50'
                }`}>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">GPA Tổng</span>
                    <span className={`text-sm font-bold ${gpaService.getGPAColor(gpa.gpa)}`}>
                      {gpaService.formatGPA(gpa.gpa)}
                    </span>
                  </div>
                  {gpa.warning && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-semibold ml-2">
                      <span>⚠️</span>
                      <span>Cảnh báo</span>
                    </div>
                  )}
                </div>
              )}

              {/* Semester Selector */}
              {semesters.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 transition">
                    <span className="text-xs text-slate-600">
                      {selectedSemester?.semesterName || 'Chọn kỳ'}
                    </span>
                    <span className="text-sm">▼</span>
                  </button>
                  {/* Dropdown Menu */}
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-h-48 overflow-y-auto">
                    {semesters.map((sem) => (
                      <button
                        key={`${sem.semesterNumber}-${sem.academicYear}`}
                        onClick={() => setSelectedSemester(sem)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${
                          selectedSemester?.semesterNumber === sem.semesterNumber &&
                          selectedSemester?.academicYear === sem.academicYear
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sem.semesterName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Semester GPA Display */}
              {semesterGPA && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  semesterGPA.gpa < 5.0
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-blue-300 bg-blue-50'
                }`}>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">GPA Kỳ</span>
                    <span className={`text-sm font-bold ${gpaService.getGPAColor(semesterGPA.gpa)}`}>
                      {gpaService.formatGPA(semesterGPA.gpa)}
                    </span>
                  </div>
                  {semesterGPA.gpa < 5.0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold ml-1">
                      <span>⚠️</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <button className="relative rounded-lg p-2 hover:bg-slate-100">
                <svg
                  className="h-5 w-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {/* User Menu */}
              <div className="relative group flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user.fullName || 'Student'}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  className="rounded-md bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  ▼
                </button>
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link
                    to="/student/profile"
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition rounded-t-lg border-b border-slate-100"
                  >
                    👤 Xem hồ sơ cá nhân
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition rounded-b-lg"
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© 2026 FPT University. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-700">Điều khoản</a>
              <a href="#" className="hover:text-slate-700">Chính sách</a>
              <a href="#" className="hover:text-slate-700">Hỗ trợ</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
