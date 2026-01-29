// Timeslot Detail Modal Component - View detailed information about a timeslot
import closeIcon from '../../assets/close.png';

export default function TimeslotDetailModal({ isOpen, onClose, timeslot }) {
  if (!isOpen || !timeslot) return null;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết khung giờ</h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Thông tin cơ bản
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Tên nhóm môn</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {timeslot.groupName}
                  </span>
                </div>
                {timeslot.description && (
                  <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Mô tả</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-md">
                      {timeslot.description}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Khoảng thời gian
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ngày bắt đầu</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {formatDate(timeslot.startDate)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ngày kết thúc</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {formatDate(timeslot.endDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Time Range */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Giờ học
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Giờ bắt đầu</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {timeslot.startTime}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Giờ kết thúc</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {timeslot.endTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Thông tin khác
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {timeslot.sessionsPerDay !== undefined && (
                  <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Số tiết/ngày</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{timeslot.sessionsPerDay} tiết</span>
                  </div>
                )}
                {timeslot.createdAt && (
                  <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Ngày tạo</span>
                    <span className="text-sm text-slate-900 dark:text-white">
                      {new Date(timeslot.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
                {timeslot.updatedAt && (
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Cập nhật lần cuối</span>
                    <span className="text-sm text-slate-900 dark:text-white">
                      {new Date(timeslot.updatedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#1A237E] hover:bg-[#0D1642] rounded-lg transition-colors"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
