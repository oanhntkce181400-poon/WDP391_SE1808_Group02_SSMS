// Subject Delete Modal Component - Confirmation dialog for deleting subject (Tasks #XX)
import warningIcon from '../../assets/warning.png';
import closeIcon from '../../assets/close.png';
import menuIcon from '../../assets/menu.png';

export default function SubjectDeleteModal({ isOpen, onClose, onConfirm, subject, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-full bg-red-100 dark:bg-red-900/30">
              <img src={warningIcon} alt="Cảnh báo" className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xác nhận xóa</h3>
          </div>
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
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Bạn có chắc chắn muốn xóa môn học này không? Hành động này không thể hoàn tác.
          </p>

          {subject && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <img src={menuIcon} alt="Môn học" className="w-6 h-6" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {subject.code} - {subject.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {subject.credits} tín chỉ
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            className="px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            Xóa môn học
          </button>
        </div>
      </div>
    </div>
  );
}

