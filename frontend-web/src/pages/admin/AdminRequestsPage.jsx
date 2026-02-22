// AdminRequestsPage.jsx
// Trang Quản lý Đơn từ - dành cho Admin / Staff
// Chức năng: Xem tất cả đơn, lọc theo trạng thái, duyệt / từ chối + ghi chú
// Tác giả: Group02 - WDP391

import { useState, useEffect } from 'react';
import requestService from '../../services/requestService';

// ─────────────────────────────────────────────────────────────
// HẰNG SỐ
// ─────────────────────────────────────────────────────────────

// Badge màu sắc theo trạng thái
const STATUS_STYLES = {
  Pending:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Processing: 'bg-blue-100 text-blue-800 border border-blue-200',
  Approved:   'bg-green-100 text-green-800 border border-green-200',
  Rejected:   'bg-red-100 text-red-800 border border-red-200',
  Cancelled:  'bg-slate-100 text-slate-600 border border-slate-200',
};

const STATUS_LABELS = {
  Pending:    'Chờ xử lý',
  Processing: 'Đang xử lý',
  Approved:   'Đã duyệt',
  Rejected:   'Từ chối',
  Cancelled:  'Đã hủy',
};

// Các tùy chọn lọc
const FILTER_OPTIONS = [
  { value: 'all',        label: 'Tất cả' },
  { value: 'Pending',    label: 'Chờ xử lý' },
  { value: 'Processing', label: 'Đang xử lý' },
  { value: 'Approved',   label: 'Đã duyệt' },
  { value: 'Rejected',   label: 'Từ chối' },
  { value: 'Cancelled',  label: 'Đã hủy' },
];

