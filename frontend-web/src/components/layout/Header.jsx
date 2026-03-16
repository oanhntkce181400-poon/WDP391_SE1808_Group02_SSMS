import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import graduateIcon from '../../assets/graduate.png';
import notificationIcon from '../../assets/notification.png';
import searchIcon from '../../assets/search.png';
import authService from '../../services/authService';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const menuRef = useRef(null);
  const moreRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const primaryNav = [
    { label: 'Lớp học', href: '/admin/classes' },
    { label: 'Môn học', href: '/admin/subjects' },
    { label: 'Phòng học', href: '/admin/rooms' },
    { label: 'Khung chương trình', href: '/admin/curriculum-list' },
    { label: 'Người dùng', href: '/admin/users' },
    { label: 'Sinh viên', href: '/admin/students' },
    { label: 'Đơn từ', href: '/admin/requests' },
    { label: 'Điểm danh', href: '/admin/attendance' },
  ];

  const moreNav = [
    { label: 'Lịch thi', href: '/admin/exam-scheduling' },
    { label: 'Khoa', href: '/admin/faculties' },
    { label: 'Học kỳ', href: '/admin/semesters' },
    { label: 'Chuyên ngành', href: '/admin/majors' },
    { label: 'Giảng viên', href: '/admin/lecturers' },
    { label: 'Giờ học', href: '/admin/timeslots' },
    { label: 'Học phí', href: '/admin/tuition-fees' },
    { label: null, href: null },
    { label: 'Kỳ đăng ký', href: '/admin/registration-periods' },
    { label: 'Tự động xếp lớp', href: '/admin/auto-enrollment' },
    { label: 'Duyệt wishlist', href: '/admin/wishlist' },
    { label: 'Lịch giảng dạy', href: '/admin/teaching-schedule' },
    { label: 'Đánh giá', href: '/admin/feedback-management' },
    { label: 'Thống kê đánh giá', href: '/admin/feedback-statistics' },
    { label: null, href: null },
    { label: 'Cài đặt', href: '/admin/settings' },
    { label: 'Nhật ký lỗi', href: '/admin/error-logs' },
    { label: 'Nhân sự', href: '/admin/actors' },
  ];

  const getActiveItem = (href) => {
    if (!href || href === '#') return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const avatarUrl = user?.avatarUrl || user?.avatar || user?.photoUrl || user?.photoURL || user?.picture;
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
    } catch (error) {
      // Ignore logout error and clear local session anyway.
    } finally {
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap bg-[#1A237E] px-4 py-2.5 text-white shadow-md lg:px-6">
      <div className="flex items-center gap-4 lg:gap-6">
        <Link to="/admin/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80 lg:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white lg:h-9 lg:w-9">
            <img src={graduateIcon} alt="Logo" className="h-6 w-6 lg:h-7 lg:w-7" />
          </div>
          <div className="hidden leading-tight md:block">
            <h2 className="text-sm font-bold uppercase tracking-tight text-white lg:text-base">SSMS</h2>
            <p className="text-[8px] font-medium tracking-widest text-slate-300 lg:text-[10px]">QUẢN TRỊ</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors lg:px-3 lg:text-sm ${
                getActiveItem(item.href) ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'
              }`}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}

          <div ref={moreRef} className="relative">
            <button
              onClick={() => setIsMoreOpen((prev) => !prev)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors lg:px-3 lg:text-sm ${
                isMoreOpen ? 'bg-white/20 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Thêm
              <span className={`text-[10px] transition-transform ${isMoreOpen ? 'scale-y-[-1]' : ''}`}>▼</span>
            </button>

            {isMoreOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl bg-white py-1.5 shadow-xl ring-1 ring-slate-900/10">
                {moreNav.map((item, index) => {
                  if (!item.href) {
                    return <div key={`separator-${index}`} className="my-1 border-t border-slate-100" />;
                  }

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        getActiveItem(item.href)
                          ? 'bg-indigo-50 font-medium text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="relative hidden xl:block">
          <img
            src={searchIcon}
            alt="Tìm kiếm"
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 lg:h-5 lg:w-5"
          />
          <input
            className="w-48 rounded-full border-none bg-white/10 py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-slate-400 focus:ring-2 focus:ring-white/20 lg:w-64 lg:text-sm"
            placeholder="Tìm kiếm..."
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <button className="relative p-1 text-slate-300 transition-colors hover:text-white">
          <img src={notificationIcon} alt="Thông báo" className="h-5 w-5 lg:h-6 lg:w-6" />
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-[#1A237E] bg-red-500" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex cursor-pointer items-center gap-2 border-l border-white/20 pl-3 text-white lg:gap-3 lg:pl-4"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold">{user?.fullName || 'Admin User'}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-300">{user?.role || 'Admin'}</p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-slate-200 text-xs font-bold text-slate-700 lg:h-9 lg:w-9">
              {avatarUrl && !avatarError ? (
                <img alt="Avatar" className="h-full w-full object-cover" src={avatarUrl} onError={() => setAvatarError(true)} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 rounded-xl bg-white py-2 text-sm text-slate-700 shadow-lg ring-1 ring-slate-900/5"
            >
              <div className="px-4 pb-2 pt-1">
                <p className="text-xs font-semibold text-slate-500">Đăng nhập với</p>
                <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName || 'Admin User'}</p>
              </div>
              <div className="border-t border-slate-100" />
              <Link
                to="/dashboard"
                role="menuitem"
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Hồ sơ
              </Link>
              <Link
                to="/actors"
                role="menuitem"
                className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Quản lý vai trò
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
