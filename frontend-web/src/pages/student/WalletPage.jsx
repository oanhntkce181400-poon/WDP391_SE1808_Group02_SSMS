import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import walletService from '../../services/walletService';
import payosService from '../../services/payosService';

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

const TRANSACTION_TYPE = {
  deposit: 'Nạp tiền',
  payment: 'Thanh toán',
  refund: 'Hoàn tiền',
  withdrawal: 'Rút tiền',
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);

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
      const [walletRes, txRes] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getTransactions({ limit: 20 }),
      ]);
      setWallet(walletRes.data.data);
      setTransactions(txRes.data.data.transactions || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) setError('Chưa có ví. Vui lòng liên hệ phòng Công tác Sinh viên.');
      else setError(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount <= 0) {
      toast.warning('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (amount < 10000) {
      toast.warning('Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }

    setIsCreatingPayment(true);
    try {
      const res = await walletService.createDeposit(amount);
      const d = res.data;
      const checkoutUrl = d?.data?.checkoutUrl ?? d?.checkoutUrl;
      if (d?.success && checkoutUrl) {
        const payload = d?.data ?? d;
        setPaymentData({
          checkoutUrl: payload.checkoutUrl ?? checkoutUrl,
          orderCode: payload.orderCode ?? d.orderCode,
          amount: payload.amount ?? d.amount,
          description: payload.description ?? d.description,
          qrCode: payload.qrCode,
          accountNumber: payload.accountNumber,
          accountName: payload.accountName,
        });
        setShowPaymentModal(true);
      } else {
        toast.error(d?.message || 'Không tạo được phiên thanh toán');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo thanh toán');
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
      RETURN_URL: `${window.location.origin}/student/wallet/result`,
      ELEMENT_ID: 'payos-checkout-container',
      CHECKOUT_URL: url,
      onSuccess: (e) => {
        window.location.href = `${window.location.origin}/student/wallet/result?orderCode=${e.orderCode}`;
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

  // Quick amount buttons
  const quickAmounts = [100000, 200000, 500000, 1000000];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-200 border-t-blue-600" />
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Ví sinh viên</h1>
          <p className="mt-1 text-sm text-slate-500">Nạp tiền vào ví để thanh toán học phí các kỳ tiếp theo.</p>
        </div>

        {/* Số dư ví */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
          <p className="text-sm opacity-80">Số dư hiện tại</p>
          <p className="mt-1 text-4xl font-bold">{formatMoney(wallet?.balance || 0)}</p>
          <div className="mt-4 flex gap-4 text-sm opacity-80">
            <div>
              <p>Đã nạp</p>
              <p className="font-semibold text-white">{formatMoney(wallet?.totalEarned || 0)}</p>
            </div>
            <div>
              <p>Đã chi tiêu</p>
              <p className="font-semibold text-white">{formatMoney(wallet?.totalSpent || 0)}</p>
            </div>
          </div>
        </div>

        {/* Nạp tiền */}
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Nạp tiền vào ví</h2>
          <div className="space-y-4">
            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(String(amount))}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    depositAmount === String(amount)
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {formatMoney(amount)}
                </button>
              ))}
            </div>
            {/* Input */}
            <div className="flex gap-3">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Nhập số tiền (VNĐ)"
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                onClick={handleDeposit}
                disabled={isCreatingPayment || !depositAmount}
                className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingPayment ? 'Đang tạo...' : 'Nạp tiền'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Tối thiểu: 10.000 VNĐ. Tối đa: 50.000.000 VNĐ</p>
          </div>
        </div>

        {/* Lịch sử giao dịch */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Lịch sử giao dịch
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                {transactions.length} giao dịch
              </span>
            </h2>
          </div>
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Chưa có giao dịch nào</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                      tx.type === 'payment' ? 'bg-red-100 text-red-600' :
                      tx.type === 'refund' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tx.type === 'deposit' ? '↓' : tx.type === 'payment' ? '↑' : tx.type === 'refund' ? '↩' : '↔'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {TRANSACTION_TYPE[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'deposit' || tx.type === 'refund' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{formatMoney(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">Sau: {formatMoney(tx.balanceAfter)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal thanh toán */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Nạp tiền vào ví</h3>
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
                <p className="text-xl font-bold text-violet-600">{formatMoney(paymentData.amount)}</p>
              </div>

              {/* QR thanh toán */}
              {paymentData.qrCode && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="mb-2 text-sm font-medium text-slate-700">Quét mã QR thanh toán</p>
                  <div className="inline-block rounded-lg bg-white p-3 shadow-sm">
                    <QRCodeCanvas value={paymentData.qrCode} size={180} level="M" />
                  </div>
                  {(paymentData.accountNumber || paymentData.accountName) && (
                    <div className="mt-3 space-y-1 text-left text-sm text-slate-600">
                      {paymentData.accountNumber && (
                        <p className="flex items-center justify-between gap-2">
                          <span>Số tài khoản:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentData.accountNumber)}
                            className="font-mono font-semibold text-violet-600 hover:underline"
                          >
                            {paymentData.accountNumber}
                          </button>
                        </p>
                      )}
                      {paymentData.accountName && (
                        <p><span>Chủ tài khoản: </span><strong>{paymentData.accountName}</strong></p>
                      )}
                      <p className="text-xs text-slate-500">Nội dung: {paymentData.description || `Nap tien ${paymentData.orderCode}`}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Mở app ngân hàng để quét mã QR</p>
                </div>
              )}

              <button
                onClick={() => { setShowPaymentModal(false); setPaymentData(null); }}
                className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-700"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  const amount = paymentData.amount;
                  setShowPaymentModal(false);
                  setPaymentData(null);
                  navigate(`/student/wallet/result?orderCode=${paymentData.orderCode}&amount=${amount ?? ''}`);
                }}
                className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Tôi đã chuyển khoản
              </button>
            </div>
          </div>
        </div>
      )}
      <div id="payos-checkout-container" />
    </div>
  );
}
