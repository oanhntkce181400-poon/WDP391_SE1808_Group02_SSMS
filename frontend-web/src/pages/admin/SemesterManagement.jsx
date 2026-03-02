// Semester Management Page - CRUD operations for Semester (Kỳ học)
import { useState, useEffect, useCallback } from 'react';
import semesterService from '../../services/semesterService';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';

export default function SemesterManagement() {
  // State for semesters data
  const [semesters, setSemesters] = useState([]);
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
    isActive: 'all',
  });

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    semesterNum: '1',
    startDate: '',
    endDate: '',
    description: '',
    isCurrent: false,
    isActive: true,
  });

  // State for toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch semesters from API
  const fetchSemesters = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive === 'active' }),
      };

      const response = await semesterService.getAll(params);
      
      if (response?.data?.success) {
        setSemesters(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.totalPages || 1,
          totalItems: response.data.pagination?.total || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
      setError('Không thể tải danh sách kỳ học');
      showToast('Không thể tải danh sách kỳ học', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Load semesters on mount and when filters change
  useEffect(() => {
    fetchSemesters(1);
  }, [filters]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Handle create/edit modal
  const handleOpenModal = (semester = null) => {
    if (semester) {
      setSelectedSemester(semester);
      setFormData({
        code: semester.code || '',
        name: semester.name || '',
        semesterNum: String(semester.semesterNum || '1'),
        startDate: semester.startDate ? semester.startDate.split('T')[0] : '',
        endDate: semester.endDate ? semester.endDate.split('T')[0] : '',
        description: semester.description || '',
        isCurrent: semester.isCurrent || false,
        isActive: semester.isActive !== false,
      });
    } else {
      setSelectedSemester(null);
      setFormData({
        code: '',
        name: '',
        semesterNum: '1',
        startDate: '',
        endDate: '',
        description: '',
        isCurrent: false,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSemester(null);
    setFormData({
      code: '',
      name: '',
      semesterNum: '1',
      startDate: '',
      endDate: '',
      description: '',
      isCurrent: false,
      isActive: true,
    });
  };

  // Auto-generate code and name when semesterNum changes
  useEffect(() => {
    if (!selectedSemester && formData.semesterNum) {
      const name = `Kỳ ${formData.semesterNum}`;
      const code = `HK${formData.semesterNum}`;
      
      setFormData(prev => ({
        ...prev,
        name,
        code
      }));
    }
  }, [formData.semesterNum, selectedSemester]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        semesterNum: parseInt(formData.semesterNum, 10),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        description: formData.description || null,
        isCurrent: formData.isCurrent,
        isActive: formData.isActive,
      };

      if (selectedSemester) {
        await semesterService.update(selectedSemester.id, payload);
        showToast('Cập nhật kỳ học thành công', 'success');
      } else {
        await semesterService.create(payload);
        showToast('Thêm kỳ học thành công', 'success');
      }
      handleCloseModal();
      fetchSemesters(pagination.currentPage);
    } catch (err) {
      console.error('Error saving semester:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleOpenDeleteModal = (semester) => {
    setSelectedSemester(semester);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedSemester(null);
  };

  const handleDelete = async () => {
    setModalLoading(true);
    try {
      await semesterService.remove(selectedSemester.id);
      showToast('Xóa kỳ học thành công', 'success');
      handleCloseDeleteModal();
      fetchSemesters(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting semester:', err);
      showToast(err.response?.data?.message || 'Không thể xóa kỳ học', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchSemesters(page);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    fetchSemesters(1);
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
              <h1 className="text-2xl font-bold text-slate-800">Quản lý Kỳ học</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <span className="hover:text-blue-600 cursor-pointer">🏠 Cấu hình</span>
                <img src={nextIcon} alt="/" className="w-3 h-3" />
                <span className="text-slate-700 font-medium">Kỳ học</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <img src={addIcon} alt="+" className="w-4 h-4 invert" />
                <span className="font-medium">Thêm kỳ học mới</span>
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
                placeholder="Tên hoặc mã kỳ..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TRẠNG THÁI</label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Mã kỳ</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tên kỳ học</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Số kỳ</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Hiện tại</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {semesters.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    semesters.map((semester, index) => (
                      <tr key={semester.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-700 font-medium">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-700">{semester.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{semester.name}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          Kỳ {semester.semesterNum}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {semester.startDate && semester.endDate ? (
                            <>
                              {new Date(semester.startDate).toLocaleDateString('vi-VN')} - 
                              {new Date(semester.endDate).toLocaleDateString('vi-VN')}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {semester.isCurrent && (
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Hiện tại
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            semester.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {semester.isActive ? 'Hoạt động' : 'Không hoạt động'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(semester)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Sửa
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleOpenDeleteModal(semester)}
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
                {selectedSemester ? 'Chỉnh sửa kỳ học' : 'Thêm kỳ học mới'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Số kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.semesterNum}
                  onChange={(e) => setFormData({ ...formData, semesterNum: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mã kỳ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="HK1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tên kỳ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Kỳ 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mô tả về kỳ học..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    checked={formData.isCurrent}
                    onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isCurrent" className="text-sm text-slate-700">
                    Kỳ hiện tại
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">
                    Hoạt động
                  </label>
                </div>
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
                  {modalLoading ? 'Đang lưu...' : (selectedSemester ? 'Cập nhật' : 'Thêm mới')}
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
                Bạn có chắc chắn muốn xóa kỳ học <strong>{selectedSemester?.name}</strong>?
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
