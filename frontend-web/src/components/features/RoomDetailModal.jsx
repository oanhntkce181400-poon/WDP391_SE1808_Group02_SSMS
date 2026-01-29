// Room Detail Modal Component - Display room information
import closeIcon from '../../assets/close.png';

export default function RoomDetailModal({ isOpen, onClose, room, onEdit, onDelete }) {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-[#1A237E] to-[#283593]">
          <h3 className="text-xl font-bold text-white">Chi tiết phòng học</h3>
          <button
            className="text-white/80 hover:text-white transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6 brightness-0 invert" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Room Code */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Mã phòng học
              </label>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{room.code}</p>
            </div>

            {/* Room Name */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Tên phòng học
              </label>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{room.name}</p>
            </div>

            {/* Room Type */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Loại phòng
              </label>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {room.building}
              </div>
            </div>

            {/* Capacity */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Sức chứa
              </label>
              <div className="inline-flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {room.capacity} chỗ
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Trạng thái
              </label>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  room.status === 'available'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    room.status === 'available' ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                ></span>
                {room.status === 'available' ? 'Đang trống' : 'Đang hoạt động'}
              </div>
            </div>

            {/* Created Date */}
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Ngày tạo
              </label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {room.createdAt ? new Date(room.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Thông tin quản lý
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Bạn có thể chỉnh sửa hoặc xóa phòng học này. Lưu ý: Không thể xóa phòng đang được sử dụng trong lịch học.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Action Buttons */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3">
          <button
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            type="button"
            onClick={onClose}
          >
            Đóng
          </button>
          <div className="flex gap-3">
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              type="button"
              onClick={() => {
                onClose();
                onDelete(room);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Xóa
            </button>
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1A237E] rounded-lg hover:bg-[#0D147A] transition-colors flex items-center gap-2"
              type="button"
              onClick={() => {
                onClose();
                onEdit(room);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
