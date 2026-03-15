import { useEffect, useState } from 'react';

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
  { value: 'roomCode:asc', label: 'Mã phòng A-Z' },
  { value: 'roomCode:desc', label: 'Mã phòng Z-A' },
  { value: 'capacity:asc', label: 'Sức chứa tăng dần' },
  { value: 'capacity:desc', label: 'Sức chứa giảm dần' },
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

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (event) => {
    const [sortBy, sortOrder] = event.target.value.split(':');
    setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />

      <div className="fixed bottom-0 right-0 top-0 z-50 w-96 overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-6 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bộ lọc phòng học</h3>
              <button
                onClick={onClose}
                className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6 p-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-white">Sắp xếp</label>
              <select
                className="w-full rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
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

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-white">Điều kiện lọc</h4>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Loại phòng
                </label>
                <select
                  name="roomType"
                  className="w-full rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Sức chứa
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    name="minCapacity"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Tối thiểu"
                    value={filters.minCapacity}
                    onChange={handleChange}
                  />
                  <input
                    type="number"
                    name="maxCapacity"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Tối đa"
                    value={filters.maxCapacity}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Bỏ trống nếu không muốn giới hạn.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Đặt lại
            </button>
            <button
              onClick={() => {
                onApply(filters);
                onClose();
              }}
              className="flex-1 rounded-lg bg-[#1A237E] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0D147A]"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
