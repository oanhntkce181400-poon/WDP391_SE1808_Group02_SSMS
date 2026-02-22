// StudentManagementPage.jsx
// Trang quản lý sinh viên - dành cho Admin / Staff
// Chức năng: View, Create, Update, Delete, Search, Filter
// Tác giả: Group02 - WDP391

import { useState, useEffect } from 'react';
import studentService from '../../services/studentService';
import curriculumService from '../../services/curriculumService';

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
  const [curriculums, setCurriculums] = useState([]);

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
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    majorCode: '',
    cohort: '',
    curriculumId: '',
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
      const [majorsRes, cohortsRes, curriculumsRes] = await Promise.all([
        studentService.getMajors(),
        studentService.getCohorts(),
        curriculumService.getCurriculums(),
      ]);

      setMajors(majorsRes.data.data || []);
      setCohorts(cohortsRes.data.data || []);
      setCurriculums(curriculumsRes.data.data || []);
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
      email: '',
      majorCode: '',
      cohort: '',
      curriculumId: '',
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
      showSuccess(`Tạo sinh viên thành công! MSSV: ${res.data.data.studentCode}, Mật khẩu: ${res.data.data.defaultPassword}`);
      setShowCreateModal(false);
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
      curriculumId: student.curriculum?._id || '',
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

            {/* Major filter */}
            <select
              value={selectedMajor}
              onChange={(e) => {
                setSelectedMajor(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả ngành</option>
              {majors.map((m) => (
                <option key={m.majorCode} value={m.majorCode}>
                  {m.majorName}
                </option>
              ))}
            </select>

            {/* Cohort filter */}
            <select
              value={selectedCohort}
              onChange={(e) => {
                setSelectedCohort(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả khóa</option>
              {cohorts.map((c) => (
                <option key={c} value={c}>
                  K{c}
                </option>
              ))}
            </select>

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
                        Ngành
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Khóa
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
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {student.fullName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {student.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {student.majorCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          K{student.cohort}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {student.classSection || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              ACADEMIC_STATUS_STYLES[student.academicStatus]
                            }`}
                          >
                            {ACADEMIC_STATUS_LABELS[student.academicStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetail(student._id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Xem chi tiết"
                            >
                              👁️
                            </button>
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
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    Trang {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      ← Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Sau →
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
          curriculums={curriculums}
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
          curriculums={curriculums}
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
  curriculums,
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

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Identity Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CCCD/CMND
              </label>
              <input
                type="text"
                value={formData.identityNumber}
                onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

            {/* Cohort */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Khóa <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.cohort}
                onChange={(e) => setFormData({ ...formData, cohort: e.target.value })}
                placeholder="VD: 18, 19, 20"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Curriculum */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chương trình học <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.curriculumId}
                onChange={(e) => setFormData({ ...formData, curriculumId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Chọn chương trình học</option>
                {curriculums.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.curriculumName} ({c.curriculumCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Enrollment Year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Năm nhập học
              </label>
              <input
                type="number"
                value={formData.enrollmentYear}
                onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
                placeholder="VD: 2020"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                <InfoRow
                  label="Chương trình học"
                  value={student.curriculum?.curriculumName || '-'}
                />
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
