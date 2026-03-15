import { useEffect, useState } from 'react';
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
  { value: 'available', label: 'Sẵn sàng sử dụng' },
  { value: 'occupied', label: 'Tạm khóa / đang sử dụng' },
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

  useEffect(() => {
    if (!isOpen) return;

    if (room) {
      setFormData({
        code: room.code || '',
        name: room.name || '',
        type: room.roomType || room.building || '',
        capacity: room.capacity || '',
        status: room.rawStatus || room.status || 'available',
      });
    } else {
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

  if (!isOpen) return null;

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.code.trim()) nextErrors.code = 'Mã phòng là bắt buộc.';
    if (!formData.name.trim()) nextErrors.name = 'Tên phòng là bắt buộc.';
    if (!formData.type) nextErrors.type = 'Loại phòng là bắt buộc.';
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      nextErrors.capacity = 'Sức chứa phải lớn hơn 0.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    onSubmit({
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: formData.type,
      capacity: Number.parseInt(formData.capacity, 10),
      status: formData.status,
    });
  };

  const isEditing = Boolean(room);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa phòng học' : 'Tạo phòng học mới'}
          </h3>
          <button
            className="p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 p-6">
            <FormField
              label="Mã phòng"
              required
              error={errors.code}
              input={
                <input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Ví dụ: A101"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass(errors.code)}
                />
              }
            />

            <FormField
              label="Tên phòng"
              required
              error={errors.name}
              input={
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ví dụ: Phòng A101"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass(errors.name)}
                />
              }
            />

            <FormField
              label="Loại phòng"
              required
              error={errors.type}
              input={
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass(errors.type)}
                >
                  <option value="">Chọn loại phòng</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              }
            />

            <FormField
              label="Sức chứa"
              required
              error={errors.capacity}
              helperText="Sức chứa phải là số nguyên dương."
              input={
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="Ví dụ: 50"
                  value={formData.capacity}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass(errors.capacity)}
                />
              }
            />

            <FormField
              label="Trạng thái lưu trữ"
              required
              error={errors.status}
              helperText="Trạng thái vận hành thực tế sẽ được tính tự động theo lớp và lịch học."
              input={
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass(errors.status)}
                >
                  {ROOM_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              }
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
            <button
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              className="rounded-lg bg-[#1A237E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0D147A] disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, required = false, error, helperText, input }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-slate-700 dark:text-white">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {input}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {!error && helperText ? <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p> : null}
    </div>
  );
}

function inputClass(hasError) {
  return `w-full rounded-lg border text-sm dark:bg-slate-800 ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-200 focus:border-[#1A237E] focus:ring-[#1A237E] dark:border-slate-700'
  }`;
}
