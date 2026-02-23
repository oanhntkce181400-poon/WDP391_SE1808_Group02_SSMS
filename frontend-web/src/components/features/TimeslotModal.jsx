// Timeslot Modal Component - Popup form for Create/Edit Timeslot
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

export default function TimeslotModal({ isOpen, onClose, onSubmit, timeslot, loading }) {
  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
    startTime: '',
    endTime: '',
    startPeriod: 1,
    endPeriod: 3,
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing existing timeslot
  useEffect(() => {
    if (timeslot) {
      setFormData({
        groupName: timeslot.groupName || '',
        description: timeslot.description || '',
        startTime: timeslot.startTime || '',
        endTime: timeslot.endTime || '',
        startPeriod: timeslot.startPeriod || 1,
        endPeriod: timeslot.endPeriod || 3,
      });
    } else {
      // Reset form for new timeslot
      setFormData({
        groupName: '',
        description: '',
        startTime: '',
        endTime: '',
        startPeriod: 1,
        endPeriod: 3,
      });
    }
    setErrors({});
  }, [timeslot, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Tên ca là bắt buộc';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Giờ bắt đầu là bắt buộc';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'Giờ kết thúc là bắt buộc';
    }

    if (!formData.startPeriod) {
      newErrors.startPeriod = 'Tiết bắt đầu là bắt buộc';
    }

    if (!formData.endPeriod) {
      newErrors.endPeriod = 'Tiết kết thúc là bắt buộc';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        groupName: formData.groupName,
        description: formData.description,
        startPeriod: parseInt(formData.startPeriod, 10),
        endPeriod: parseInt(formData.endPeriod, 10),
        startTime: formData.startTime,
        endTime: formData.endTime,
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

  if (!isOpen) return null;

  const isEditing = !!timeslot;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa khung giờ' : 'Tạo khung giờ mới'}
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5">
            {/* Group Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="groupName">
                Tên ca (Tiết) <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.groupName
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="groupName"
                name="groupName"
                placeholder="VD: Ca 1 (Sáng) - Tiết 1-3"
                type="text"
                value={formData.groupName}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.groupName && <p className="text-sm text-red-500">{errors.groupName}</p>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="description">
                Mô tả
              </label>
              <textarea
                className="form-textarea rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm"
                id="description"
                name="description"
                placeholder="Mô tả về ca học..."
                rows="2"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="startTime">
                  Giờ bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.startTime
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="endTime">
                  Giờ kết thúc <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.endTime
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
              </div>
            </div>

            {/* Time Period Range */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Period */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="startPeriod">
                  Tiết bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.startPeriod
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="startPeriod"
                  name="startPeriod"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.startPeriod}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.startPeriod && <p className="text-sm text-red-500">{errors.startPeriod}</p>}
              </div>

              {/* End Period */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="endPeriod">
                  Tiết kết thúc <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.endPeriod
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                  id="endPeriod"
                  name="endPeriod"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.endPeriod}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.endPeriod && <p className="text-sm text-red-500">{errors.endPeriod}</p>}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#1A237E] hover:bg-[#0D1642] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
