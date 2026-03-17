import { useState, useEffect } from 'react';
import requestService from '../../services/requestService';
import registrationPeriodService from '../../services/registrationPeriodService';
import { useSocket } from '../../contexts/SocketContext';

const REQUEST_TYPES = [
  'Xin nghỉ học có phép',
  'Xin hoãn thi',
  'Khiếu nại điểm',
  'Xin bảo lưu kết quả học tập',
  'Xin xác nhận sinh viên',
  'Xin cấp bảng điểm',
  'Xin chuyển lớp',
  'Xin gia hạn học phí',
  'Khác',
];

const STATUS_STYLES = {
  Pending:    'bg-yellow-100 text-yellow-800',
  Processing: 'bg-blue-100 text-blue-800',
  Approved:   'bg-green-100 text-green-800',
  Rejected:   'bg-red-100 text-red-800',
  Cancelled:  'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
  Pending:    'Chờ xử lý',
  Processing: 'Đang xử lý',
  Approved:   'Đã duyệt',
  Rejected:   'Từ chối',
  Cancelled:  'Đã hủy',
};

const EMPTY_FORM = {
  requestType: '',
  startDate: '',
  endDate: '',
  relatedSubject: '',
  reason: '',
  attachments: [], 
};

const PERIOD_TYPE_LABELS = {
  all: 'Tất cả loại đơn',
  repeat: 'Học lại',
  overload: 'Học vượt',
  change_class: 'Chuyển lớp',
  drop: 'Hủy môn',
};

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('vi-VN');
}

