import { useState, useEffect } from 'react';
import userService from '../../services/userService';

const ViewProfile = ({ onEdit }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      }
    } catch (err) {
      setError('Không thể tải thông tin hồ sơ: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="mt-3 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchStudentProfile}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!student) {
    return <div className="text-center text-gray-600">Không tìm thấy thông tin hồ sơ</div>;
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Họ và tên
          </h3>
          <p className="text-lg font-bold text-gray-900">{student.fullName || 'N/A'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Email
          </h3>
          <p className="text-lg font-bold text-blue-600">{student.email || 'N/A'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Mã sinh viên
          </h3>
          <p className="text-lg font-bold text-gray-900">
            {student._id ? student._id.substring(0, 10).toUpperCase() : 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Vai trò
          </h3>
          <p className="text-lg font-bold text-gray-900 capitalize">{student.role || 'Student'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Trạng thái
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <p className="text-lg font-bold text-green-600 capitalize">
              {student.status || 'Active'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Ngày tạo tài khoản
          </h3>
          <p className="text-lg font-bold text-gray-900">
            {student.createdAt
              ? new Date(student.createdAt).toLocaleDateString('vi-VN')
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Edit Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onEdit}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
        >
          ✏️ Chỉnh sửa thông tin
        </button>
      </div>
    </div>
  );
};

export default ViewProfile;
