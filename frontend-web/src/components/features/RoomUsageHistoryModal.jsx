// RoomUsageHistoryModal.jsx
// Modal hiển thị lịch sử sử dụng phòng
import { useState, useEffect } from 'react';
import roomService from '../../services/roomService';

export default function RoomUsageHistoryModal({ room, isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && room?._id) {
      fetchHistory();
    }
  }, [isOpen, room]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await roomService.getRoomUsageHistory(room._id);
      setHistory(response.data?.data || []);
    } catch (err) {
      console.error('Error fetching room usage history:', err);
      setError('Không thể tải lịch sử sử dụng phòng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Lịch sử sử dụng phòng
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {room?.code} - {room?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A237E] border-t-transparent"></div>
              <span className="ml-3 text-slate-500">Đang tải...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-lg font-medium">Chưa có lịch sử sử dụng</p>
              <p className="text-sm mt-1">Phòng này chưa được sử dụng trong các học phần nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div 
                  key={item.classSectionId || index}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#1A237E]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-[#1A237E]/10 text-[#1A237E] text-xs font-bold rounded">
                          {item.classCode}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.subject?.subjectCode} - {item.subject?.subjectName}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">Giảng viên:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {item.lecturer?.fullName || '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">Học kỳ:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {item.semester?.name || '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">SV đăng ký:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {item.studentCount}/{item.maxCapacity}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">Thứ/Tiết:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {item.schedule?.dayOfWeek ? `Thứ ${item.schedule.dayOfWeek}` : '—'}
                            {item.schedule?.startTime && ` (${item.schedule.startTime}-${item.schedule.endTime})`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {item.status === 'active' ? 'Hoạt động' : item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Tổng: {history.length} lớp học phần
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
