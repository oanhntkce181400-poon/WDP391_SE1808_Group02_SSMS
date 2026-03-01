import closeIcon from '../../assets/close.png';

/**
 * Modal xác nhận xóa Announcement
 */
export default function AnnouncementDeleteModal({ isOpen, onClose, onConfirm, announcement, loading }) {
  if (!isOpen || !announcement) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-500">
            Xác nhận xóa
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Bạn có chắc chắn muốn xóa thông báo này?
          </p>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="font-bold text-slate-900 dark:text-white mb-1">
              {announcement.title}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Danh mục:{' '}
              <span className="font-medium">
                {announcement.category === 'hoc_vu' && 'Học vụ'}
                {announcement.category === 'tai_chinh' && 'Tài chính'}
                {announcement.category === 'su_kien' && 'Sự kiện'}
                {announcement.category === 'khac' && 'Khác'}
              </span>
            </p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-4">
            ⚠️ Thao tác này không thể hoàn tác!
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}