export default function StudentRequestsPage() {
  const { socket } = useSocket();

  const [requests, setRequests] = useState([]);

  const [isLoadingList, setIsLoadingList] = useState(true);

  const [view, setView] = useState('list');

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formError, setFormError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  // Thông báo trạng thái đợt đăng ký đơn trên UI
  const [requestPeriodNotice, setRequestPeriodNotice] = useState({
    loading: true,
    isOpen: false,
    message: 'Đang kiểm tra đợt đăng ký đơn...',
    periods: [],
  });
  const [openRequestTypes, setOpenRequestTypes] = useState([]);
  const [isOpenTypeMenuOpen, setIsOpenTypeMenuOpen] = useState(false);
  const [isOpenPeriodsVisible, setIsOpenPeriodsVisible] = useState(false);
  const [selectedOpenType, setSelectedOpenType] = useState('all');

  const [cancelConfirm, setCancelConfirm] = useState(null); 

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    checkRequestPeriodStatus();
  }, []);

  // Lắng nghe realtime event đợt đăng ký được cập nhật
  useEffect(() => {
    if (!socket) return;

    const handleRegistrationPeriodUpdated = async (eventData) => {
      const noticeMessage = eventData?.notificationType === 'registration-available'
        ? 'Đợt đăng ký đơn đã mở. Bạn có thể gửi yêu cầu.'
        : 'Đợt đăng ký đơn vừa được cập nhật.';

      showSuccess(noticeMessage);
      setIsOpenTypeMenuOpen(false);
      setIsOpenPeriodsVisible(false);
      await checkRequestPeriodStatus();
    };

    socket.on('registration-period-updated', handleRegistrationPeriodUpdated);

    return () => {
      socket.off('registration-period-updated', handleRegistrationPeriodUpdated);
    };
  }, [socket]);

  // Kiểm tra trạng thái đợt đăng ký đơn hiện tại
  async function checkRequestPeriodStatus() {
    try {
      const res = await registrationPeriodService.getOpenRequestTypes();
      const data = res?.data?.data || {};
      const isOpen = !!data?.isOpen;
      const periods = Array.isArray(data?.periods) ? data.periods : [];
      const types = Array.isArray(data?.openTypes) ? data.openTypes : [];

      // Nếu selected type không còn mở thì reset về all để tránh trạng thái lọc rỗng.
      if (selectedOpenType !== 'all' && !types.includes(selectedOpenType)) {
        setSelectedOpenType('all');
      }

      if (types.length === 0) {
        setIsOpenPeriodsVisible(false);
        setIsOpenTypeMenuOpen(false);
      }

      setRequestPeriodNotice({
        loading: false,
        isOpen,
        periods,
        message: isOpen
          ? `Hiện có ${periods.length} đợt đăng ký đơn đang mở.`
          : 'Đợt đăng ký đơn hiện chưa mở.',
      });
      setOpenRequestTypes(types);
    } catch (error) {
      setRequestPeriodNotice({
        loading: false,
        isOpen: false,
        periods: [],
        message: 'Đợt đăng ký đơn hiện chưa mở.',
      });
      setOpenRequestTypes([]);
      setSelectedOpenType('all');
      setIsOpenPeriodsVisible(false);
      setIsOpenTypeMenuOpen(false);
    }
  }

  const filteredOpenPeriods = (requestPeriodNotice.periods || []).filter((period) => {
    if (selectedOpenType === 'all') return true;
    if (period.requestType === 'all') return true;
    return period.requestType === selectedOpenType;
  });

  // Hàm tải danh sách đơn từ backend
  async function loadRequests() {
    setIsLoadingList(true);
    try {
      const res = await requestService.getMyRequests();
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn:', err);
    } finally {
      setIsLoadingList(false);
    }
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreateForm() {
    if (!requestPeriodNotice.isOpen) {
      setFormError('Đợt đăng ký đơn hiện chưa mở, bạn chưa thể tạo yêu cầu mới.');
      return;
    }

    setForm(EMPTY_FORM);
    setFormError('');
    setEditingId(null);
    setView('create');
  }

  function openEditForm(request) {
    // Điền dữ liệu đơn vào form
    setForm({
      requestType: request.requestType || '',
      startDate: request.startDate ? request.startDate.substring(0, 10) : '',
      endDate: request.endDate ? request.endDate.substring(0, 10) : '',
      relatedSubject: request.relatedSubject || '',
      reason: request.reason || '',
      attachments: request.attachments || [],
    });
    setEditingId(request._id);
    setFormError('');
    setView('edit');
  }

  function handleCancelForm() {
    setView('list');
    setForm(EMPTY_FORM);
    setFormError('');
    setEditingId(null);
  }

  function validateForm() {
    if (!form.requestType.trim()) {
      return 'Vui lòng chọn loại yêu cầu';
    }
    if (!form.reason.trim()) {
      return 'Vui lòng nhập lý do / nội dung chi tiết';
    }
    return ''; 
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();

    const validErr = validateForm();
    if (validErr) {
      setFormError(validErr);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await requestService.createRequest(form);
      showSuccess('Gửi yêu cầu thành công!');
      setView('list');
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gửi yêu cầu thất bại, thử lại sau';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();

    const validErr = validateForm();
    if (validErr) {
      setFormError(validErr);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await requestService.updateRequest(editingId, form);
      showSuccess('Cập nhật đơn thành công!');
      setView('list');
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Cập nhật thất bại, thử lại sau';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCancelConfirm(request) {
    setCancelConfirm({ id: request._id, requestType: request.requestType });
  }

  async function handleConfirmCancel() {
    if (!cancelConfirm) return;

    try {
      await requestService.cancelRequest(cancelConfirm.id);
      showSuccess('Hủy đơn thành công!');
      setCancelConfirm(null);
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.message || 'Hủy đơn thất bại, thử lại sau';
      setCancelConfirm(null);
      alert('Lỗi: ' + msg);
    }
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
          ✅ {successMsg}
        </div>
      )}

      {!requestPeriodNotice.loading && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
            requestPeriodNotice.isOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {requestPeriodNotice.message}
        </div>
      )}

      {!requestPeriodNotice.loading && requestPeriodNotice.periods.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpenPeriodsVisible((prev) => !prev);
              setIsOpenTypeMenuOpen(false);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isOpenPeriodsVisible
              ? 'Ẩn các loại đơn đang mở'
              : `Các loại đơn đang mở (${requestPeriodNotice.periods.length})`}
          </button>
        </div>
      )}

      {!requestPeriodNotice.loading && isOpenPeriodsVisible && requestPeriodNotice.periods.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Thông tin các đợt đăng ký đang mở</h3>
              <p className="mt-1 text-xs text-slate-500">
                Đang hiển thị {filteredOpenPeriods.length}/{requestPeriodNotice.periods.length} đợt theo bộ lọc loại đơn.
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpenTypeMenuOpen((prev) => !prev)}
                disabled={openRequestTypes.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Lọc loại đơn ({requestPeriodNotice.periods.length})
              </button>

              {isOpenTypeMenuOpen && openRequestTypes.length > 0 && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold text-slate-500">Danh sách loại đơn đang mở</p>
                  {openRequestTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedOpenType(type);
                        setIsOpenTypeMenuOpen(false);
                      }}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 ${
                        selectedOpenType === type ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      {PERIOD_TYPE_LABELS[type] || type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {filteredOpenPeriods.map((period) => (
              <div key={period._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <div>
                    <span className="font-medium">Tên đợt:</span> {period.periodName || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Loại đơn:</span>{' '}
                    {PERIOD_TYPE_LABELS[period.requestType] || period.requestType || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Bắt đầu:</span> {formatDateTime(period.startDate)}
                  </div>
                  <div>
                    <span className="font-medium">Kết thúc:</span> {formatDateTime(period.endDate)}
                  </div>
                  <div>
                    <span className="font-medium">Học kỳ:</span>{' '}
                    {period.semester?.name || period.semester?.code || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Đối tượng:</span>{' '}
                    {Array.isArray(period.allowedCohorts) && period.allowedCohorts.length > 0
                      ? period.allowedCohorts.map((k) => `K${k}`).join(', ')
                      : 'Tất cả khóa'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Đơn từ & Thủ tục</h1>
              <p className="mt-1 text-sm text-slate-500">
                Danh sách các yêu cầu bạn đã gửi đến phòng Công tác Sinh viên.
              </p>
            </div>
            <button
              onClick={openCreateForm}
              disabled={!requestPeriodNotice.isOpen}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors"
            >
              <span>＋</span> Tạo yêu cầu mới
            </button>
          </div>

          {/* Đang tải */}
          {isLoadingList && (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <span>Đang tải...</span>
            </div>
          )}

          {/* Danh sách rỗng */}
          {!isLoadingList && requests.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-4xl">📄</p>
              <p className="mt-3 font-medium text-slate-600">Bạn chưa có đơn nào</p>
              <p className="mt-1 text-sm text-slate-400">
                Nhấn &quot;Tạo yêu cầu mới&quot; để gửi đơn đến phòng CTSV
              </p>
            </div>
          )}

          {/* Bảng danh sách */}
          {!isLoadingList && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  {/* Dòng 1: Loại đơn + Badge trạng thái */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">{req.requestType}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Ngày gửi: {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </div>

                  {/* Dòng 2: Lý do (tóm tắt) */}
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{req.reason}</p>

                  {/* Dòng 2b: Ghi chú từ phòng CTSV (nếu có) */}
                  {req.staffNote && (
                    <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                      req.status === 'Approved'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : req.status === 'Rejected'
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}>
                      <span className="font-semibold">Phản hồi từ phòng CTSV: </span>
                      {req.staffNote}
                    </div>
                  )}

                  {/* Dòng 3: Nút thao tác (chỉ hiện khi Pending) */}
                  {req.status === 'Pending' && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      {/* Nút Chỉnh sửa */}
                      <button
                        onClick={() => openEditForm(req)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Chỉnh sửa
                      </button>
                      {/* Nút Hủy đơn */}
                      <button
                        onClick={() => openCancelConfirm(req)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Hủy đơn
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(view === 'create' || view === 'edit') && (
        <div>
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <button
              onClick={handleCancelForm}
              className="hover:text-blue-600 hover:underline"
            >
              Đơn
            </button>
            <span>/</span>
            <span className="text-blue-600 font-medium">
              {view === 'create' ? 'Tạo mới' : 'Chỉnh sửa'}
            </span>
          </div>

          {/* Tiêu đề trang */}
          <h1 className="text-2xl font-bold text-slate-800">
            {view === 'create' ? 'Gửi yêu cầu / Đơn từ' : 'Chỉnh sửa yêu cầu'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Điền thông tin bên dưới để gửi yêu cầu đến phòng Công tác Sinh viên.
          </p>

          {/* Thông báo lỗi form */}
          {formError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
              ⚠️ {formError}
            </div>
          )}

          {/* FORM */}
          <form
            onSubmit={view === 'create' ? handleCreateSubmit : handleEditSubmit}
            className="mt-6 space-y-6"
          >
            {/* ── KHỐI 1: THÔNG TIN YÊU CẦU ── */}
            <Section title="Thông tin yêu cầu">
              {/* Loại yêu cầu (bắt buộc) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Loại yêu cầu <span className="text-red-500">*</span>
                </label>
                <select
                  name="requestType"
                  value={form.requestType}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Chọn loại yêu cầu --</option>
                  {REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày bắt đầu và kết thúc */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ngày bắt đầu nghỉ / thi
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ngày kết thúc (nếu có)
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Môn học liên quan (tùy chọn) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Môn học liên quan (tùy chọn)
                </label>
                <input
                  type="text"
                  name="relatedSubject"
                  value={form.relatedSubject}
                  onChange={handleFormChange}
                  placeholder="VD: PRJ301, SWD392..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Chỉ chọn nếu đơn từ liên quan đến một môn học cụ thể.
                </p>
              </div>
            </Section>

            {/* ── KHỐI 2: CHI TIẾT & MINH CHỨNG ── */}
            <Section title="Chi tiết & Minh chứng">
              {/* Lý do / Nội dung chi tiết (bắt buộc) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Lý do / Nội dung chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleFormChange}
                  rows={5}
                  placeholder="Trình bày rõ lý do của bạn..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tài liệu đính kèm (Minh chứng) */}
              {/* Hiện tại chỉ là UI giả lập - chưa upload thật */}
              <AttachmentUploader
                attachments={form.attachments}
                onChange={(newAttachments) =>
                  setForm((prev) => ({ ...prev, attachments: newAttachments }))
                }
              />
            </Section>

            {/* ── NÚT THAO TÁC ── */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              {/* Nút Hủy bỏ → quay về danh sách */}
              <button
                type="button"
                onClick={handleCancelForm}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              {/* Nút Gửi / Lưu */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? (
                  'Đang xử lý...'
                ) : view === 'create' ? (
                  'Gửi yêu cầu'
                ) : (
                  'Lưu thay đổi'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {cancelConfirm && (
        <CancelConfirmDialog
          requestType={cancelConfirm.requestType}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelConfirm(null)}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Tiêu đề khối với thanh xanh bên trái */}
      <h2 className="mb-4 border-l-4 border-blue-500 pl-3 text-base font-semibold text-slate-800">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function AttachmentUploader({ attachments, onChange }) {
  // Khi chọn file từ input
  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const fileNames = files.map((f) => f.name);
    onChange([...attachments, ...fileNames]);
  }

  // Xóa một file khỏi danh sách
  function removeFile(index) {
    const updated = attachments.filter((_, i) => i !== index);
    onChange(updated);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        Tài liệu đính kèm (Minh chứng)
      </label>

      {/* Vùng kéo thả */}
      <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-8 hover:border-blue-400 hover:bg-blue-50 transition-colors">
        <span className="text-2xl text-slate-400">☁️</span>
        <span className="text-sm text-blue-600 font-medium">Tải lên tệp</span>
        <span className="text-xs text-slate-400">hoặc kéo thả vào đây</span>
        <span className="text-xs text-slate-400">PNG, JPG, PDF tối đa 10MB</span>
        {/* Input file ẩn, click vào label sẽ kích hoạt */}
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {/* Danh sách file đã chọn */}
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attachments.map((name, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
            >
              <span>📎 {name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-red-400 hover:text-red-600 font-bold ml-2"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CancelConfirmDialog({ requestType, onConfirm, onClose }) {
  return (
    // Lớp phủ tối (backdrop)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      {/* Hộp thoại */}
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        {/* Icon + Tiêu đề */}
        <div className="mb-4 text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="mt-2 text-lg font-bold text-slate-800">Xác nhận hủy đơn</h2>
        </div>

        {/* Nội dung xác nhận */}
        <p className="text-center text-sm text-slate-600">
          Bạn có chắc muốn hủy đơn{' '}
          <span className="font-semibold text-slate-800">&quot;{requestType}&quot;</span> không?
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">
          Hành động này không thể hoàn tác.
        </p>

        {/* Nút thao tác */}
        <div className="mt-5 flex gap-3">
          {/* Nút giữ lại (5a. Student cancels action) */}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Không, giữ lại
          </button>
          {/* Nút xác nhận hủy */}
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Có, hủy đơn
          </button>
        </div>
      </div>
    </div>
  );
}
