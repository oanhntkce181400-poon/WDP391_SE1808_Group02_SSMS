// StudentManagementPage.jsx
// Trang quản lý sinh viên - dành cho Admin / Staff
// Chức năng: View, Create, Update, Delete, Search, Filter
// Tác giả: Group02 - WDP391

import { useState, useEffect } from 'react';
import studentService from '../../services/studentService';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const ACADEMIC_STATUS_LABELS = {
  enrolled: 'Đang học',
  'on-leave': 'Bảo lưu',
  dropped: 'Thôi học',
  graduated: 'Tốt nghiệp',
};

const ACADEMIC_STATUS_STYLES = {
  enrolled: 'bg-green-100 text-green-800 border border-green-200',
  'on-leave': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  dropped: 'bg-red-100 text-red-800 border border-red-200',
  graduated: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const GENDER_LABELS = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Đảm bảo có ít nhất 1 ký tự mỗi loại
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Thêm các ký tự ngẫu nhiên còn lại
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Xáo trộn password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Hàm tạo email theo format: firstname + lastname_initials + studentcode@fpt.edu.vn
// Ví dụ: Nguyễn Văn Minh + SE12345 => minhNVSE12345@fpt.edu.vn
function generateEmail(fullName, studentCode) {
  // Loại bỏ dấu tiếng Việt
  const removeVietnameseTones = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Tách họ tên thành mảng
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 0) return '';
  
  // Lấy tên (phần cuối)
  const firstName = nameParts[nameParts.length - 1];
  
  // Lấy họ và tên đệm (các phần trước tên)
  const lastNameParts = nameParts.slice(0, -1);
  
  // Tạo initials từ họ và tên đệm
  const initials = lastNameParts.map(part => part.charAt(0).toUpperCase()).join('');
  
  // Loại bỏ dấu và chuyển thành chữ thường cho firstname
  const firstNameNormalized = removeVietnameseTones(firstName).toLowerCase();
  
  // Tạo email
  return `${firstNameNormalized}${initials}${studentCode}@fpt.edu.vn`;
}

