// Header component for Admin Layout
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import graduateIcon from '../../assets/graduate.png';
import notificationIcon from '../../assets/notification.png';
import searchIcon from '../../assets/search.png';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  const navItems = [
    { label: 'Lớp học', href: '#' },
    { label: 'Xếp lịch', href: '#' },
    { label: 'Chuyên ngành', href: '/admin/majors' },
    { label: 'Giảng viên', href: '#' },
    { label: 'Môn học', href: '/admin/subjects' },
    { label: 'Phòng học', href: '/admin/rooms' },
    { label: 'Giờ học', href: '/admin/timeslots' },
    { label: 'Khung chương trình', href: '/admin/curriculum' },
<<<<<<< HEAD
    { label: 'Quản lý người dùng', href: '/admin/users' }, // NEW: User management nav
    { label: 'Cấu hình', href: '/admin/settings' },
=======
    { label: 'Học phí', href: '/admin/tuition-fees' },
    { label: 'Cấu hình', href: '#' },
>>>>>>> 35bb7140f7e52bf9db54cc63a3716fbf49850ef8
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
<<<<<<< HEAD

    if (href === '/admin/settings' && location.pathname === '/admin/settings') {
      return true;
    }
    return location.pathname === href;

=======
    if (href === '/admin/tuition-fees' && location.pathname === '/admin/tuition-fees') {
      return true;
    }
>>>>>>> 35bb7140f7e52bf9db54cc63a3716fbf49850ef8
    if (href === '/admin/majors' && location.pathname === '/admin/majors') {
      return true;
    }
    return false;
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
        <div className="flex items-center gap-2 lg:gap-3 pl-3 lg:pl-4 border-l border-white/20">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">Admin User</p>
            <p className="text-[10px] text-slate-300 uppercase tracking-wider">Quản trị viên</p>
          </div>
          <div className="size-8 lg:size-9 rounded-full bg-slate-200 border-2 border-white/20 bg-cover bg-center overflow-hidden">
            <img
              alt="Avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRfV6f8CVepX3IO9uGQA2Of8U9tQi1mPcN4AJnF0AG_5N4pf6Zl64eYi1s6ogzij3BrsQnj0zlRoeeozzp6Vbykqqy5TpFw0ICSroLq29vFVbGLCtlrRA_WTpz-gETj0mpD3fbxwQyJE_PpQ7aNklZ61Txl03xl4FFObbR0-TbpYEQ52Uxax0eoOB8kX4EqGn17YU2u6RcmxTJbZ4-mRdW0XIB1QMu8otb7tzBy3mbzNpuYhmH90PG__w9bOAFqIIlhsOSaO3KEPM"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

