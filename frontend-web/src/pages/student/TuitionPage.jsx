import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import financeService from '../../services/financeService';
import payosService from '../../services/payosService';
import walletService from '../../services/walletService';

const PAYOS_SCRIPT_URL = 'https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js';

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAYMENT_METHOD = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  online: 'Online',
  other: 'Khác',
};

export default function TuitionPage() {
  const navigate = useNavigate();
  const [curriculumStatus, setCurriculumStatus] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isRefundingExcess, setIsRefundingExcess] = useState(false);
  const [tuitionExcess, setTuitionExcess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = PAYOS_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch (_) {} };
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const [statusRes, historyRes, excessRes] = await Promise.all([
        financeService.getCurriculumPaymentStatus(),
        financeService.getPaymentHistory(null),
        financeService.getTuitionExcess().catch(() => ({ data: { data: null } })),
      ]);
      setCurriculumStatus(statusRes.data.data);
      const allPayments = historyRes.data.data || [];
      setPaymentHistory(allPayments);
      setTuitionExcess(excessRes.data?.data ?? null);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) setError('Không tìm thấy học kỳ. Vui lòng liên hệ phòng Đào tạo.');
      else if (status === 403) setError('Không tìm thấy hồ sơ sinh viên.');
      else setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }

  // Lọc lịch sử nộp tiền theo mã kỳ curriculum hiện tại
  const semesterCode = curriculumStatus?.semesterCode;
  const semesterPayments = semesterCode
    ? paymentHistory.filter((p) => p.semesterCode === semesterCode)
    : [];
  const totalPaid = semesterPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalTuition = curriculumStatus?.tuitionFee?.finalTuitionFee ?? 0;
  const remainingDebt = Math.max(0, totalTuition - totalPaid);
  const hasPaid = curriculumStatus?.hasPaid ?? false;
  const refundable = tuitionExcess?.refundable ?? Math.max(0, totalPaid - totalTuition);

  const handleRefundExcess = async () => {
    if (refundable <= 0 || isRefundingExcess) return;
    setIsRefundingExcess(true);
    try {
      const res = await walletService.refundTuitionExcess();
      const data = res.data;
      if (data?.success) {
        toast.success(data?.message || 'Đã chuyển tiền thừa vào ví.');
        loadData();
      } else {
        toast.error(data?.message || 'Không thể chuyển tiền thừa vào ví.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsRefundingExcess(false);
    }
  };

  const handlePayNow = async () => {
    if (!curriculumStatus || hasPaid) {
      toast.warning('Bạn đã thanh toán học phí kỳ này rồi.');
      return;
    }
    setIsCreatingPayment(true);
    try {
      const res = await financeService.createCurriculumPayment();
      if (res.data.success && res.data.data?.checkoutUrl) {
        const data = res.data.data;
        setPaymentData({
          checkoutUrl: data.checkoutUrl,
          orderCode: data.orderCode,
          amount: data.amount,
          description: data.description,
          qrCode: data.qrCode,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        });
        setShowPaymentModal(true);
        if (data.bin) {
          try {
            const bankRes = await payosService.getListBank();
            if (bankRes.data?.data) {
              const bank = bankRes.data.data.find((b) => b.bin === data.bin);
              setBankInfo(bank);
            }
          } catch (_) {}
        }
      } else {
        toast.error(res.data?.message || 'Không tạo được phiên thanh toán.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo thanh toán.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const openPayOSCheckout = () => {
    if (!paymentData?.checkoutUrl || !window.PayOSCheckout) {
      toast.warning('Đang tải cổng thanh toán...');
      return;
    }
    let url = paymentData.checkoutUrl;
    if (url.startsWith('https://dev.pay.payos.vn')) url = url.replace('https://dev.pay.payos.vn', 'https://next.dev.pay.payos.vn');
    if (url.startsWith('https://pay.payos.vn')) url = url.replace('https://pay.payos.vn', 'https://next.pay.payos.vn');
    const { open } = window.PayOSCheckout.usePayOS({
      RETURN_URL: `${window.location.origin}/student/payment/result`,
      ELEMENT_ID: 'payos-checkout-container',
      CHECKOUT_URL: url,
      onSuccess: (e) => {
        window.location.href = `${window.location.origin}/student/payment/result?orderCode=${e.orderCode}`;
      },
      onCancel: () => {
        setShowPaymentModal(false);
        setPaymentData(null);
      },
      onExit: () => {},
    });
    open();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(String(text));
    toast.success('Đã sao chép!');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 font-medium text-red-600">{error}</p>
          <button onClick={loadData} className="mt-4 rounded-lg bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!curriculumStatus) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Chưa có thông tin học phí theo kỳ. Vui lòng liên hệ phòng Đào tạo.</p>
        </div>
      </div>
    );
  }

  const tf = curriculumStatus.tuitionFee || {};
  const credits = tf.totalCredits ?? 0;
  const pricePerCredit = tf.pricePerCredit ?? 100;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Học phí</h1>
            <p className="mt-1 text-sm text-slate-500">Xem tổng quan học phí và lịch sử nộp tiền của bạn.</p>
          </div>
          {!hasPaid && remainingDebt > 0 && (
            <button
              onClick={handlePayNow}
              disabled={isCreatingPayment}
              className="rounded-lg bg-[#5D5FEF] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4dcf] disabled:opacity-50"
            >
              {isCreatingPayment ? 'Đang tạo...' : 'Thanh toán ngay'}
            </button>
          )}
        </div>

        {/* Học kỳ đang xem */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Học kỳ đang xem</p>
            <p className="mt-0.5 font-bold text-blue-900">
              {curriculumStatus.curriculumSemesterName} – {curriculumStatus.curriculumName}
            </p>
            <p className="text-xs text-blue-600">Năm học: {curriculumStatus.currentAcademicYear || '—'}</p>
          </div>
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">{credits} tín chỉ đăng ký</span>
        </div>

        {/* 3 thẻ: Tổng học phí / Đã nộp / Còn nợ */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            icon="📋"
            label="Tổng học phí"
            amount={totalTuition}
            color="slate"
            description={`${credits} TC × ${formatMoney(pricePerCredit)}/TC + phí khác`}
          />
          <SummaryCard
            icon="✅"
            label="Đã nộp"
            amount={totalPaid}
            color="green"
            description={`${semesterPayments.length} lần nộp tiền`}
          />
          <SummaryCard
            icon={remainingDebt === 0 ? '🎉' : '⚠️'}
            label="Còn nợ"
            amount={remainingDebt}
            color={remainingDebt === 0 ? 'green' : 'red'}
            description={remainingDebt === 0 ? 'Đã nộp đủ học phí!' : 'Vui lòng nộp trước hạn'}
          />
        </div>

        {/* Tiền thừa → chuyển vào ví */}
        {refundable > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Bạn đã nộp thừa <strong>{formatMoney(refundable)}</strong> so với học phí kỳ này.
            </p>
            <p className="mt-1 text-xs text-amber-700">Số tiền thừa có thể chuyển vào ví để dùng cho các kỳ sau.</p>
            <button
              type="button"
              onClick={handleRefundExcess}
              disabled={isRefundingExcess}
              className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isRefundingExcess ? 'Đang xử lý...' : 'Chuyển vào ví'}
            </button>
          </div>
        )}

        {/* Chi tiết tính học phí */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Chi tiết tính học phí</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <FeeRow label="Số tín chỉ đăng ký" value={`${credits} tín chỉ`} />
            <FeeRow label="Đơn giá / tín chỉ" value={formatMoney(pricePerCredit)} />
            <FeeRow label="Học phí theo tín chỉ" value={formatMoney(credits * pricePerCredit)} bold />
            <FeeRow label="TỔNG HỌC PHÍ" value={formatMoney(totalTuition)} highlight />
          </div>
        </div>

        {/* Lịch sử nộp tiền */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Lịch sử nộp tiền
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                {semesterPayments.length} giao dịch
              </span>
            </h2>
          </div>
          {semesterPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Chưa có giao dịch nào trong học kỳ này</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {semesterPayments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{payment.note || 'Nộp học phí'}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(payment.paidAt)} · {PAYMENT_METHOD[payment.method] || payment.method}
                    </p>
                  </div>
                  <span className="font-bold text-green-600">+{formatMoney(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal thanh toán: QR + chuyển khoản + Mở cổng PayOS */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Thanh toán học phí</h3>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentData(null); }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Mã đơn: #{paymentData.orderCode}</p>
                <p className="text-xl font-bold text-red-600">{formatMoney(paymentData.amount)}</p>
                <p className="text-sm text-slate-600">{paymentData.description}</p>
              </div>
              {paymentData.qrCode && (
                <div className="flex flex-col items-center rounded-lg bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">Quét mã QR thanh toán</p>
                  <QRCodeCanvas value={paymentData.qrCode} size={180} level="M" />
                </div>
              )}
              {(paymentData.accountNumber || paymentData.accountName) && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
                  {paymentData.accountName && <p><span className="text-slate-500">Chủ TK:</span> {paymentData.accountName}</p>}
                  {paymentData.accountNumber && (
                    <p className="flex items-center gap-2">
                      <span className="text-slate-500">Số TK:</span>
                      <span className="font-mono">{paymentData.accountNumber}</span>
                      <button onClick={() => copyToClipboard(paymentData.accountNumber)} className="text-blue-600 hover:underline">Sao chép</button>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="font-bold text-red-600">{formatMoney(paymentData.amount)}</span>
                    <button onClick={() => copyToClipboard(paymentData.amount)} className="text-blue-600 hover:underline">Sao chép</button>
                  </p>
                  {paymentData.description && (
                    <p className="flex items-center gap-2">
                      <span className="text-slate-500">Nội dung:</span>
                      <span className="break-all font-medium">{paymentData.description}</span>
                      <button onClick={() => copyToClipboard(paymentData.description)} className="text-blue-600 hover:underline shrink-0">Sao chép</button>
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  onClick={openPayOSCheckout}
                  className="w-full rounded-lg bg-[#5D5FEF] py-3 font-medium text-white hover:bg-[#4a4dcf]"
                >
                  Mở cổng thanh toán PayOS
                </button>
                <button
                  onClick={() => navigate(`/student/payment/result?orderCode=${paymentData.orderCode}`)}
                  className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Kiểm tra kết quả
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div id="payos-checkout-container" />
    </div>
  );
}

const CARD_COLORS = {
  slate: 'border-slate-200 bg-white text-slate-800',
  green: 'border-green-200 bg-green-50 text-green-800',
  red: 'border-red-200 bg-red-50 text-red-700',
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

function FeeRow({ label, value, bold, highlight }) {
  return (
    <div className={`px-5 py-3 ${highlight ? 'bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm ${highlight ? 'font-bold text-blue-800' : bold ? 'font-semibold text-slate-700' : 'text-slate-600'}`}>{label}</p>
        <p className={`text-sm ${highlight ? 'font-bold text-blue-800' : bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{value}</p>
      </div>
    </div>
  );
}
