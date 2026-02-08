import { useState, useEffect } from 'react';
import userService from '../services/userService';
import AvatarUploader from '../components/features/AvatarUploader';

const StudentProfilePage = () => {
  const [student, setStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Mock data for enrolled courses
  const enrolledCourses = [
    {
      id: 1,
      name: 'Lập trình ứng dụng Web',
      instructor: 'TS. Trần Hoàng Ngoán',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
      credits: 3,
      semester: 'HK1 2024-2025',
    },
    {
      id: 2,
      name: 'Cơ sở dữ liệu nâng cao',
      instructor: 'ThS. Nguyễn Thị Mái',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
      credits: 3,
      semester: 'HK1 2024-2025',
    },
    {
      id: 3,
      name: 'Kiến trúc phần mềm',
      instructor: 'PGS. Đỗ Minh Đức',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
      credits: 4,
      semester: 'HK1 2024-2025',
    },
    {
      id: 4,
      name: 'Kỹ năng mềm cho IT',
      instructor: 'Ths. Lê Minh Tú',
      status: 'HOÀN THÀNH',
      statusColor: 'bg-blue-100 text-blue-800',
      credits: 2,
      semester: 'HK2 2023-2024',
    },
  ];

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getProfile();
      const studentData = response.data?.data || response.data || response;
      if (studentData) {
        setStudent(studentData);
        setEditFormData({
          fullName: studentData.fullName || '',
          email: studentData.email || '',
        });
      }
    } catch (err) {
      setError('Không thể tải thông tin hồ sơ: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUploadSuccess = () => {
    setSuccessMessage('Avatar được cập nhật thành công!');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchStudentProfile(); // Refresh profile data
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await userService.updateProfile(editFormData);
      const studentData = response.data?.data || response.data || response;
      if (studentData) {
        setStudent(studentData);
        setIsEditing(false);
        setSuccessMessage('Hồ sơ được cập nhật thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Cập nhật hồ sơ thất bại: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCV = () => {
    // Placeholder for CV download functionality
    alert('CV download feature coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-lg font-semibold text-red-600 mb-2">Có lỗi xảy ra</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchStudentProfile}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          ✓ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          ✗ {error}
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center mb-8">
            <AvatarUploader
              currentAvatar={student?.avatarUrl}
              onUploadSuccess={handleAvatarUploadSuccess}
            />

            {!isEditing ? (
              <div className="mt-8 w-full">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  {student?.fullName || 'N/A'}
                </h1>
                <p className="text-gray-600 mb-2">
                  Mã sinh viên: <span className="font-semibold">{student?._id ? student._id.substring(0, 8).toUpperCase() : 'N/A'}</span>
                </p>
                <p className="text-gray-600 mb-6">
                  Email: <span className="font-semibold text-blue-600">{student?.email}</span>
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                  >
                    ✏️ Chỉnh sửa hồ sơ
                  </button>
                  <button
                    onClick={handleDownloadCV}
                    className="px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    📄 Tải xuống CV
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 w-full max-w-2xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Chỉnh sửa thông tin cá nhân</h2>
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={editFormData.fullName}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="Nhập địa chỉ email"
                    />
                  </div>
                  <div className="flex gap-3 justify-center pt-4">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditFormData({
                          fullName: student?.fullName || '',
                          email: student?.email || '',
                        });
                        setError(null);
                      }}
                      className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium shadow-md"
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <div className="bg-white rounded-lg shadow-md p-5 text-center border-t-4 border-blue-500 hover:shadow-lg transition">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Mã sinh viên</p>
              <p className="text-2xl font-bold text-gray-800 mt-3">{student?._id ? student._id.substring(0, 10).toUpperCase() : 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 text-center border-t-4 border-green-500 hover:shadow-lg transition">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Chuyên ngành</p>
              <p className="text-2xl font-bold text-gray-800 mt-3">Công nghệ thông tin</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 text-center border-t-4 border-purple-500 hover:shadow-lg transition">
              <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Trạng thái</p>
              <p className="text-2xl font-bold text-green-600 mt-3">Hoạt động</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Các học phần hiện tại</h2>
            <p className="text-gray-600 text-sm mt-1">Hiển thị danh sách các môn học bạn đang theo học</p>
          </div>
          <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
            Xem tất cả →
          </a>
        </div>

        {/* Courses Grid */}
        {enrolledCourses && enrolledCourses.length > 0 ? (
          <div className="space-y-3">
            {enrolledCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg transition-all duration-300 p-5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg">📚</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition">
                          {course.name}
                        </h3>
                        <p className="text-sm text-gray-600">👨‍🏫 {course.instructor}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 ml-13 mt-2">
                      <span>📅 {course.semester}</span>
                      <span>⭐ {course.credits} tín chỉ</span>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${course.statusColor}`}
                  >
                    {course.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600">Bạn chưa đăng ký môn học nào</p>
          </div>
        )}
      </div>

      {/* Additional Info Section */}
      <div className="bg-gray-50 py-12 px-4 mt-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Thông tin bổ sung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 shadow text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-gray-600 text-sm mb-1">GPA</p>
              <p className="text-2xl font-bold text-gray-800">3.45</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-gray-600 text-sm mb-1">Tín chỉ đạt</p>
              <p className="text-2xl font-bold text-gray-800">45</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow text-center">
              <div className="text-3xl mb-2">📚</div>
              <p className="text-gray-600 text-sm mb-1">Tín chỉ còn lại</p>
              <p className="text-2xl font-bold text-gray-800">75</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow text-center">
              <div className="text-3xl mb-2">🎓</div>
              <p className="text-gray-600 text-sm mb-1">Năm học</p>
              <p className="text-2xl font-bold text-gray-800">Năm 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-6 text-center text-gray-600 text-sm">
        <p>© 2024 Hệ thống quản lý học vụ. Các quyền được bảo lưu.</p>
        <p className="mt-2 text-xs text-gray-500">Lần cập nhật lần cuối: {student?.updatedAt ? new Date(student.updatedAt).toLocaleString('vi-VN') : 'N/A'}</p>
      </div>
    </div>
  );
};

export default StudentProfilePage;
