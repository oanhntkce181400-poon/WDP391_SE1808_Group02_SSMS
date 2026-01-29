// Curriculum List Page - CRUD for Curriculum Frameworks
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import addIcon from '../../assets/circle.png';
import editIcon from '../../assets/edit.png';
import deleteIcon from '../../assets/delete.png';
import setupIcon from '../../assets/next.png';
import curriculumService from '../../services/curriculumService';
import majorService from '../../services/majorService';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export default function CurriculumList() {
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    major: '',
    academicYear: '2024/2025',
    description: '',
    status: 'active',
  });

  // State for majors
  const [majors, setMajors] = useState([]);

  // Fetch curriculums from database
  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        setLoading(true);
        const response = await curriculumService.getCurriculums();
        setCurriculums(response.data.data || []);
      } catch (error) {
        console.error('Error fetching curriculums:', error);
        showToast('Lỗi khi tải danh sách khung chương trình!', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculums();
  }, []);

  // Fetch majors from database
  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const response = await majorService.getMajors({ isActive: true });
        setMajors(response.data?.data || []);
      } catch (error) {
        console.error('Error fetching majors:', error);
        setMajors([]);
      }
    };
    fetchMajors();
  }, []);

  // Filter curriculums
  const filteredCurriculums = curriculums.filter((item) => {
    const code = String(item.code || item.curriculumCode || '').toLowerCase();
    const name = String(item.name || item.title || '').toLowerCase();
    const major = String(item.major || '').toLowerCase();
    const keyword = searchKeyword.toLowerCase();
    return code.includes(keyword) || name.includes(keyword) || major.includes(keyword);
  });

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      code: '',
      name: '',
      major: '',
      academicYear: '2024/2025',
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (curriculum) => {
    setModalMode('edit');
    setSelectedCurriculum(curriculum);
    setFormData({
      code: curriculum.code || curriculum.curriculumCode || '',
      name: curriculum.name || curriculum.title || '',
      major: curriculum.major || '',
      academicYear: curriculum.academicYear || '',
      description: curriculum.description || '',
      status: curriculum.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const response = await curriculumService.createCurriculum(formData);
        setCurriculums([...curriculums, response.data?.data]);
        showToast('Thêm khung chương trình thành công!', 'success');
      } else {
        const response = await curriculumService.updateCurriculum(selectedCurriculum._id, formData);
        const updated = response.data?.data;
        setCurriculums(
          curriculums.map((item) =>
            item._id === selectedCurriculum._id ? updated : item
          )
        );
        showToast('Cập nhật khung chương trình thành công!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving curriculum:', error);
      showToast(
        modalMode === 'create' ? 'Thêm khung chương trình thất bại!' : 'Cập nhật khung chương trình thất bại!',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (curriculum) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khung chương trình này?')) {
      return;
    }
    
    setDeletingId(curriculum._id);
    try {
      await curriculumService.deleteCurriculum(curriculum._id);
      setCurriculums(curriculums.filter((item) => item._id !== curriculum._id));
      showToast('Xóa khung chương trình thành công!', 'success');
    } catch (error) {
      console.error('Error deleting curriculum:', error);
      showToast('Xóa khung chương trình thất bại!', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Danh sách Khung chương trình</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý các khung chương trình đào tạo của trường
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <img src={addIcon} alt="Thêm" className="w-5 h-5" />
            <span>Thêm Khung mới</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã, tên hoặc khoa..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Curriculums Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCurriculums.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">Không tìm thấy khung chương trình nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Mã
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tên chương trình
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Khoa
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Năm học
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tín chỉ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCurriculums.map((curriculum) => (
                    <tr key={curriculum._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary">{curriculum.code || curriculum.curriculumCode || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{curriculum.name || curriculum.title || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {curriculum.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{curriculum.major || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{curriculum.academicYear || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {curriculum.totalCredits ?? 0} Tín chỉ
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[curriculum.status]}`}>
                          {curriculum.status === 'active' ? 'Đang áp dụng' : 'Ngưng áp dụng'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/curriculum/${curriculum._id}/setup`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <img src={setupIcon} alt="Thiết lập" className="w-4 h-4" />
                            <span>Thiết lập</span>
                          </Link>
                          <button
                            onClick={() => handleOpenEditModal(curriculum)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            disabled={deletingId === curriculum._id}
                          >
                            <img src={editIcon} alt="Sửa" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(curriculum)}
                            disabled={deletingId === curriculum._id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === curriculum._id ? (
                              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <img src={deleteIcon} alt="Xóa" className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Thêm Khung chương trình mới' : 'Chỉnh sửa Khung chương trình'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <img src={deleteIcon} alt="Đóng" className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Mã khung chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                  placeholder="VD: CKH2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Tên chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                  placeholder="VD: Cử nhân KH Máy tính 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Khoa/Viện quản lý <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Chọn khoa/viện</option>
                  {majors.map((major) => (
                    <option key={major.majorCode} value={major.majorCode}>
                      {major.majorName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Năm học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                  placeholder="VD: 2024/2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white resize-none"
                  placeholder="Nhập mô tả..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1.5">
                  Trạng thái
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Đang áp dụng</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Ngưng áp dụng</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                      {modalMode === 'create' ? 'Đang thêm...' : 'Đang lưu...'}
                    </>
                  ) : (
                    modalMode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="p-1 hover:opacity-80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

