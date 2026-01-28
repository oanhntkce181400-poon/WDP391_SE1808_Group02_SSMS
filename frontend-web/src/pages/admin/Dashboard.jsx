import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard Admin</h1>
        <p className="text-slate-600">Chào mừng đến với hệ thống quản lý SSMS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quản lý môn học */}
        <Link
          to="/admin/subjects"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-800">Quản lý Môn học</h3>
              <p className="text-sm text-slate-600">Quản lý thông tin môn học</p>
            </div>
          </div>
        </Link>

        {/* Quản lý khung chương trình */}
        <Link
          to="/admin/curriculum"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-800">Khung chương trình</h3>
              <p className="text-sm text-slate-600">Quản lý khung chương trình</p>
            </div>
          </div>
        </Link>

        {/* Quản lý người dùng */}
        <Link
          to="/admin/users"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-800">Quản lý Người dùng</h3>
              <p className="text-sm text-slate-600">Quản lý tài khoản người dùng</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
