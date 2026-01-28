// Subject Modal Component - Popup form for Create/Edit Subject (Tasks #XX)
import { useState, useEffect, useRef } from 'react';
import closeIcon from '../../assets/close.png';

const DEPARTMENTS = [
  'Khoa Công nghệ thông tin',
  'Khoa Cơ bản',
  'Khoa Kinh tế',
  'Khoa Điện tử',
  'Khoa Cơ khí',
  'Khoa Xây dựng',
];

export default function SubjectModal({ isOpen, onClose, onSubmit, subject, loading }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: '',
    department: [],
    isCommon: false, // Môn chung cho toàn khoa
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Populate form when editing existing subject
  useEffect(() => {
    if (subject) {
      setFormData({
        code: subject.code || '',
        name: subject.name || '',
        credits: subject.credits || '',
        department: subject.department || [],
        isCommon: subject.isCommon || false,
        description: subject.description || '',
      });
    } else {
      // Reset form for new subject
      setFormData({
        code: '',
        name: '',
        credits: '',
        department: [],
        isCommon: false,
        description: '',
      });
    }
    setErrors({});
    setIsDropdownOpen(false);
  }, [subject, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code.trim()) {
      newErrors.code = 'Mã môn học là bắt buộc';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Tên môn học là bắt buộc';
    }
    if (!formData.credits || formData.credits < 1) {
      newErrors.credits = 'Số tín chỉ phải lớn hơn 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        credits: parseInt(formData.credits, 10),
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleDepartmentToggle = (dept) => {
    setFormData((prev) => {
      const currentDepartments = prev.department || [];
      if (currentDepartments.includes(dept)) {
        return { ...prev, department: currentDepartments.filter((d) => d !== dept) };
      } else {
        return { ...prev, department: [...currentDepartments, dept] };
      }
    });
    // Clear error when user starts selecting
    if (errors.department) {
      setErrors((prev) => ({ ...prev, department: '' }));
    }
  };

  if (!isOpen) return null;

  const isEditing = !!subject;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa môn học' : 'Tạo môn học mới'}
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5">
            {/* Subject Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="name">
                Tên môn học <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="name"
                name="name"
                placeholder="Ví dụ: Lập trình di động"
                type="text"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Grid for Code and Credits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="code">
                  Mã môn học <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.code
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="code"
                  name="code"
                  placeholder="Ví dụ: CS305"
                  type="text"
                  value={formData.code}
                  onChange={handleChange}
                />
                {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="credits">
                  Số tín chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.credits
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="credits"
                  name="credits"
                  placeholder="3"
                  type="number"
                  min="1"
                  max="15"
                  value={formData.credits}
                  onChange={handleChange}
                />
                {errors.credits && <p className="text-xs text-red-500">{errors.credits}</p>}
              </div>
            </div>

            {/* Department - Multi Select */}
            <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-white">
                Khoa quản lý
              </label>
              <div
                className={`form-input rounded-lg border ${
                  errors.department
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus-within:border-[#1A237E] focus-within:ring-[#1A237E] w-full text-sm cursor-pointer flex items-center justify-between`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="truncate">
                  {formData.department && formData.department.length > 0
                    ? formData.department.join(', ')
                    : 'Chọn khoa...'}
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {DEPARTMENTS.map((dept) => (
                    <label
                      key={dept}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.department?.includes(dept) || false}
                        onChange={() => handleDepartmentToggle(dept)}
                        className="w-4 h-4 text-[#1A237E] border-slate-300 rounded focus:ring-[#1A237E]"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{dept}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
            </div>

            {/* Common Subject Checkbox */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="isCommon"
                  checked={formData.isCommon || false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isCommon: e.target.checked }))}
                  className="w-5 h-5 text-[#1A237E] border-slate-300 rounded focus:ring-[#1A237E] cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-white group-hover:text-primary transition-colors">
                    Môn chung cho toàn khoa
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Môn học bắt buộc cho tất cả sinh viên trong khoa
                  </span>
                </div>
              </label>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="description">
                Mô tả
              </label>
              <textarea
                className="form-input rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm resize-none"
                id="description"
                name="description"
                placeholder="Nhập mô tả môn học (tùy chọn)"
                rows="3"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#1A237E] text-white text-sm font-bold hover:bg-[#0D147A] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

