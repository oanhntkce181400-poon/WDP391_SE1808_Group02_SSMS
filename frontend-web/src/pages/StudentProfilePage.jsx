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

  // Mock data for enrolled courses
  const enrolledCourses = [
    {
      id: 1,
      name: 'Lập trình ứng dụng Web',
      instructor: 'TS. Trần Hoàng Ngoán',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      id: 2,
      name: 'Cơ sở dữ liệu nâng cao',
      instructor: 'ThS. Nguyễn Thị Mái',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      id: 3,
      name: 'Kiến trúc phần mềm',
      instructor: 'PGS. Đỗ Minh Đức',
      status: 'ĐANG HỌC',
      statusColor: 'bg-green-100 text-green-800',
    },
  ];

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();
      const studentData = response.data || response;
      if (studentData) {
        setStudent(studentData);
        // Update localStorage with latest user data
        localStorage.setItem('auth_user', JSON.stringify(studentData));
        setEditFormData({
          fullName: studentData.fullName,
          email: studentData.email,
        });
      }
    } catch (err) {
      setError('Failed to load student profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUploadSuccess = () => {
    setSuccessMessage('Avatar updated successfully!');
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
      const response = await userService.updateProfile(editFormData);
      const studentData = response.data || response;
      if (studentData) {
        setStudent(studentData);
        // Update localStorage with new user data
        localStorage.setItem('auth_user', JSON.stringify(studentData));
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
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
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={fetchStudentProfile}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center mb-8">
            <AvatarUploader
              currentAvatar={student?.avatarUrl}
              onUploadSuccess={handleAvatarUploadSuccess}
            />

            {!isEditing ? (
              <div className="mt-6 w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {student?.fullName}
                </h1>
                <p className="text-gray-600 mb-6">
                  Student ID: {student?._id || 'N/A'}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Chính sửa hồ sơ
                  </button>
                  <button
                    onClick={handleDownloadCV}
                    className="px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    Tải xuống CV
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 w-full max-w-md">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={editFormData.fullName || ''}
                      onChange={handleEditChange}
                      placeholder="Enter full name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email || ''}
                      onChange={handleEditChange}
                      placeholder="Enter email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditFormData({
                          fullName: student?.fullName,
                          email: student?.email,
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white rounded-lg shadow-md p-4 text-center border-t-4 border-blue-500">
              <p className="text-gray-600 text-sm font-medium">STUDENT ID</p>
              <p className="text-xl font-bold text-gray-800 mt-2">SV20240102</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center border-t-4 border-green-500">
              <p className="text-gray-600 text-sm font-medium">MAJOR</p>
              <p className="text-xl font-bold text-gray-800 mt-2">
                Công nghệ thông tin
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center border-t-4 border-purple-500">
              <p className="text-gray-600 text-sm font-medium">SEMESTER</p>
              <p className="text-xl font-bold text-gray-800 mt-2">Năm thứ 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Học phần hiện tại</h2>
          <a href="#" className="text-blue-500 hover:text-blue-600 font-medium">
            Xem tất cả
          </a>
        </div>

        {/* Courses Grid */}
        <div className="space-y-3">
          {enrolledCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C6.248 6.253 2 10.537 2 15.75c0 5.213 4.248 9.5 10 9.5s10-4.287 10-9.5c0-5.213-4.248-9.5-10-9.5z"
                      />
                    </svg>
                    <h3 className="font-semibold text-gray-800">
                      {course.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">{course.instructor}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-4 ${course.statusColor}`}
                >
                  {course.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
        <p>© 2024 EduAdmin Management System. All rights reserved.</p>
      </div>
    </div>
  );
};

export default StudentProfilePage;
