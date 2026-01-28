// Room Filter Panel Component - Filter and Sort controls
import { useState, useEffect } from 'react';

const ROOM_TYPES = [
  'Phòng lý thuyết',
  'Phòng thực hành',
  'Phòng máy tính',
  'Phòng lab',
  'Hội trường',
  'Phòng họp',
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Mới nhất' },
  { value: 'createdAt:asc', label: 'Cũ nhất' },
  { value: 'roomCode:asc', label: 'Mã phòng (A-Z)' },
  { value: 'roomCode:desc', label: 'Mã phòng (Z-A)' },
  { value: 'capacity:asc', label: 'Sức chứa (Thấp → Cao)' },
  { value: 'capacity:desc', label: 'Sức chứa (Cao → Thấp)' },
];

export default function RoomFilterPanel({ isOpen, onClose, onApply, currentFilters }) {
  const [filters, setFilters] = useState({
    roomType: '',
    minCapacity: '',
    maxCapacity: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    if (currentFilters) {
      setFilters(currentFilters);
    }
  }, [currentFilters, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (e) => {
    const [sortBy, sortOrder] = e.target.value.split(':');
    setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      roomType: '',
      minCapacity: '',
      maxCapacity: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setFilters(resetFilters);
    onApply(resetFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 z-40"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Lọc & Sắp xếp
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 space-y-6">
            {/* Sort Section */}
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-white block mb-3">
                Sắp xếp
              </label>
              <select
                className="form-select rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 w-full text-sm"
                value={`${filters.sortBy}:${filters.sortOrder}`}
                onChange={handleSortChange}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-white mb-3">
                Bộ lọc
              </h4>

              {/* Room Type Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Loại phòng
                </label>
                <select
                  name="roomType"
                  className="form-select rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 w-full text-sm"
                  value={filters.roomType}
                  onChange={handleChange}
                >
                  <option value="">Tất cả loại phòng</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity Range Filter */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Sức chứa
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      name="minCapacity"
                      className="form-input rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 w-full text-sm"
                      placeholder="Tối thiểu"
                      min="0"
                      value={filters.minCapacity}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      name="maxCapacity"
                      className="form-input rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 w-full text-sm"
                      placeholder="Tối đa"
                      min="0"
                      value={filters.maxCapacity}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Để trống để không giới hạn
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Đặt lại
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1A237E] rounded-lg hover:bg-[#0D147A] transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
