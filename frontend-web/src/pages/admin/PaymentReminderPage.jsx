import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import paymentReminderService from '../../services/paymentReminderService';

/** Nhãn lịch sử (bản ghi cũ có thể còn all/sms/inapp) */
function reminderTypeLabel(type) {
  if (type === 'email') {
    return 'Email';
  }
  if (type === 'all') {
    return 'Tất cả (lịch sử cũ)';
  }
  if (type === 'sms') {
    return 'SMS (lịch sử cũ)';
  }
  if (type === 'inapp') {
    return 'In-app (lịch sử cũ)';
  }
  return String(type || '—');
}

const PaymentReminderPage = () => {
  const location = useLocation();
  const preselectIdsFromSummaryRef = useRef(undefined);
  const preselectFromSummaryAppliedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({ majorCode: '', cohort: '' });
  const [overrideCooldown, setOverrideCooldown] = useState(false);

  useEffect(() => {
    if (preselectIdsFromSummaryRef.current !== undefined) {
      return;
    }
    const st = location.state;
    if (st && Array.isArray(st.preselectStudentIds) && st.preselectStudentIds.length > 0) {
      preselectIdsFromSummaryRef.current = st.preselectStudentIds.map((id) => String(id));
    } else {
      preselectIdsFromSummaryRef.current = [];
    }
  }, [location]);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  useEffect(() => {
    if (preselectFromSummaryAppliedRef.current) {
      return;
    }
    if (loading) {
      return;
    }
    if (preselectIdsFromSummaryRef.current === undefined) {
      return;
    }
    preselectFromSummaryAppliedRef.current = true;
    const pending = preselectIdsFromSummaryRef.current;
    if (pending.length === 0) {
      return;
    }
    const want = new Set(pending);
    const matched = [];
    for (const s of students) {
      if (want.has(String(s.studentId))) {
        matched.push(s.studentId);
      }
    }
    if (matched.length > 0) {
      setSelectedStudents(matched);
      toast.info('Đã chọn sinh viên từ Tổng hợp thanh toán — kiểm tra danh sách và bấm gửi email.');
    } else {
      toast.warning(
        'Không tìm thấy sinh viên đã chọn trong danh sách nợ của trang này (có thể khác kỳ / bộ lọc).',
      );
    }
  }, [students, loading]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await paymentReminderService.getStudentsWithOutstandingFees(filters);
      setStudents(response.data.students);
    } catch (error) {
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await paymentReminderService.getReminderHistory();
      setHistory(response.data.reminders);
    } catch (error) {
      toast.error('Không thể tải lịch sử');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.studentId));
    }
  };

  const handleSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSendReminders = async () => {
    if (selectedStudents.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một sinh viên');
      return;
    }
    try {
      setSending(true);
      const response = await paymentReminderService.sendReminders({
        studentIds: selectedStudents,
        type: 'email',
        customMessage: customMessage || undefined,
        overrideCooldown,
      });
      const batch = response.data;
      if (!batch) {
        toast.success(response.message);
      } else if (batch.sent > 0) {
        toast.success(response.message);
      } else if (batch.skipped > 0 && batch.failed === 0) {
        toast.warning(
          `${response.message} Các sinh viên này đã được nhắc trong vòng 24 giờ — lịch sử ghi nhận dòng "skipped".`
        );
      } else {
        toast.error(response.message || 'Gửi reminders thất bại');
      }
      setSelectedStudents([]);
      setCustomMessage('');
      setOverrideCooldown(false);
      fetchHistory();
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gửi reminders thất bại');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const config = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      skipped: 'bg-amber-100 text-amber-700',
      pending: 'bg-gray-100 text-gray-700'
    };
    return <span className={`px-2 py-1 rounded text-xs ${config[status]}`}>{status}</span>;
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nhắc nhở thanh toán</h1>
        <p className="text-gray-500">
          Gửi email nhắc nhở học phí tới địa chỉ đăng ký của sinh viên (chỉ kênh email).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('compose')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'compose' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'
          }`}
        >
          Soạn thảo
        </button>
        <button
          onClick={() => { setActiveTab('history'); fetchHistory(); }}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'
          }`}
        >
          Lịch sử gửi
        </button>
      </div>

      {activeTab === 'compose' ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3 items-start">
            <span className="text-2xl leading-none" aria-hidden>📧</span>
            <div>
              <p className="font-semibold text-blue-900">Kênh gửi: chỉ Email</p>
              <p className="text-sm text-blue-800 mt-1">
                Hệ thống không gửi SMS hay thông báo in-app từ trang này. Nội dung nhắc nhở được gửi qua
                mẫu email mặc định hoặc đoạn tùy chỉnh bên dưới (nếu có).
              </p>
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Nội dung email tùy chỉnh (không bắt buộc)</h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Nhập nội dung email hoặc để trống để dùng mẫu mặc định..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <label className="flex items-center gap-3 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition">
              <input
                type="checkbox"
                checked={overrideCooldown}
                onChange={(e) => setOverrideCooldown(e.target.checked)}
                className="w-4 h-4 rounded border-amber-400 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-amber-800">
                  Bỏ qua giới hạn gửi lại (24 giờ)
                </span>
                <p className="text-xs text-amber-600 mt-0.5">
                  Cho phép gửi nhắc cho sinh viên đã được nhắc gần đây trong vòng 24 giờ.
                </p>
              </div>
            </label>
          </div>

          {/* Student Selection */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-800">Danh sách sinh viên</h3>
                <p className="text-sm text-gray-500">
                  {selectedStudents.length} / {students.length} được chọn
                </p>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {selectedStudents.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-white">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Lọc theo ngành (VD: SE, AI)"
                  value={filters.majorCode}
                  onChange={(e) => setFilters(prev => ({ ...prev, majorCode: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Lọc theo khóa (VD: 18, 19)"
                  value={filters.cohort}
                  onChange={(e) => setFilters(prev => ({ ...prev, cohort: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không có sinh viên nào có học phí chưa thanh toán
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {students.map(student => (
                  <label
                    key={student.studentId}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.studentId)}
                      onChange={() => handleSelect(student.studentId)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-sm text-gray-500">
                        {student.studentCode} • {student.majorCode} • K{student.cohort}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(student.totalOutstanding)}
                      </p>
                      <p className="text-xs text-gray-500">{student.billsCount} hóa đơn</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendReminders}
            disabled={sending || selectedStudents.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Gửi {selectedStudents.length} email nhắc nhở</span>
              </>
            )}
          </button>
        </>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Chưa có lịch sử gửi reminders</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày gửi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map(reminder => (
                  <tr key={reminder._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{reminder.student?.fullName}</p>
                      <p className="text-sm text-gray-500">{reminder.student?.studentCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {reminderTypeLabel(reminder.reminderType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(reminder.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(reminder.sentAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentReminderPage;
