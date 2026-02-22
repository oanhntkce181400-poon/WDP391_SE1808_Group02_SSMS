import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      // Try to load basic statistics
      const [users, classes, subjects] = await Promise.all([
        axiosClient.get('/users?limit=1').catch(() => ({ data: { total: 0 } })),
        axiosClient.get('/classes?limit=1').catch(() => ({ data: { total: 0 } })),
        axiosClient.get('/subjects?limit=1').catch(() => ({ data: { total: 0 } }))
      ]);

      setStats({
        totalUsers: users?.data?.total || 0,
        totalClasses: classes?.data?.total || 0,
        totalSubjects: subjects?.data?.total || 0,
        totalStudents: 0
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Lỗi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: 'Người dùng',
      value: stats.totalUsers,
      icon: '👥',
      color: 'blue'
    },
    {
      title: 'Lớp học',
      value: stats.totalClasses,
      icon: '🏫',
      color: 'green'
    },
    {
      title: 'Môn học',
      value: stats.totalSubjects,
      icon: '📚',
      color: 'purple'
    },
    {
      title: 'Sinh viên',
      value: stats.totalStudents,
      icon: '🎓',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Chào mừng quay trở lại. Đây là tổng quan của hệ thống.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : card.value}
                </p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Hành động nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/admin/subjects"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-gray-900">📚 Quản lý Môn học</p>
            <p className="text-sm text-gray-600 mt-1">Thêm, sửa, xóa môn học</p>
          </a>
          <a
            href="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <p className="font-semibold text-gray-900">👥 Quản lý Người dùng</p>
            <p className="text-sm text-gray-600 mt-1">Quản lý tài khoản người dùng</p>
          </a>
          <a
            href="/admin/classes"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <p className="font-semibold text-gray-900">🏫 Quản lý Lớp học</p>
            <p className="text-sm text-gray-600 mt-1">Quản lý danh sách lớp học</p>
          </a>
          <a
            href="/admin/rooms"
            className="p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition"
          >
            <p className="font-semibold text-gray-900">🚪 Quản lý Phòng học</p>
            <p className="text-sm text-gray-600 mt-1">Cấu hình phòng học</p>
          </a>
          <a
            href="/admin/timeslots"
            className="p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition"
          >
            <p className="font-semibold text-gray-900">⏰ Quản lý Giờ học</p>
            <p className="text-sm text-gray-600 mt-1">Cấu hình giờ học</p>
          </a>
          <a
            href="/admin/feedback-management"
            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
          >
            <p className="font-semibold text-gray-900">📝 Quản lý Đánh giá</p>
            <p className="text-sm text-gray-600 mt-1">Template và form đánh giá</p>
          </a>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">👋 Chào mừng Admin!</h3>
        <p className="text-gray-700 mb-4">
          Hệ thống quản lý học tập của bạn đã sẵn sàng. Bạn có thể bắt đầu bằng cách:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li>✓ Tạo mới môn học hoặc cập nhật thông tin hiện có</li>
          <li>✓ Quản lý danh sách người dùng và quyền hạn</li>
          <li>✓ Cấu hình lớp học, phòng học và giờ học</li>
          <li>✓ Tạo các template đánh giá cho sinh viên</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
