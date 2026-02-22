import { useState, useEffect } from 'react';
import financeService from '../../services/financeService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function TuitionPage() {
  const [summary, setSummary]   = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState('');
  const [selectedSemester, setSelectedSemester] = useState(''); 

  useEffect(() => {
    loadSummary();
  }, [selectedSemester]);

  async function loadSummary() {
    setIsLoading(true);
    setError('');
    try {
      const res = await financeService.getMyTuitionSummary(selectedSemester || null);
      setSummary(res.data.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Không tìm thấy học kỳ. Vui lòng liên hệ phòng Đào tạo.');
      } else if (status === 422) {
        setError('Học phí chưa được cấu hình cho học kỳ này. Vui lòng liên hệ phòng Tài chính.');
      } else if (status === 403) {
        setError('Không tìm thấy hồ sơ sinh viên. Vui lòng liên hệ phòng Công tác Sinh viên.');
      } else {
        setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">

        {/* ── TIÊU ĐỀ TRANG ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Học phí</h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem tổng quan học phí và lịch sử nộp tiền của bạn.
          </p>
        </div>

        {/* ── ĐANG TẢI ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm">Đang tải thông tin học phí...</p>
          </div>
        )}

        {/* ── LỖI ── */}
        {!isLoading && error && (
          <div className="rounded-xl bg-white border border-red-200 p-8 text-center shadow-sm">
            <p className="text-4xl">⚠️</p>
            <p className="mt-3 font-medium text-red-600">{error}</p>
            <button
              onClick={loadSummary}
              className="mt-4 rounded-lg bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ── NỘI DUNG CHÍNH ── */}
        {!isLoading && !error && summary && (
          <>
            {/* Thông tin học kỳ */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3">
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                  Học kỳ đang xem
                </p>
                <p className="mt-0.5 font-bold text-blue-900">{summary.semesterName}</p>
                <p className="text-xs text-blue-600">Năm học: {summary.academicYear}</p>
              </div>
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                {summary.registeredCredits} tín chỉ đăng ký
              </span>
            </div>

            {/* ── 3 THẺ TỔNG QUAN (Total / Paid / Debt) ── */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Tổng học phí */}
              <SummaryCard
                icon="📋"
                label="Tổng học phí"
                amount={summary.totalTuition}
                color="slate"
                description={`${summary.registeredCredits} TC × ${formatMoney(summary.pricePerCredit)}/TC + phí khác`}
              />

              {/* Đã nộp */}
              <SummaryCard
                icon="✅"
                label="Đã nộp"
                amount={summary.totalPaid}
                color="green"
                description={`${summary.paymentItems?.length || 0} lần nộp tiền`}
              />

              {/* Còn nợ */}
              <SummaryCard
                icon={summary.remainingDebt === 0 ? '🎉' : '⚠️'}
                label="Còn nợ"
                amount={summary.remainingDebt}
                color={summary.remainingDebt === 0 ? 'green' : 'red'}
                description={
                  summary.remainingDebt === 0
                    ? 'Đã nộp đủ học phí!'
                    : 'Vui lòng nộp trước hạn'
                }
              />
            </div>

            {/* ── DANH SÁCH MÔN ĐĂNG KÝ (từ khung chương trình) ── */}
            {summary.enrolledSubjects && summary.enrolledSubjects.length > 0 && (
              <div className="mb-5 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
                <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-blue-800">
                    Môn học đăng ký học kỳ này
                  </h2>
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    {summary.enrolledSubjects.length} môn · {summary.registeredCredits} TC
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {summary.enrolledSubjects.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {sub.subjectCode}
                        </span>
                        <span className="text-sm text-slate-700">{sub.subjectName}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xs text-slate-500">{sub.credits} TC</p>
                        <p className="text-sm font-medium text-slate-800">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(sub.tuitionFee)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CHI TIẾT TÍNH HỌC PHÍ ── */}
            <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Chi tiết tính học phí</h2>
              </div>
              <div className="divide-y divide-slate-100">
                <FeeRow
                  label="Số tín chỉ đăng ký"
                  value={`${summary.registeredCredits} tín chỉ`}
                />
                <FeeRow
                  label="Đơn giá / tín chỉ"
                  value={formatMoney(summary.pricePerCredit)}
                />
                <FeeRow
                  label="Học phí theo tín chỉ"
                  value={formatMoney(summary.registeredCredits * summary.pricePerCredit)}
                  bold
                />
                {summary.otherFeesTotal > 0 && (
                  <FeeRow
                    label="Các khoản phí khác"
                    value={formatMoney(summary.otherFeesTotal)}
                    subItems={summary.otherFeesItems?.map((f) => ({
                      label: f.feeName,
                      value: formatMoney(f.amount),
                    }))}
                  />
                )}
                <FeeRow
                  label="TỔNG HỌC PHÍ"
                  value={formatMoney(summary.totalTuition)}
                  highlight
                />
              </div>
            </div>

            {/* ── CÁC KHOẢN PHÍ KHÁC (nếu có) ── */}
            {summary.otherFeesItems && summary.otherFeesItems.length > 0 && (
              <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h2 className="text-sm font-semibold text-slate-700">Các khoản phí khác</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {summary.otherFeesItems.map((fee) => (
                    <FeeRow key={fee._id} label={fee.feeName} value={formatMoney(fee.amount)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── LỊCH SỬ NỘP TIỀN ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Lịch sử nộp tiền
                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                    {summary.paymentItems?.length || 0} giao dịch
                  </span>
                </h2>
              </div>

              {/* Chưa có giao dịch */}
              {(!summary.paymentItems || summary.paymentItems.length === 0) && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Chưa có giao dịch nào trong học kỳ này
                </div>
              )}

              {/* Danh sách giao dịch */}
              {summary.paymentItems && summary.paymentItems.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {summary.paymentItems.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {payment.note || 'Nộp học phí'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(payment.paidAt)} · {PAYMENT_METHOD[payment.method] || payment.method}
                        </p>
                      </div>
                      <span className="font-bold text-green-600">
                        +{formatMoney(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Thẻ tổng quan (Total / Paid / Debt)
// ─────────────────────────────────────────────────────────────
const CARD_COLORS = {
  slate: 'border-slate-200 bg-white text-slate-800',
  green: 'border-green-200 bg-green-50 text-green-800',
  red:   'border-red-200   bg-red-50   text-red-700',
};

function SummaryCard({ icon, label, amount, color, description }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${CARD_COLORS[color] || CARD_COLORS.slate}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold">{formatMoney(amount)}</p>
      <p className="mt-1 text-xs opacity-60">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Dòng trong bảng chi tiết học phí
// ─────────────────────────────────────────────────────────────
function FeeRow({ label, value, bold, highlight, subItems }) {
  return (
    <div className={`px-5 py-3 ${highlight ? 'bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between">
        <p
          className={`text-sm ${
            highlight ? 'font-bold text-blue-800' : bold ? 'font-semibold text-slate-700' : 'text-slate-600'
          }`}
        >
          {label}
        </p>
        <p
          className={`text-sm ${
            highlight ? 'font-bold text-blue-800' : bold ? 'font-semibold text-slate-800' : 'text-slate-700'
          }`}
        >
          {value}
        </p>
      </div>
      {/* Sub-items (VD: từng khoản phí khác) */}
      {subItems && subItems.length > 0 && (
        <div className="mt-1 space-y-0.5 pl-3">
          {subItems.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-400">
              <span>· {item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HẰNG SỐ: nhãn phương thức thanh toán
// ─────────────────────────────────────────────────────────────
const PAYMENT_METHOD = {
  cash:          'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  online:        'Online',
  other:         'Khác',
};
