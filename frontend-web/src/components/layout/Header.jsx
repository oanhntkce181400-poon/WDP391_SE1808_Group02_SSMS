// Header component for Admin Layout
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import graduateIcon from '../../assets/graduate.png';
import notificationIcon from '../../assets/notification.png';
import searchIcon from '../../assets/search.png';
import authService from '../../services/authService';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navItems = [
    { label: 'Lớp học', href: '#' },
    { label: 'Xếp lịch', href: '#' },
    { label: 'Chuyên ngành', href: '/admin/majors' },
    { label: 'Giảng viên', href: '#' },
    { label: 'Môn học', href: '/admin/subjects' },
    { label: 'Phòng học', href: '/admin/rooms' },
    { label: 'Giờ học', href: '/admin/timeslots' },
    { label: 'Khung chương trình', href: '/admin/curriculum' },
    { label: 'Quản lý người dùng', href: '/admin/users' },
    { label: 'Học phí', href: '/admin/tuition-fees' },
    { label: 'Đánh giá', href: '/admin/feedback-management' },
    { label: 'Thống kê Đánh giá', href: '/admin/feedback-statistics' },
    { label: 'Cấu hình', href: '/admin/settings' },
    { label: 'Nhật ký lỗi', href: '/admin/error-logs' },
  ];

  // Determine active item based on current path
  const getActiveItem = (href) => {
    if (href === '#') return false;
    if (href === '/admin/subjects' && (location.pathname === '/admin/subjects' || location.pathname.startsWith('/admin/prerequisites/'))) {
      return true;
    }
    if (href === '/admin/rooms' && location.pathname === '/admin/rooms') {
      return true;
    }
    if (href === '/admin/timeslots' && location.pathname === '/admin/timeslots') {
      return true;
    }
    if (href === '/admin/curriculum' && (location.pathname === '/admin/curriculum' || location.pathname.startsWith('/admin/curriculum/') && location.pathname.endsWith('/setup'))) {
      return true;
    }
    if (href === '/admin/settings' && location.pathname === '/admin/settings') {
      return true;
    }
    if (href === '/admin/tuition-fees' && location.pathname === '/admin/tuition-fees') {
      return true;
    }
    if (href === '/admin/majors' && location.pathname === '/admin/majors') {
      return true;
    }
    if (href === '/admin/users' && location.pathname === '/admin/users') {
      return true;
    }
    if (href === '/admin/error-logs' && location.pathname === '/admin/error-logs') {
      return true;
    }
    if (href === '/admin/feedback-management' && location.pathname === '/admin/feedback-management') {
      return true;
    }
    return false;
  };

  const avatarUrl =
    user?.avatarUrl || user?.avatar || user?.photoUrl || user?.photoURL || user?.picture;
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AD';

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // ignore and still clear local session
    } finally {
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap bg-[#1A237E] text-white px-4 lg:px-6 py-2.5 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="size-8 lg:size-9 flex items-center justify-center bg-white rounded-lg">
            <img src={graduateIcon} alt="Logo" className="w-6 lg:w-7 h-6 lg:h-7" />
          </div>
          <div className="hidden md:block leading-tight">
            <h2 className="text-white text-sm lg:text-base font-bold tracking-tight uppercase">SSMS</h2>
            <p className="text-[8px] lg:text-[10px] text-slate-300 font-medium tracking-widest">QUẢN TRỊ</p>
          </div>
        </div>
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item, index) => (
            <Link
              key={index}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium transition-colors rounded-md ${
                getActiveItem(item.href)
                  ? 'text-white bg-white/10'
                  : 'text-slate-300 hover:text-white'
              }`}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 lg:gap-6">
        <div className="relative hidden xl:block">
          <img src={searchIcon} alt="Tìm kiếm" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-slate-400" />
          <input
            className="bg-white/10 border-none rounded-full py-1.5 pl-9 pr-4 text-xs lg:text-sm w-48 lg:w-64 focus:ring-2 focus:ring-white/20 placeholder:text-slate-400 text-white"
            placeholder="Tìm kiếm..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="relative text-slate-300 hover:text-white transition-colors p-1">
          <img src={notificationIcon} alt="Thông báo" className="w-5 lg:w-6 h-5 lg:h-6" />
          <span className="absolute top-0.5 right-0.5 size-2 bg-red-500 rounded-full border-2 border-[#1A237E]"></span>
        </button>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 lg:gap-3 pl-3 lg:pl-4 border-l border-white/20 cursor-pointer hover:text-white"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{user?.fullName || 'Admin User'}</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">
                {user?.role || 'Admin'}
              </p>
            </div>
            <div className="size-8 lg:size-9 rounded-full bg-slate-200 border-2 border-white/20 bg-cover bg-center overflow-hidden flex items-center justify-center text-xs font-bold text-slate-700">
              {avatarUrl && !avatarError ? (
                <img
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  src={avatarUrl}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white py-2 text-sm text-slate-700 shadow-lg ring-1 ring-slate-900/5 z-50"
            >
              <div className="px-4 pb-2 pt-1">
                <p className="text-xs font-semibold text-slate-500">Signed in as</p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.fullName || 'Admin User'}
                </p>
              </div>
              <div className="border-t border-slate-100" />
              <Link
                to="/dashboard"
                role="menuitem"
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/actors"
                role="menuitem"
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Manage roles
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
