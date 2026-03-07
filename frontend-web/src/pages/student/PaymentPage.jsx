import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import payosService from '../../services/payosService';
import financeService from '../../services/financeService';

// PayOS script URL
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

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Kiểm tra xem có orderCode từ URL không (người dùng quay lại sau khi thanh toán)
  const orderCodeFromUrl = searchParams.get('orderCode');

  useEffect(() => {
    loadSummary();
    loadPaymentHistory();
  }, [selectedSemester]);

  // Load lịch sử thanh toán
  async function loadPaymentHistory() {
    setIsLoadingHistory(true);
    try {
      const res = await financeService.getPaymentHistory(selectedSemester || null);
      setPaymentHistory(res.data.data || []);
    } catch (err) {
      console.error('Error loading payment history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    // Load PayOS script
    const script = document.createElement('script');
    script.src = PAYOS_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Nếu có orderCode từ URL, kiểm tra trạng thái thanh toán
    if (orderCodeFromUrl) {
      checkPaymentStatus(orderCodeFromUrl);
    }
  }, [orderCodeFromUrl]);

  // Sau khi thanh toán thành công, tự động chuyển sang trang kết quả
  useEffect(() => {
    if (isPaid && orderCodeFromUrl) {
      const timer = setTimeout(() => {
        navigate(`/student/payment/result?orderCode=${orderCodeFromUrl}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isPaid, orderCodeFromUrl, navigate]);

  async function loadSummary() {
    setIsLoading(true);
    try {
      const res = await financeService.getMyTuitionSummary(selectedSemester || null);
      setSummary(res.data.data);
    } catch (err) {
      console.error('Error loading summary:', err);
    } finally {
      setIsLoading(false);
    }
  }

    async function checkPaymentStatus(orderCode) {
    try {
      const res = await payosService.getOrder(orderCode);
      console.log('checkPaymentStatus - Full response:', res);
      console.log('checkPaymentStatus - res.data:', res?.data);
      
      // Kiểm tra cấu trúc response
      const error = res?.data?.error;
      const status = res?.data?.data?.status;
      
      console.log('checkPaymentStatus - error:', error);
      console.log('checkPaymentStatus - status:', status);
      
      if (error === 0 && status === 'PAID') {
        setIsPaid(true);
        toast.success('Thanh toán thành công!');
        // Cập nhật lại dữ liệu học phí
        loadSummary();
      } else {
        console.log('Payment not completed. Status:', status);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  }

  const handlePayment = async () => {
    if (!summary || summary.remainingDebt <= 0) {
      toast.warning('Không có khoản nào cần thanh toán!');
      return;
    }

    setIsCreatingPayment(true);
    try {
      const studentName = localStorage.getItem('studentName') || 'Sinh viên';
      const studentId = localStorage.getItem('studentId') || '';

      const requestData = {
        description: `HP-${summary.semesterName}-${studentId}`,
        productName: `Học phí HK ${summary.semesterName}`,
        price: summary.remainingDebt,
        returnUrl: `${window.location.origin}/student/payment/result`,
        cancelUrl: `${window.location.origin}/student/payment`,
      };

      const response = await payosService.createPaymentLink(requestData);

      if (response.data.error === 0) {
        const checkoutData = response.data.data;
        setPaymentData(checkoutData);

        // Load bank info (bọc try-catch để không ảnh hưởng nếu CORS lỗi)
        if (checkoutData.bin) {
          try {
            const bankRes = await payosService.getListBank();
            if (bankRes.data && bankRes.data.data) {
              const bank = bankRes.data.data.find(b => b.bin === checkoutData.bin);
              setBankInfo(bank);
            }
          } catch (bankError) {
            console.warn('Không load được danh sách ngân hàng (CORS), bỏ qua:', bankError);
          }
        }
      } else {
        toast.error(response.data.message || 'Có lỗi xảy ra khi tạo thanh toán');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Có lỗi xảy ra khi tạo thanh toán');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const openPayOSCheckout = () => {
    if (paymentData?.checkoutUrl && window.PayOSCheckout) {
      let url = paymentData.checkoutUrl;
      if (paymentData.checkoutUrl.startsWith('https://dev.pay.payos.vn')) {
        url = paymentData.checkoutUrl.replace('https://dev.pay.payos.vn', 'https://next.dev.pay.payos.vn');
      }
      if (paymentData.checkoutUrl.startsWith('https://pay.payos.vn')) {
        url = paymentData.checkoutUrl.replace('https://pay.payos.vn', 'https://next.pay.payos.vn');
      }

      const { open } = window.PayOSCheckout.usePayOS({
        RETURN_URL: `${window.location.origin}/student/payment/result`,
        ELEMENT_ID: 'payos-checkout-container',
        CHECKOUT_URL: url,
        onExit: (eventData) => {
          console.log('Payment exit:', eventData);
        },
        onSuccess: (eventData) => {
          console.log('Payment success:', eventData);
          window.location.href = `${window.location.origin}/student/payment/result?orderCode=${eventData.orderCode}`;
        },
        onCancel: (eventData) => {
          console.log('Payment cancel:', eventData);
          window.location.href = `${window.location.origin}/student/payment?canceled=true`;
        },
      });
      open();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép!');
  };

  if (orderCodeFromUrl && isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ToastContainer />
        <div className="mx-auto max-w-lg text-center">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-6xl">✅</div>
            <h1 className="text-2xl font-bold text-green-600">Thanh toán thành công!</h1>
            <p className="mt-2 text-slate-500">
              Cảm ơn bạn đã thanh toán học phí.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate('/student/finance')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Xem lịch sử giao dịch
              </button>
              <button
                onClick={() => navigate('/student')}
                className="rounded-lg bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Thanh toán học phí</h1>
          <p className="mt-1 text-sm text-slate-500">
            Thanh toán học phí trực tuyến qua PayOS
          </p>
        </div>

        {/* Payment Data Display */}
        {paymentData ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Order Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Thông tin đơn hàng</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-medium">#{paymentData.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="font-bold text-red-600">{formatMoney(paymentData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nội dung:</span>
                  <span className="font-medium">{paymentData.description}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={openPayOSCheckout}
                  className="rounded-lg bg-[#5D5FEF] px-5 py-2.5 font-medium text-white hover:bg-[#4a4dcf]"
                >
                  Mở cổng thanh toán PayOS
                </button>
                <button
                  onClick={() => window.location.href = `/student/payment/result?orderCode=${paymentData.orderCode}`}
                  className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
                >
                  Kiểm tra kết quả thanh toán
                </button>
                <button
                  onClick={() => setPaymentData(null)}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Chọn lại
                </button>
              </div>
            </div>

            {/* QR Code Payment */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Quét mã QR thanh toán</h2>
              <div className="flex flex-col items-center">
                <div className="rounded-lg bg-gradient-to-br from-green-100 via-purple-100 to-green-100 p-4">
                  <QRCodeCanvas
                    value={paymentData.qrCode}
                    level="M"
                    includeMargin={true}
                    size={200}
                    fgColor="#25174E"
                  />
                </div>
                <p className="mt-4 text-center text-sm text-slate-500">
                  Mở App Ngân hàng bất kỳ để quét mã QR
                </p>
              </div>

              {/* Bank Info */}
              <div className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Ngân hàng:</span>
                  <div className="flex items-center gap-2">
                    {bankInfo?.logo && <img src={bankInfo.logo} alt="bank" className="h-6" />}
                    <span className="font-medium">{bankInfo?.name || 'Đang tải...'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Chủ tài khoản:</span>
                  <span className="font-medium">{paymentData.accountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{paymentData.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(paymentData.accountNumber)}
                      className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-200"
                    >
                      Sao chép
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Số tiền:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">{formatMoney(paymentData.amount)}</span>
                    <button
                      onClick={() => copyToClipboard(paymentData.amount)}
                      className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-200"
                    >
                      Sao chép
                    </button>
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-slate-500">Nội dung:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{paymentData.description}</span>
                    <button
                      onClick={() => copyToClipboard(paymentData.description)}
                      className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-200"
                    >
                      Sao chép
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                ⚠️ Lưu ý: Nhập chính xác nội dung <b>{paymentData.description}</b> khi chuyển khoản
              </div>
            </div>
          </div>
        ) : (
          /* Payment Summary */
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Thông tin thanh toán</h2>

            {summary ? (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Tổng học phí</p>
                    <p className="text-xl font-bold text-slate-800">{formatMoney(summary.totalTuition)}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-600">Đã nộp</p>
                    <p className="text-xl font-bold text-green-600">{formatMoney(summary.totalPaid)}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-600">Còn nợ</p>
                    <p className="text-xl font-bold text-red-600">{formatMoney(summary.remainingDebt)}</p>
                  </div>
                </div>

                {summary.remainingDebt > 0 ? (
                  <button
                    onClick={handlePayment}
                    disabled={isCreatingPayment}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5D5FEF] px-5 py-3 font-medium text-white hover:bg-[#4a4dcf] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingPayment ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang tạo thanh toán...
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        Thanh toán ngay
                      </>
                    )}
                  </button>
                ) : (
                  <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
                    🎉 Bạn đã thanh toán đầy đủ học phí!
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-slate-400">
                Không có thông tin học phí
              </div>
            )}
          </div>
        )}

        {/* Lịch sử thanh toán */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">📜 Lịch sử thanh toán</h2>

          {isLoadingHistory ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">STT</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày thanh toán</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Mã giao dịch</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Số tiền</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Phương thức</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr key={payment._id || index} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {payment.orderCode || '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-600">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {payment.method === 'online' ? 'Online (PayOS)' : 
                         payment.method === 'bank_transfer' ? 'Chuyển khoản' :
                         payment.method === 'cash' ? 'Tiền mặt' : payment.method}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {payment.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <p className="text-4xl mb-2">📭</p>
              <p>Chưa có lịch sử thanh toán</p>
            </div>
          )}
        </div>

        {/* Hidden container for PayOS checkout */}
        <div id="payos-checkout-container"></div>
      </div>
    </div>
  );
}
