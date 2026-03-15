import closeIcon from '../../assets/close.png';
import warningIcon from '../../assets/warning.png';

export default function RoomDeleteModal({ isOpen, onClose, onConfirm, room, loading }) {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xác nhận xóa phòng</h3>
          <button
            className="p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <img src={warningIcon} alt="Cảnh báo" className="h-12 w-12" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Bạn có chắc chắn muốn xóa phòng học này?
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1 text-slate-500 dark:text-slate-400">Mã phòng</p>
                <p className="font-semibold text-slate-900 dark:text-white">{room.code}</p>
              </div>
              <div>
                <p className="mb-1 text-slate-500 dark:text-slate-400">Tên phòng</p>
                <p className="font-semibold text-slate-900 dark:text-white">{room.name}</p>
              </div>
              <div>
                <p className="mb-1 text-slate-500 dark:text-slate-400">Sức chứa</p>
                <p className="font-semibold text-slate-900 dark:text-white">{room.capacity} chỗ</p>
              </div>
              <div>
                <p className="mb-1 text-slate-500 dark:text-slate-400">Loại phòng</p>
                <p className="font-semibold text-slate-900 dark:text-white">{room.building}</p>
              </div>
            </div>
          </div>
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
            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xóa...' : 'Xóa phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}