// Hàm tính Khóa từ Năm nhập học
// Lấy 2 số cuối, nếu là 00 thì lấy 2 số đầu
// VD: 2026 -> '26', 2000 -> '20', 2100 -> '21'
function calculateCohort(enrollmentYear) {
  const yearStr = String(enrollmentYear);
  const lastTwo = yearStr.slice(-2);
  
  // Nếu 2 số cuối là '00', lấy 2 số đầu
  if (lastTwo === '00') {
    return yearStr.slice(0, 2);
  }
  
  // Ngược lại, lấy 2 số cuối
  return lastTwo;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function StudentManagementPage() {
  // ── STATE ──────────────────────────────────────────────────

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter options
  const [majors, setMajors] = useState([]);
  const [cohorts, setCohorts] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [limit] = useState(20);

  // Sorting
  const [sortBy, setSortBy] = useState('studentCode');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessInfoModal, setShowSuccessInfoModal] = useState(false);
  const [createdStudentInfo, setCreatedStudentInfo] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    majorCode: '',
    cohort: '',
    identityNumber: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: '',
    gender: 'other',
    enrollmentYear: '',
  });

  // ── LOAD DATA ──────────────────────────────────────────────
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [currentPage, selectedMajor, selectedCohort, selectedStatus, sortBy, sortOrder]);

  async function loadFilterOptions() {
    try {
      const [majorsRes, cohortsRes] = await Promise.all([
        studentService.getMajors(),
        studentService.getCohorts(),
      ]);

      setMajors(majorsRes.data.data || []);
      setCohorts(cohortsRes.data.data || []);
    } catch (err) {
      console.error('Lỗi tải options:', err);
    }
  }

  async function loadStudents() {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
      };

      if (searchText.trim()) params.search = searchText.trim();
      if (selectedMajor) params.majorCode = selectedMajor;
      if (selectedCohort) params.cohort = selectedCohort;
      if (selectedStatus) params.academicStatus = selectedStatus;

      const res = await studentService.getStudents(params);
      setStudents(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalStudents(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách sinh viên:', err);
      setError(err.response?.data?.message || 'Không tải được danh sách sinh viên');
    } finally {
      setIsLoading(false);
    }
  }

  // ── HANDLERS ───────────────────────────────────────────────

  function handleSearch() {
    setCurrentPage(1);
    loadStudents();
  }

  function handleSort(field) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  function resetForm() {
    setFormData({
      fullName: '',
      majorCode: '',
      cohort: '',
      identityNumber: '',
      dateOfBirth: '',
      phoneNumber: '',
      address: '',
      gender: 'other',
      enrollmentYear: '',
    });
  }

  async function handleCreate() {
    try {
      const res = await studentService.createStudent(formData);
      // Hiển thị thông tin tài khoản vừa tạo
      setCreatedStudentInfo({
        fullName: res.data.data.fullName,
        studentCode: res.data.data.studentCode,
        email: res.data.data.email,
        emailPassword: res.data.data.emailPassword || generateRandomPassword(12),
        systemPassword: res.data.data.defaultPassword,
      });
      setShowCreateModal(false);
      setShowSuccessInfoModal(true);
      resetForm();
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo sinh viên');
    }
  }

  async function handleUpdate() {
    try {
      await studentService.updateStudent(selectedStudent._id, formData);
      showSuccess('Cập nhật sinh viên thành công!');
      setShowEditModal(false);
      resetForm();
      setSelectedStudent(null);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật sinh viên');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Xác nhận xóa sinh viên này?')) return;

    try {
      await studentService.deleteStudent(id);
      showSuccess('Xóa sinh viên thành công!');
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa sinh viên');
    }
  }

  async function handleStatusChange(studentId, newStatus) {
    try {
      await studentService.updateStudent(studentId, { academicStatus: newStatus });
      showSuccess('Cập nhật trạng thái thành công!');
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
  }

  async function handleViewDetail(id) {
    try {
      const res = await studentService.getStudentById(id);
      setSelectedStudent(res.data.data);
      setShowDetailModal(true);
    } catch (err) {
      alert('Không tải được thông tin sinh viên');
    }
  }

  function handleEdit(student) {
    setSelectedStudent(student);
    setFormData({
      fullName: student.fullName,
      email: student.email,
      majorCode: student.majorCode,
      cohort: student.cohort,
      identityNumber: student.identityNumber || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      phoneNumber: student.phoneNumber || '',
      address: student.address || '',
      gender: student.gender || 'other',
      enrollmentYear: student.enrollmentYear || '',
    });
    setShowEditModal(true);
  }

  // ── RENDER ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Quản lý Sinh viên</h1>
            <p className="text-slate-600 mt-1">
              Tổng số: {totalStudents} sinh viên
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Thêm sinh viên
          </button>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Tìm kiếm theo MSSV, Tên, CCCD/CMND..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Major filter - Hidden */}
            {/* Cohort filter - Hidden */}

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="enrolled">Đang học</option>
              <option value="on-leave">Bảo lưu</option>
              <option value="dropped">Thôi học</option>
              <option value="graduated">Tốt nghiệp</option>
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Tìm kiếm
            </button>
            <button
              onClick={() => {
                setSearchText('');
                setSelectedMajor('');
                setSelectedCohort('');
                setSelectedStatus('');
                setCurrentPage(1);
              }}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Đang tải...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Không có sinh viên nào</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('studentCode')}
                      >
                        MSSV {sortBy === 'studentCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('fullName')}
                      >
                        Họ và tên {sortBy === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Số điện thoại
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Mật khẩu
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Lớp SH
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {student.studentCode}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleViewDetail(student._id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            title="Click để xem chi tiết"
                          >
                            {student.fullName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {student.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {student.phoneNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className="font-mono text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200" title="Mật khẩu mặc định = CCCD/CMND hoặc 123456">
                            {student.identityNumber || '123456'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {student.classSection || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={student.academicStatus}
                            onChange={(e) => handleStatusChange(student._id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer ${
                              ACADEMIC_STATUS_STYLES[student.academicStatus]
                            }`}
                          >
                            <option value="enrolled">Đang học</option>
                            <option value="on-leave">Bảo lưu</option>
                            <option value="dropped">Thôi học</option>
                            <option value="graduated">Tốt nghiệp</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(student)}
                              className="text-green-600 hover:text-green-800"
                              title="Sửa"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Xóa"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-center items-center">
                  <div className="text-sm text-slate-600 mr-4">
                    Hiển thị trang {currentPage} trong {totalPages} dòng
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded border ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2 py-1">...</span>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <StudentFormModal
          title="Thêm sinh viên mới"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          majors={majors}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <StudentFormModal
          title="Cập nhật sinh viên"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
            setSelectedStudent(null);
          }}
          majors={majors}
          isEdit
        />
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* SUCCESS INFO MODAL */}
      {showSuccessInfoModal && createdStudentInfo && (
        <SuccessInfoModal
          info={createdStudentInfo}
          onClose={() => {
            setShowSuccessInfoModal(false);
            setCreatedStudentInfo(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STUDENT FORM MODAL (Create / Edit)
// ─────────────────────────────────────────────────────────────
function StudentFormModal({
  title,
  formData,
  setFormData,
  onSubmit,
  onClose,
  majors,
  isEdit = false,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email - Auto generated */}
            {!isEdit && (
              <div className="md:col-span-2">
                <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-medium">ℹ️ Lưu ý:</span> Email và mật khẩu sẽ được tự động tạo theo định dạng: 
                  <span className="font-mono text-indigo-600"> tên + họ viết tắt + MSSV@fpt.edu.vn</span>
                </div>
              </div>
            )}

            {/* Identity Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CCCD/CMND
              </label>
              <input
                type="text"
                value={formData.identityNumber}
                onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                disabled={isEdit}
              />
            </div>

            {/* Major */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngành học <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.majorCode}
                onChange={(e) => setFormData({ ...formData, majorCode: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                disabled={isEdit}
                required
              >
                <option value="">Chọn ngành</option>
                {majors.map((m) => (
                  <option key={m.majorCode} value={m.majorCode}>
                    {m.majorName}
                  </option>
                ))}
              </select>
            </div>

            {/* Cohort - Hidden, auto-calculated from enrollmentYear */}

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                disabled={isEdit}
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giới tính <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                disabled={isEdit}
                required
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Enrollment Year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Năm nhập học <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.enrollmentYear}
                onChange={(e) => {
                  const year = e.target.value;
                  const cohort = year ? calculateCohort(year) : '';
                  setFormData({ ...formData, enrollmentYear: year, cohort: cohort });
                }}
                placeholder="VD: 2026"
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
                disabled={isEdit}
                required
              />
              {formData.enrollmentYear && (
                <p className="text-xs text-slate-500 mt-1">
                  Khóa sẽ tự động: K{calculateCohort(formData.enrollmentYear)}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Địa chỉ
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={onSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STUDENT DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function StudentDetailModal({ student, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-800">Chi tiết sinh viên</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Thông tin cơ bản</h3>
              <div className="space-y-3">
                <InfoRow label="MSSV" value={student.studentCode} />
                <InfoRow label="Họ và tên" value={student.fullName} />
                <InfoRow label="Email" value={student.email} />
                <InfoRow label="CCCD/CMND" value={student.identityNumber || '-'} />
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800">🔑 Thông tin đăng nhập:</p>
                  <p className="text-sm text-amber-700 mt-1">• Email: <span className="font-mono">{student.email}</span></p>
                  <p className="text-sm text-amber-700">• Mật khẩu: <span className="font-mono">{student.identityNumber || '123456'}</span></p>
                  <p className="text-xs text-amber-600 mt-2">⚠️ Mật khẩu mặc định = CCCD/CMND (nếu có) hoặc "123456"</p>
                </div>
                <InfoRow
                  label="Ngày sinh"
                  value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '-'}
                />
                <InfoRow label="Giới tính" value={GENDER_LABELS[student.gender] || '-'} />
                <InfoRow label="Số điện thoại" value={student.phoneNumber || '-'} />
                <InfoRow label="Địa chỉ" value={student.address || '-'} />
              </div>
            </div>

            {/* Academic Info */}
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Thông tin học tập</h3>
              <div className="space-y-3">
                <InfoRow label="Ngành học" value={student.majorCode} />
                <InfoRow label="Khóa" value={`K${student.cohort}`} />
                <InfoRow label="Lớp sinh hoạt" value={student.classSection || '-'} />
                <InfoRow label="Năm nhập học" value={student.enrollmentYear || '-'} />
                <InfoRow
                  label="Trạng thái"
                  value={
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        ACADEMIC_STATUS_STYLES[student.academicStatus]
                      }`}
                    >
                      {ACADEMIC_STATUS_LABELS[student.academicStatus]}
                    </span>
                  }
                />
                <InfoRow label="Số lớp đã đăng ký" value={student.enrollmentCount || 0} />
              </div>
            </div>

            {/* Wallet Info */}
            {student.wallet && (
              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Thông tin ví điện tử</h3>
                <div className="space-y-3">
                  <InfoRow
                    label="Số dư"
                    value={`${student.wallet.balance.toLocaleString()} ${student.wallet.currency}`}
                  />
                  <InfoRow
                    label="Trạng thái ví"
                    value={
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          student.wallet.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.wallet.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    }
                  />
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Thông tin hệ thống</h3>
              <div className="space-y-3">
                <InfoRow
                  label="Ngày tạo"
                  value={new Date(student.createdAt).toLocaleString('vi-VN')}
                />
                <InfoRow
                  label="Ngày cập nhật"
                  value={new Date(student.updatedAt).toLocaleString('vi-VN')}
                />
                {student.createdBy && (
                  <InfoRow
                    label="Người tạo"
                    value={`${student.createdBy.fullName} (${student.createdBy.email})`}
                  />
                )}
                {student.updatedBy && (
                  <InfoRow
                    label="Người cập nhật"
                    value={`${student.updatedBy.fullName} (${student.updatedBy.email})`}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component
function InfoRow({ label, value }) {
  return (
    <div className="flex">
      <span className="font-medium text-slate-700 w-1/3">{label}:</span>
      <span className="text-slate-600 w-2/3">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUCCESS INFO MODAL - Hiển thị thông tin tài khoản sau khi tạo
// ─────────────────────────────────────────────────────────────
function SuccessInfoModal({ info, onClose }) {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200 bg-green-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ✅ Tạo sinh viên thành công!
          </h2>
        </div>

        <div className="p-6">
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Lưu ý: Hãy lưu lại thông tin này! Không thể xem lại sau.
            </p>
          </div>

          <div className="space-y-4">
            {/* Họ tên */}
            <div>
              <label className="text-sm font-semibold text-slate-600">Họ và tên</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-medium text-slate-800">{info.fullName}</p>
              </div>
            </div>

            {/* MSSV */}
            <div>
              <label className="text-sm font-semibold text-slate-600">Mã số sinh viên</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-mono font-medium text-slate-800">{info.studentCode}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(info.studentCode, 'studentCode')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"
                  title="Copy"
                >
                  {copied === 'studentCode' ? '✓' : '📋'}
                </button>
              </div>
            </div>

            {/* Email - Dùng để đăng nhập */}
            <div>
              <label className="text-sm font-semibold text-slate-600">📧 Email đăng nhập</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-mono text-sm text-blue-800">{info.email}</p>
                  <p className="text-xs text-blue-600 mt-1">Dùng email này để đăng nhập hệ thống</p>
                </div>
                <button
                  onClick={() => copyToClipboard(info.email, 'email')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"
                  title="Copy"
                >
                  {copied === 'email' ? '✓' : '📋'}
                </button>
              </div>
            </div>

            {/* Mật khẩu hệ thống - Dùng để đăng nhập */}
            <div>
              <label className="text-sm font-semibold text-slate-600">🔑 Mật khẩu đăng nhập hệ thống</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-mono text-sm text-green-800">{info.systemPassword}</p>
                  <p className="text-xs text-green-600 mt-1">⚠️ Dùng mật khẩu này để đăng nhập hệ thống</p>
                </div>
                <button
                  onClick={() => copyToClipboard(info.systemPassword, 'systemPassword')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"
                  title="Copy"
                >
                  {copied === 'systemPassword' ? '✓' : '📋'}
                </button>
              </div>
            </div>

            {/* Mật khẩu Email - Chỉ để tham khảo */}
            <div>
              <label className="text-sm font-semibold text-slate-600">📧 Mật khẩu Email (tham khảo)</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="font-mono text-sm text-purple-800">{info.emailPassword}</p>
                  <p className="text-xs text-purple-600 mt-1">Dùng để đăng nhập email FPT</p>
                </div>
                <button
                  onClick={() => copyToClipboard(info.emailPassword, 'emailPassword')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg"
                  title="Copy"
                >
                  {copied === 'emailPassword' ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Đã lưu, đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
