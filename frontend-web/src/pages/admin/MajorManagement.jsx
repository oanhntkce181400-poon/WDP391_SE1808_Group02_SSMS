// Major Management Page - CRUD operations for Majors (Ngành đào tạo)
import { useState, useEffect, useCallback } from 'react';
import majorService from '../../services/majorService';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function MajorManagement() {
  // State for majors data
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  // State for filters
  const [filters, setFilters] = useState({
    keyword: '',
    faculty: 'all',
    status: 'all',
  });

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    faculty: '',
    status: 'active',
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Faculty options
  const faculties = [
    { value: 'all', label: 'Tất cả Khoa' },
    { value: 'Khoa Công nghệ thông tin', label: 'Khoa Công nghệ thông tin' },
    { value: 'Khoa Kinh tế và Luật', label: 'Khoa Kinh tế và Luật' },
    { value: 'Khoa Ngôn ngữ anh', label: 'Khoa Ngôn ngữ anh' },
  ];

  // Fetch majors from API
  const fetchMajors = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.faculty !== 'all' && { faculty: filters.faculty }),
        ...(filters.status !== 'all' && { isActive: filters.status === 'active' }),
      };

      const response = await majorService.getMajors(params);
      
      if (response?.data?.success) {
        setMajors(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.totalPages || 1,
          totalItems: response.data.pagination?.total || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching majors:', err);
      setError('Không thể tải danh sách ngành đào tạo');
      showToast('Không thể tải danh sách ngành đào tạo', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Load majors on mount and when filters change
  useEffect(() => {
    fetchMajors(1);
  }, [filters]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Handle create/edit modal
  const handleOpenModal = (major = null) => {
    if (major) {
      setSelectedMajor(major);
      setFormData({
        code: major.majorCode || '',
        name: major.majorName || '',
        nameEn: major.majorNameEn || '',
        faculty: major.faculty || '',
        status: major.isActive ? 'active' : 'inactive',
      });
    } else {
      setSelectedMajor(null);
      setFormData({
        code: '',
        name: '',
        nameEn: '',
        faculty: '',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMajor(null);
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      faculty: '',
      status: 'active',
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const payload = {
        majorCode: formData.code,
        majorName: formData.name,
        majorNameEn: formData.nameEn,
        faculty: formData.faculty,
        isActive: formData.status === 'active',
      };

      console.log('=== SUBMITTING MAJOR ===');
      console.log('FormData:', formData);
      console.log('Payload:', payload);

      if (selectedMajor) {
        await majorService.updateMajor(selectedMajor._id, payload);
        showToast('Cập nhật ngành đào tạo thành công', 'success');
      } else {
        await majorService.createMajor(payload);
        showToast('Thêm ngành đào tạo thành công', 'success');
      }
      handleCloseModal();
      fetchMajors(pagination.currentPage);
    } catch (err) {
      console.error('Error saving major:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteModal = (major) => {
    setSelectedMajor(major);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedMajor(null);
  };

  const handleDelete = async () => {
    setModalLoading(true);
    try {
      await majorService.deleteMajor(selectedMajor._id);
      showToast('Xóa ngành đào tạo thành công', 'success');
      handleCloseDeleteModal();
      fetchMajors(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting major:', err);
      showToast(err.response?.data?.message || 'Không thể xóa ngành đào tạo', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await majorService.exportMajors(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `majors_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Xuất file Excel thành công', 'success');
    } catch (err) {
      console.error('Error exporting majors:', err);
      showToast('Không thể xuất file Excel', 'error');
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchMajors(page);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    fetchMajors(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quản lý Ngành đào tạo</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <span className="hover:text-blue-600 cursor-pointer">🏠 Cấu hình</span>
                <img src={nextIcon} alt="/" className="w-3 h-3" />
                <span className="text-slate-700 font-medium">Ngành đào tạo</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span>📥</span>
                <span className="font-medium">Xuất Excel</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <img src={addIcon} alt="+" className="w-4 h-4 invert" />
                <span className="font-medium">Thêm ngành mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TÌM KIẾM</label>
              <input
                type="text"
                placeholder="Tên hoặc mã ngành..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">KHOA QUẢN LÝ</label>
              <select
                value={filters.faculty}
                onChange={(e) => handleFilterChange('faculty', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả Khoa</option>
                {faculties.map(faculty => (
                  <option key={faculty.value} value={faculty.value}>{faculty.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TRẠNG THÁI</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang đào tạo</option>
                <option value="inactive">Ngừng tuyển sinh</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="container mx-auto px-6 pb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Đang tải...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">{error}</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Ngành</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tên Ngành Đào Tạo</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Khoa Quản Lý</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Số Lượng SV</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {majors.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    majors.map((major, index) => (
                      <tr key={major._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-700 font-medium">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-700">{major.majorCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{major.majorName}</div>
                            <div className="text-xs text-slate-500">{major.majorNameEn}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{major.faculty}</td>
                        <td className="px-6 py-4 text-slate-700">{major.studentCount || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            major.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {major.isActive ? 'Đang đào tạo' : 'Ngừng tuyển sinh'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(major)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Sửa
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleOpenDeleteModal(major)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Hiển thị {((pagination.currentPage - 1) * pagination.limit) + 1} đến{' '}
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} trong tổng số{' '}
                  {pagination.totalItems} bản ghi
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded ${
                        page === pagination.currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  {pagination.totalPages > 3 && (
                    <>
                      <span className="text-slate-400">...</span>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        &gt;
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedMajor ? 'Chỉnh sửa ngành đào tạo' : 'Thêm ngành đào tạo mới'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mã ngành <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: SE, AI, IB..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên ngành (Tiếng Việt) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kỹ thuật phần mềm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên ngành (Tiếng Anh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Software Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Khoa quản lý <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn khoa</option>
                  {faculties.filter(f => f.value !== 'all').map(faculty => (
                    <option key={faculty.value} value={faculty.value}>{faculty.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Đang đào tạo</option>
                  <option value="inactive">Ngừng tuyển sinh</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Đang lưu...' : (selectedMajor ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Xác nhận xóa</h2>
              <p className="text-slate-600 mb-6">
                Bạn có chắc chắn muốn xóa ngành <strong>{selectedMajor?.name}</strong>?
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={modalLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
