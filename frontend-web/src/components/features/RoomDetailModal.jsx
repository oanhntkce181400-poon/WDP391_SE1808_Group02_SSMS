import closeIcon from '../../assets/close.png';

export default function RoomDetailModal({ isOpen, onClose, room, onEdit, onDelete }) {
  if (!isOpen || !room) return null;

  const isAvailable = room.status === 'available';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1A237E] to-[#283593] p-6">
          <h3 className="text-xl font-bold text-white">Chi tiết phòng học</h3>
          <button className="p-1 text-white/80 transition-colors hover:text-white" onClick={onClose}>
            <img src={closeIcon} alt="Đóng" className="h-6 w-6 brightness-0 invert" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <InfoItem label="Mã phòng" value={room.code} />
            <InfoItem label="Tên phòng" value={room.name} />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Loại phòng
              </label>
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {room.building}
              </div>
            </div>

            <InfoItem label="Sức chứa" value={`${room.capacity} chỗ`} />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Trạng thái vận hành
              </label>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                  isAvailable
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
                {isAvailable ? 'Đang trống' : 'Đang hoạt động'}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {room.currentSemesterEnrollmentCount || 0} sinh viên, {room.currentSemesterClassCount || 0} lớp trong kỳ hiện tại
              </p>
            </div>

            <InfoItem
              label="Ngày tạo"
              value={room.createdAt ? new Date(room.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
            />
          </div>

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Thông tin quản lý</p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              Trạng thái vận hành được tính từ lịch học và sĩ số lớp trong kỳ hiện tại. Trạng thái lưu trữ của
              phòng vẫn có thể được chỉnh sửa thủ công ở màn hình cập nhật.
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
          <button
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            type="button"
            onClick={onClose}
          >
            Đóng
          </button>

          <div className="flex gap-3">
            <button
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              type="button"
              onClick={() => {
                onClose();
                onDelete(room);
              }}
            >
              Xóa
            </button>
            <button
              className="rounded-lg bg-[#1A237E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0D147A]"
              type="button"
              onClick={() => {
                onClose();
                onEdit(room);
              }}
            >
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
