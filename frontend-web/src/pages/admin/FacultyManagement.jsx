// Faculty Management Page - CRUD operations for Faculty (Khoa)
import { useState, useEffect, useCallback } from 'react';
import facultyService from '../../services/facultyService';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function FacultyManagement() {
  // State for faculties data
  const [faculties, setFaculties] = useState([]);
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
    status: 'all',
  });

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    shortName: '',
    description: '',
    status: 'active',
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch faculties from API
  const fetchFaculties = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.status !== 'all' && { isActive: filters.status === 'active' }),
      };

      const response = await facultyService.getFaculties(params);
      
      if (response?.data?.success) {
        setFaculties(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.totalPages || 1,
          totalItems: response.data.pagination?.total || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError('Không thể tải danh sách khoa');
      showToast('Không thể tải danh sách khoa', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Load faculties on mount and when filters change
  useEffect(() => {
    fetchFaculties(1);
  }, [filters]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Handle create/edit modal
  const handleOpenModal = (faculty = null) => {
    if (faculty) {
      setSelectedFaculty(faculty);
      setFormData({
        code: faculty.facultyCode || '',
        name: faculty.facultyName || '',
        shortName: faculty.shortName || '',
        description: faculty.description || '',
        status: faculty.isActive ? 'active' : 'inactive',
      });
    } else {
      setSelectedFaculty(null);
      setFormData({
        code: '',
        name: '',
        shortName: '',
        description: '',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFaculty(null);
    setFormData({
      code: '',
      name: '',
      shortName: '',
      description: '',
      status: 'active',
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const payload = {
        facultyCode: formData.code,
        facultyName: formData.name,
        shortName: formData.shortName,
        description: formData.description,
        isActive: formData.status === 'active',
      };

      console.log('=== SUBMITTING FACULTY ===');
      console.log('FormData:', formData);
      console.log('Payload:', payload);

      if (selectedFaculty) {
        await facultyService.updateFaculty(selectedFaculty._id, payload);
        showToast('Cập nhật khoa thành công', 'success');
      } else {
        await facultyService.createFaculty(payload);
        showToast('Thêm khoa thành công', 'success');
      }
      handleCloseModal();
      fetchFaculties(pagination.currentPage);
    } catch (err) {
      console.error('Error saving faculty:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteModal = (faculty) => {
    setSelectedFaculty(faculty);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedFaculty(null);
  };

  const handleDelete = async () => {
    setModalLoading(true);
    try {
      await facultyService.deleteFaculty(selectedFaculty._id);
      showToast('Xóa khoa thành công', 'success');
      handleCloseDeleteModal();
      fetchFaculties(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting faculty:', err);
      showToast(err.response?.data?.message || 'Không thể xóa khoa', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await facultyService.exportFaculties(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `faculties_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Xuất file Excel thành công', 'success');
    } catch (err) {
      console.error('Error exporting faculties:', err);
      showToast('Không thể xuất file Excel', 'error');
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchFaculties(page);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    fetchFaculties(1);
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
              <h1 className="text-2xl font-bold text-slate-800">Quản lý Khoa</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <span className="hover:text-blue-600 cursor-pointer">🏠 Cấu hình</span>
                <img src={nextIcon} alt="/" className="w-3 h-3" />
                <span className="text-slate-700 font-medium">Khoa</span>
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
                <span className="font-medium">Thêm khoa mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TÌM KIẾM</label>
              <input
                type="text"
                placeholder="Tên hoặc mã khoa..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TRẠNG THÁI</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Mã Khoa</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tên Khoa</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tên viết tắt</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Số Ngành</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {faculties.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    faculties.map((faculty, index) => (
                      <tr key={faculty._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-700 font-medium">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-700">{faculty.facultyCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{faculty.facultyName}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {faculty.shortName || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-700">{faculty.majorCount || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            faculty.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {faculty.isActive ? 'Hoạt động' : 'Không hoạt động'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(faculty)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Sửa
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleOpenDeleteModal(faculty)}
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
                {selectedFaculty ? 'Chỉnh sửa khoa' : 'Thêm khoa mới'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mã khoa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: CIT, SE, AI..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên khoa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Khoa Công nghệ Thông tin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên viết tắt
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="CNTT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mô tả về khoa..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
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
                  {modalLoading ? 'Đang lưu...' : (selectedFaculty ? 'Cập nhật' : 'Thêm mới')}
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
                Bạn có chắc chắn muốn xóa khoa <strong>{selectedFaculty?.facultyName}</strong>?
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