// ─────────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────────
export default function AdminRequestsPage() {
  // ── STATE ──────────────────────────────────────────────────

  // Danh sách đơn từ backend
  const [requests, setRequests] = useState([]);

  // Đang tải không
  const [isLoading, setIsLoading] = useState(true);

  // Lọc theo trạng thái
  const [filterStatus, setFilterStatus] = useState('all');

  // Tìm kiếm theo tên / mã sinh viên
  const [searchText, setSearchText] = useState('');

  // Đơn đang xem chi tiết (null nếu không xem)
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Hiện popup duyệt/từ chối không
  const [reviewModal, setReviewModal] = useState(null);
  // reviewModal = { request, action: 'Approved' | 'Rejected' | 'Processing' }

  // Thông báo thành công (tự tắt sau 3 giây)
  const [successMsg, setSuccessMsg] = useState('');

  // Thông báo lỗi tổng
  const [loadError, setLoadError] = useState('');

  // ── TẢI DỮ LIỆU KHI LỌC THAY ĐỔI ─────────────────────────
  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  async function loadRequests() {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await requestService.adminGetAllRequests(filterStatus);
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn:', err);
      setLoadError(err.response?.data?.message || 'Không tải được danh sách đơn');
    } finally {
      setIsLoading(false);
    }
  }

  // Hiện thông báo thành công rồi tự tắt
  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  // ── LỌC THEO TỪ KHÓA TÌM KIẾM (client-side) ─────────────
  const displayedRequests = requests.filter((req) => {
    if (!searchText.trim()) return true;
    const kw = searchText.toLowerCase();
    const studentName = req.student?.fullName?.toLowerCase() || '';
    const studentCode = req.student?.studentCode?.toLowerCase() || '';
    const requestType = req.requestType?.toLowerCase() || '';
    return (
      studentName.includes(kw) ||
      studentCode.includes(kw) ||
      requestType.includes(kw)
    );
  });

  // ── XỬ LÝ KHI ADMIN XÁC NHẬN DUYỆT / TỪ CHỐI ────────────
  async function handleConfirmReview(staffNote) {
    if (!reviewModal) return;
    try {
      await requestService.adminReviewRequest(
        reviewModal.request._id,
        reviewModal.action,
        staffNote,
      );
      const actionText =
        reviewModal.action === 'Approved' ? 'Duyệt thành công ✅' :
        reviewModal.action === 'Rejected' ? 'Từ chối thành công ✅' :
        'Đã chuyển sang Đang xử lý ✅';
      showSuccess(actionText);
      setReviewModal(null);
      setSelectedRequest(null); // Đóng chi tiết nếu đang xem
      loadRequests(); // Tải lại danh sách
    } catch (err) {
      const msg = err.response?.data?.message || 'Thao tác thất bại';
      alert('Lỗi: ' + msg);
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER CHÍNH
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* ── THÔNG BÁO THÀNH CÔNG ── */}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
            {successMsg}
          </div>
        )}

        {/* ── TIÊU ĐỀ TRANG ── */}
        <div className="mb-6">
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Quản lý</span>
            <span>›</span>
            <span className="text-slate-600 font-medium">Đơn từ sinh viên</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn từ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem, duyệt và xử lý các đơn từ mà sinh viên đã gửi.
          </p>
        </div>

        {/* ── THANH CÔNG CỤ: Lọc + Tìm kiếm ── */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Các tab lọc theo trạng thái */}
          <div className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 p-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
                {/* Hiện số đơn nếu không phải "Tất cả" */}
                {opt.value !== 'all' && filterStatus === 'all' && (
                  <span className="ml-1 opacity-60">
                    ({requests.filter((r) => r.status === opt.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-48 max-w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm tên, MSSV, loại đơn..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {/* Số kết quả */}
          <span className="text-xs text-slate-400 ml-auto">
            {isLoading ? 'Đang tải...' : `${displayedRequests.length} đơn`}
          </span>
        </div>

        {/* ── NỘI DUNG CHÍNH: Bảng bên trái + Chi tiết bên phải ── */}
        <div className="flex gap-5">

          {/* BẢNG DANH SÁCH */}
          <div className={`flex-1 min-w-0 ${selectedRequest ? 'hidden lg:block' : ''}`}>

            {/* Đang tải */}
            {isLoading && (
              <div className="flex items-center justify-center rounded-xl bg-white border border-slate-200 py-16 text-slate-400">
                Đang tải danh sách...
              </div>
            )}

            {/* Lỗi tải */}
            {!isLoading && loadError && (
              <div className="rounded-xl bg-white border border-slate-200 py-12 text-center">
                <p className="text-red-500 text-sm">{loadError}</p>
                <button
                  onClick={loadRequests}
                  className="mt-3 rounded-md bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Danh sách rỗng */}
            {!isLoading && !loadError && displayedRequests.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <p className="text-3xl">📭</p>
                <p className="mt-2 text-sm font-medium text-slate-600">Không có đơn nào</p>
              </div>
            )}

            {/* Danh sách đơn */}
            {!isLoading && !loadError && displayedRequests.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header bảng */}
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <div className="col-span-3">Sinh viên</div>
                  <div className="col-span-3">Loại đơn</div>
                  <div className="col-span-2">Ngày gửi</div>
                  <div className="col-span-2">Trạng thái</div>
                  <div className="col-span-2 text-right">Thao tác</div>
                </div>

                {/* Các dòng */}
                {displayedRequests.map((req) => (
                  <RequestRow
                    key={req._id}
                    request={req}
                    isSelected={selectedRequest?._id === req._id}
                    onSelect={() => setSelectedRequest(req)}
                    onApprove={() => setReviewModal({ request: req, action: 'Approved' })}
                    onReject={() => setReviewModal({ request: req, action: 'Rejected' })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* PANEL CHI TIẾT (xuất hiện khi click vào dòng) */}
          {selectedRequest && (
            <RequestDetailPanel
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onApprove={() => setReviewModal({ request: selectedRequest, action: 'Approved' })}
              onReject={() => setReviewModal({ request: selectedRequest, action: 'Rejected' })}
              onSetProcessing={() => setReviewModal({ request: selectedRequest, action: 'Processing' })}
            />
          )}
        </div>
      </div>

      {/* ── POPUP DUYỆT / TỪ CHỐI ── */}
      {reviewModal && (
        <ReviewModal
          action={reviewModal.action}
          requestType={reviewModal.request.requestType}
          onConfirm={handleConfirmReview}
          onClose={() => setReviewModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Dòng trong bảng danh sách
// ─────────────────────────────────────────────────────────────
function RequestRow({ request, isSelected, onSelect, onApprove, onReject }) {
  const student = request.student || {};

  return (
    <div
      onClick={onSelect}
      className={`grid cursor-pointer grid-cols-12 gap-2 border-b border-slate-100 px-4 py-3.5 text-sm transition-colors last:border-0 ${
        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
      }`}
    >
      {/* Cột: Sinh viên */}
      <div className="col-span-3">
        <p className="font-medium text-slate-800 truncate">{student.fullName || '—'}</p>
        <p className="text-xs text-slate-400">{student.studentCode || '—'}</p>
      </div>

      {/* Cột: Loại đơn */}
      <div className="col-span-3 flex items-center">
        <span className="truncate text-slate-700">{request.requestType}</span>
      </div>

      {/* Cột: Ngày gửi */}
      <div className="col-span-2 flex items-center text-xs text-slate-500">
        {new Date(request.createdAt).toLocaleDateString('vi-VN')}
      </div>

      {/* Cột: Trạng thái */}
      <div className="col-span-2 flex items-center">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            STATUS_STYLES[request.status] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </div>

      {/* Cột: Thao tác nhanh (chỉ hiện khi Pending) */}
      <div
        className="col-span-2 flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()} // Không trigger onClick của dòng
      >
        {request.status === 'Pending' && (
          <>
            <button
              onClick={onApprove}
              title="Duyệt đơn"
              className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors border border-green-200"
            >
              ✓ Duyệt
            </button>
            <button
              onClick={onReject}
              title="Từ chối"
              className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors border border-red-200"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Panel chi tiết đơn (bên phải màn hình)
// ─────────────────────────────────────────────────────────────
function RequestDetailPanel({ request, onClose, onApprove, onReject, onSetProcessing }) {
  const student = request.student || {};
  const isPending = request.status === 'Pending';
  const isProcessing = request.status === 'Processing';
  const canReview = isPending || isProcessing;

  return (
    <div className="w-full lg:w-96 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header panel */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-800">Chi tiết đơn</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 220px)' }}>

        {/* Badge trạng thái */}
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_STYLES[request.status] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {STATUS_LABELS[request.status] || request.status}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(request.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Loại đơn */}
        <DetailRow label="Loại yêu cầu" value={request.requestType} bold />

        {/* Thông tin sinh viên */}
        <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Thông tin sinh viên
          </p>
          <DetailRow label="Họ tên" value={student.fullName || '—'} />
          <DetailRow label="MSSV" value={student.studentCode || '—'} />
          <DetailRow label="Email" value={student.email || '—'} />
          <DetailRow label="Ngành" value={student.majorCode || '—'} />
        </div>

        {/* Thời gian */}
        {(request.startDate || request.endDate) && (
          <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Thời gian
            </p>
            {request.startDate && (
              <DetailRow
                label="Ngày bắt đầu"
                value={new Date(request.startDate).toLocaleDateString('vi-VN')}
              />
            )}
            {request.endDate && (
              <DetailRow
                label="Ngày kết thúc"
                value={new Date(request.endDate).toLocaleDateString('vi-VN')}
              />
            )}
          </div>
        )}

        {/* Môn học liên quan */}
        {request.relatedSubject && (
          <DetailRow label="Môn học liên quan" value={request.relatedSubject} />
        )}

        {/* Lý do / Nội dung */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Nội dung chi tiết
          </p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {request.reason}
          </p>
        </div>

        {/* Tệp đính kèm */}
        {request.attachments?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tài liệu đính kèm
            </p>
            <ul className="space-y-1">
              {request.attachments.map((att, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                >
                  <span>📎</span>
                  <span className="truncate">{att}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ghi chú từ staff (nếu có) */}
        {request.staffNote && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Phản hồi của giáo vụ
            </p>
            <p className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
              {request.staffNote}
            </p>
          </div>
        )}
      </div>

      {/* Các nút thao tác ở dưới panel */}
      {canReview && (
        <div className="border-t border-slate-200 p-4 space-y-2">
          <p className="text-xs text-slate-400 mb-2">Chọn hành động:</p>

          {/* Nút Duyệt */}
          <button
            onClick={onApprove}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            ✔ Duyệt đơn (Approve)
          </button>

          {/* Nút Đang xử lý */}
          {isPending && (
            <button
              onClick={onSetProcessing}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              🔄 Chuyển sang Đang xử lý
            </button>
          )}

          {/* Nút Từ chối */}
          <button
            onClick={onReject}
            className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            ✕ Từ chối (Reject)
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT NHỎ: Một dòng thông tin label: value
// ─────────────────────────────────────────────────────────────
function DetailRow({ label, value, bold = false }) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="shrink-0 text-slate-400 text-xs">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Popup xác nhận Duyệt / Từ chối
// Có ô nhập ghi chú phản hồi
// ─────────────────────────────────────────────────────────────
function ReviewModal({ action, requestType, onConfirm, onClose }) {
  // Nội dung ghi chú / lý do
  const [staffNote, setStaffNote] = useState('');

  // Màu sắc và text theo hành động
  const isApprove    = action === 'Approved';
  const isProcessing = action === 'Processing';
  const actionLabel  = isApprove ? 'Duyệt đơn' : isProcessing ? 'Chuyển sang Đang xử lý' : 'Từ chối đơn';
  const btnColor     = isApprove
    ? 'bg-green-600 hover:bg-green-700'
    : isProcessing
      ? 'bg-blue-600 hover:bg-blue-700'
      : 'bg-red-600 hover:bg-red-700';
  const icon         = isApprove ? '✔' : isProcessing ? '🔄' : '✕';

  return (
    // Lớp phủ (backdrop)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 ${isApprove ? 'bg-green-600' : isProcessing ? 'bg-blue-600' : 'bg-red-600'}`}>
          <h2 className="text-base font-bold text-white">
            {icon} {actionLabel}
          </h2>
          <p className="text-xs text-white/70 mt-0.5 truncate">
            Đơn: &quot;{requestType}&quot;
          </p>
        </div>

        <div className="p-5">
          {/* Ô nhập ghi chú */}
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {isApprove
              ? 'Ghi chú phản hồi (không bắt buộc)'
              : isProcessing
                ? 'Ghi chú (không bắt buộc)'
                : 'Lý do từ chối (không bắt buộc)'}
          </label>
          <textarea
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            rows={4}
            placeholder={
              isApprove
                ? 'VD: Đơn hợp lệ, đã xử lý...'
                : isProcessing
                  ? 'VD: Đang chờ xác nhận từ trưởng khoa...'
                  : 'VD: Lý do không đủ điều kiện, thiếu minh chứng...'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <p className="mt-1 text-xs text-slate-400">
            Nội dung này sẽ được gửi email thông báo đến sinh viên.
          </p>

          {/* Nút thao tác */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => onConfirm(staffNote)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-colors ${btnColor}`}
            >
              {icon} Xác nhận {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
