// Room Modal Component - Popup form for Create/Edit Room
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

const ROOM_TYPES = [
  'Phòng lý thuyết',
  'Phòng thực hành',
  'Phòng máy tính',
  'Phòng lab',
  'Hội trường',
  'Phòng họp',
];

const ROOM_STATUS = [
  { value: 'available', label: 'Đang trống' },
  { value: 'occupied', label: 'Đang hoạt động' },
];

export default function RoomModal({ isOpen, onClose, onSubmit, room, loading }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    capacity: '',
    status: 'available',
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing existing room
  useEffect(() => {
    if (room) {
      console.log('Room data received:', room);
      const typeValue = room.roomType || room.building || '';
      console.log('Setting type to:', typeValue);
      setFormData({
        code: room.code || '',
        name: room.name || '',
        type: typeValue,
        capacity: room.capacity || '',
        status: room.status || 'available',
      });
    } else {
      // Reset form for new room
      setFormData({
        code: '',
        name: '',
        type: '',
        capacity: '',
        status: 'available',
      });
    }
    setErrors({});
  }, [room, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Mã phòng học là bắt buộc';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tên phòng học là bắt buộc';
    }
    
    if (!formData.type) {
      newErrors.type = 'Loại phòng là bắt buộc';
    }
    
    if (!formData.capacity || formData.capacity <= 0) {
      newErrors.capacity = 'Sức chứa phải lớn hơn 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        code: formData.code,
        name: formData.name,
        type: formData.type,
        capacity: parseInt(formData.capacity, 10),
        status: formData.status,
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

  const isEditing = !!room;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa phòng học' : 'Tạo phòng học mới'}
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
            {/* Room Code */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="code">
                Mã phòng học <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.code
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="code"
                name="code"
                placeholder="VD: A101, B202"
                type="text"
                value={formData.code}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
            </div>

            {/* Room Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="name">
                Tên phòng học <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="name"
                name="name"
                placeholder="VD: Phòng A101"
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Room Type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="type">
                Loại phòng <span className="text-red-500">*</span>
              </label>
              <select
                className={`form-select rounded-lg border ${
                  errors.type
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">-- Chọn loại phòng --</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
            </div>

            {/* Room Capacity */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="capacity">
                Sức chứa <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.capacity
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="capacity"
                name="capacity"
                placeholder="VD: 50"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.capacity && <p className="text-sm text-red-500">{errors.capacity}</p>}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                * Sức chứa phải là số nguyên dương
              </p>
            </div>

            {/* Room Status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="status">
                Trạng thái <span className="text-red-500">*</span>
              </label>
              <select
                className={`form-select rounded-lg border ${
                  errors.status
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={loading}
              >
                {ROOM_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button
              className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1A237E] rounded-lg hover:bg-[#0D147A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
