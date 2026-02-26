// Exam Delete Modal Component - Confirmation dialog for deleting an exam
import closeIcon from '../../assets/close.png';
import warningIcon from '../../assets/warning.png';

export default function ExamDeleteModal({ isOpen, onClose, onConfirm, exam, loading }) {
  if (!isOpen || !exam) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xác nhận xóa lịch thi</h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <img src={warningIcon} alt="Warning" className="w-12 h-12" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Bạn có chắc chắn muốn xóa lịch thi này?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Hành động này sẽ xóa lịch thi và tất cả thông tin đăng ký liên quan. Không thể hoàn tác.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Mã kỳ thi:</p>
                <p className="font-semibold text-slate-900 dark:text-white">{exam.examCode}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Môn học:</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {exam.subject?.subjectCode || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Ngày thi:</p>
                <p className="font-semibold text-slate-900 dark:text-white">{formatDate(exam.examDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Giờ thi:</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {exam.startTime} - {exam.endTime}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Phòng thi:</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {exam.room?.roomCode || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Sinh viên đã đăng ký:</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {exam.registeredStudents || 0} / {exam.maxCapacity}
                </p>
              </div>
            </div>
          </div>

          {exam.registeredStudents > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                ⚠️ Lưu ý: Có <span className="font-bold">{exam.registeredStudents}</span> sinh viên đã đăng ký thi. 
                Việc xóa lịch thi sẽ ảnh hưởng đến các sinh viên này.
              </p>
            </div>
          )}
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
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
            onClick={onConfirm}
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
            Xóa lịch thi
          </button>
        </div>
      </div>
    </div>
  );
}
