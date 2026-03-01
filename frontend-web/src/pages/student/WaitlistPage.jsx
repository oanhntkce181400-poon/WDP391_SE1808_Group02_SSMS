// WaitlistPage.jsx - Trang quản lý waitlist của sinh viên
import { useState, useEffect } from 'react';
import waitlistService from '../../services/waitlistService';
import WaitlistModal from '../../components/features/WaitlistModal';

const STATUS_STYLES = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  ENROLLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
  WAITING: 'Đang chờ',
  ENROLLED: 'Đã được đăng ký',
  CANCELLED: 'Đã hủy',
};

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    loadWaitlist();
  }, []);

  async function loadWaitlist() {
    setLoading(true);
    try {
      const res = await waitlistService.getMyWaitlist();
      setWaitlist(res.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải waitlist:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(waitlistId) {
    try {
      await waitlistService.cancelWaitlist(waitlistId, 'Hủy bởi sinh viên');
      await loadWaitlist();
      alert('Đã hủy waitlist thành công');
    } catch (err) {
      console.error('Lỗi hủy waitlist:', err);
      alert(err.response?.data?.message || 'Không thể hủy waitlist');
    } finally {
      setCancelConfirm(null);
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Danh sách chờ (Waitlist)
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý yêu cầu bảo lưu môn học sang kỳ sau
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium shadow-sm"
        >
          ⏳ Đăng ký mới
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mb-6">
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
          Cách thức hoạt động
        </h3>
        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Đăng ký vào danh sách chờ cho môn bạn muốn học ở kỳ tới</li>
          <li>• Khi Admin mở lớp mới cho kỳ đó, hệ thống sẽ tự động đăng ký cho bạn</li>
          <li>• Bạn có thể hủy bất kỳ lúc nào trước khi được enroll</li>
        </ul>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">⏳</div>
          <p>Đang tải danh sách chờ...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && waitlist.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Bạn chưa có yêu cầu chờ nào
          </h3>
          <p className="text-slate-500 mb-4">
            Hãy đăng ký waitlist nếu bạn muốn bảo lưu môn học sang kỳ sau
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
          >
            Đăng ký ngay
          </button>
        </div>
      )}

      {/* Waitlist Table */}
      {!loading && waitlist.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                  Môn học
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                  Kỳ dự kiến
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                  Năm học
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                  Ngày đăng ký
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waitlist.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        {item.subject?.subjectName || item.subject?.name || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.subject?.subjectCode || item.subject?.code || ''} • {item.subject?.credits || 0} tín chỉ
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Kỳ {item.targetSemester}
                    {item.targetSemester === 3 && ' (Hè)'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.targetAcademicYear}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[item.status] || 'bg-slate-100'}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'WAITING' && (
                      <button
                        onClick={() => setCancelConfirm(item._id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Hủy
                      </button>
                    )}
                    {item.status === 'ENROLLED' && item.enrolledClassSection && (
                      <span className="text-green-600 text-sm">
                        Lớp: {item.enrolledClassSection.classCode || item.enrolledClassSection.className || 'N/A'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Xác nhận hủy
            </h3>
            <p className="text-slate-600 mb-6">
              Bạn có chắc chắn muốn hủy yêu cầu waitlist này không?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelConfirm(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Không, giữ lại
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Có, hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Waitlist Modal */}
      <WaitlistModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          loadWaitlist();
        }}
      />
    </div>
  );
}
