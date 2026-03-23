// Timeslot Modal Component — mỗi ca gắn đúng một tiết
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `Tiết ${i + 1}`,
}));

export default function TimeslotModal({ isOpen, onClose, onSubmit, timeslot, loading }) {
  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
    startTime: '',
    endTime: '',
    period: 1,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (timeslot) {
      const p = timeslot.startPeriod ?? timeslot.endPeriod ?? 1;
      setFormData({
        groupName: timeslot.groupName || '',
        description: timeslot.description || '',
        startTime: timeslot.startTime || '',
        endTime: timeslot.endTime || '',
        period: Number(p) >= 1 && Number(p) <= 10 ? Number(p) : 1,
      });
    } else {
      setFormData({
        groupName: '',
        description: '',
        startTime: '',
        endTime: '',
        period: 1,
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

    if (!formData.period) {
      newErrors.period = 'Tiết học là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const p = parseInt(formData.period, 10);
    onSubmit({
      groupName: formData.groupName,
      description: formData.description,
      startPeriod: p,
      endPeriod: p,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  const isEditing = !!timeslot;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa khung giờ' : 'Tạo khung giờ mới'}
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="groupName">
                Tên ca <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.groupName
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="groupName"
                name="groupName"
                placeholder="VD: CA1"
                type="text"
                value={formData.groupName}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.groupName && <p className="text-sm text-red-500">{errors.groupName}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="description">
                Mô tả
              </label>
              <textarea
                className="form-textarea rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm"
                id="description"
                name="description"
                placeholder="Mô tả ngắn..."
                rows="2"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="period">
                Tiết học <span className="text-red-500">*</span>
              </label>
              <select
                id="period"
                name="period"
                className={`form-input rounded-lg border ${
                  errors.period
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                value={formData.period}
                onChange={handleChange}
                disabled={loading}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.period && <p className="text-sm text-red-500">{errors.period}</p>}
              <p className="text-xs text-slate-500">Mỗi ca chỉ gắn với một tiết (theo quy định hệ thống).</p>
            </div>
          </div>

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
