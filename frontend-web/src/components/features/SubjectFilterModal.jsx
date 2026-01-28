// Subject Filter Modal Component - Advanced filtering for subjects
// Features: Filter by credits, code, department, common status
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

export default function SubjectFilterModal({ isOpen, onClose, onApply, currentFilters = {} }) {
  const [filters, setFilters] = useState({
    credits: '',
    codePrefix: '',
    department: '',
    isCommon: '',
  });

  // Initialize filters from props
  useEffect(() => {
    if (currentFilters) {
      setFilters({
        credits: currentFilters.credits || '',
        codePrefix: currentFilters.codePrefix || '',
        department: currentFilters.department || '',
        isCommon: currentFilters.isCommon || '',
      });
    }
  }, [currentFilters, isOpen]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApply = () => {
    // Only send non-empty filters
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    onApply(activeFilters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      credits: '',
      codePrefix: '',
      department: '',
      isCommon: '',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lọc môn học</h2>
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              onClick={onClose}
            >
              <img src={closeIcon} alt="Đóng" className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Filter by Credits */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Số tín chỉ
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                value={filters.credits}
                onChange={(e) => handleChange('credits', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="1">1 tín chỉ</option>
                <option value="2">2 tín chỉ</option>
                <option value="3">3 tín chỉ</option>
                <option value="4">4 tín chỉ</option>
                <option value="5">5 tín chỉ</option>
                <option value="6">6 tín chỉ</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Lọc theo số tín chỉ của môn học
              </p>
            </div>

            {/* Filter by Code Prefix */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Mã môn học bắt đầu với
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400"
                placeholder="VD: SUB, CS, MATH..."
                value={filters.codePrefix}
                onChange={(e) => handleChange('codePrefix', e.target.value.toUpperCase())}
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Nhập các ký tự đầu của mã môn học (VD: SUB, CS, MATH)
              </p>
            </div>

            {/* Filter by Department */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Khoa quản lý
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                value={filters.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="">Tất cả khoa</option>
                <option value="AI">AI - Trí tuệ nhân tạo</option>
                <option value="GD">GD - Thiết kế đồ họa</option>
                <option value="IB">IB - Kinh doanh quốc tế</option>
                <option value="SE">SE - Kỹ thuật phần mềm</option>
                <option value="IA">IA - Kiến trúc thông tin</option>
                <option value="MC">MC - Truyền thông đa phương tiện</option>
                <option value="SA">SA - Phân tích hệ thống</option>
                <option value="CS">CS - Khoa học máy tính</option>
                <option value="IT">IT - Công nghệ thông tin</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Lọc theo khoa/ngành quản lý môn học
              </p>
            </div>

            {/* Filter by Common Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Loại môn học
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                value={filters.isCommon}
                onChange={(e) => handleChange('isCommon', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="true">Môn chung</option>
                <option value="false">Môn chuyên ngành</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Môn chung: dùng chung cho nhiều khoa/ngành
              </p>
            </div>

            {/* Active Filters Summary */}
            {(filters.credits || filters.codePrefix || filters.department || filters.isCommon) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                    info
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      Bộ lọc đang áp dụng:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {filters.credits && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                          Tín chỉ: {filters.credits}
                        </span>
                      )}
                      {filters.codePrefix && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                          Mã: {filters.codePrefix}*
                        </span>
                      )}
                      {filters.department && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                          Khoa: {filters.department}
                        </span>
                      )}
                      {filters.isCommon && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                          {filters.isCommon === 'true' ? 'Môn chung' : 'Môn chuyên ngành'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <button
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              onClick={handleReset}
            >
              Đặt lại
            </button>
            <div className="flex gap-2">
              <button
                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#1A237E] hover:bg-[#0D147A] rounded-lg transition-colors shadow-sm"
                onClick={handleApply}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
