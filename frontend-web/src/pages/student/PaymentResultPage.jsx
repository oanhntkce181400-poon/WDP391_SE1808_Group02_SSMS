import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import payosService from '../../services/payosService';
import financeService from '../../services/financeService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 15;
  const retryIntervalRef = useRef(null);
  const hasProcessedRef = useRef(false);

  const orderCode = searchParams.get('orderCode');

  // Cleanup retry interval on unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);

  // Gọi API lấy thông tin từ PayOS và xử lý
  const checkPaymentStatus = useCallback(async () => {
    if (!orderCode) {
      setLoading(false);
      return;
    }

    try {
      // Gọi API backend để lấy thông tin đơn hàng từ PayOS
      const res = await payosService.getOrder(orderCode);

      if (res.data?.error === 0 && res.data.data) {
        const orderData = res.data.data;
        const paymentStatus = orderData.status;

        // Cập nhật state với thông tin order
        setOrder(orderData);

        // Nếu thanh toán thành công
        if (paymentStatus === 'PAID') {
          setIsPaid(true);
          setLoading(false);

          if (!hasProcessedRef.current) {
            hasProcessedRef.current = true;
            toast.success('Thanh toán thành công! Đang xử lý...');
            await processSuccessfulPayment(orderCode, orderData);
          }
          return;
        }

        // Nếu thanh toán thất bại
        if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
          setErrorMessage(getPaymentErrorMessage(paymentStatus));
          setLoading(false);
          return;
        }

        // Thanh toán đang xử lý - thử lại
        if (retryCount < maxRetries) {
          console.log(`⏳ Thanh toán đang xử lý (${retryCount + 1}/${maxRetries})...`);
          setRetryCount(prev => prev + 1);
        } else {
          setErrorMessage('Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.');
          setLoading(false);
        }
      } else {
        // Lỗi từ API
        console.error('Lỗi API:', res.data);
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
        } else {
          setErrorMessage('Không thể kết nối PayOS. Vui lòng thử lại sau.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error checking payment:', err);
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
      } else {
        setErrorMessage('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối internet.');
        setLoading(false);
      }
    }
  }, [orderCode, retryCount]);

  // Xử lý thanh toán thành công - gọi confirm API
  const processSuccessfulPayment = async (code, orderData) => {
    setIsConfirming(true);
    try {
      await financeService.confirmPaymentWithEnrollment({
        orderCode: code,
        amount: orderData.amount,
        status: 'PAID',
      });

      // Lấy thông tin học phí sau khi xác nhận
      try {
        const summaryRes = await financeService.getMyTuitionSummary();
        setSummary(summaryRes.data.data);
      } catch (_) {
        // Không critical nếu không lấy được summary
      }
    } catch (err) {
      console.error('Lỗi xác nhận thanh toán:', err);
      // Vẫn hiển thị thành công vì PayOS đã xác nhận
      toast.warning('Thanh toán thành công nhưng có lỗi khi cập nhật hệ thống. Vui lòng liên hệ phòng Đào tạo.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Lấy thông báo lỗi phù hợp
  function getPaymentErrorMessage(status) {
    switch (status) {
      case 'CANCELLED':
        return 'Thanh toán đã bị hủy. Bạn có thể tạo yêu cầu thanh toán mới.';
      case 'FAILED':
        return 'Thanh toán thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
      case 'EXPIRED':
        return 'Yêu cầu thanh toán đã hết hạn. Bạn có thể tạo yêu cầu mới.';
      default:
        return 'Thanh toán chưa hoàn tất. Vui lòng kiểm tra với ngân hàng.';
    }
  }

  // Initial load
  useEffect(() => {
    if (orderCode) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [orderCode]);

  // Retry mechanism
  useEffect(() => {
    if (orderCode && retryCount > 0 && !isPaid && !errorMessage) {
      const delay = Math.min(3000 + retryCount * 500, 10000); // Tăng delay theo số lần retry
      retryIntervalRef.current = setTimeout(() => {
        checkPaymentStatus();
      }, delay);
    }

    return () => {
      if (retryIntervalRef.current) {
        clearTimeout(retryIntervalRef.current);
      }
    };
  }, [retryCount, orderCode, isPaid, errorMessage, checkPaymentStatus]);

  // Thử lại kiểm tra
  const handleRetry = () => {
    setRetryCount(0);
    setErrorMessage('');
    setLoading(true);
    hasProcessedRef.current = false;
    checkPaymentStatus();
  };

  // Loading state
  if (loading || isConfirming) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">
            {isConfirming ? 'Đang xác nhận thanh toán...' : 'Đang kiểm tra thanh toán...'}
          </p>
          {retryCount > 0 && !isConfirming && (
            <p className="mt-2 text-sm text-slate-400">
              Vui lòng đợi trong giây lát...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Không có orderCode
  if (!orderCode) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ToastContainer />
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-lg text-center">
            <div className="text-6xl mb-4">❓</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Không tìm thấy thông tin</h1>
            <p className="text-slate-500 mb-6">Vui lòng kiểm tra lại đường link thanh toán.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/student/finance')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Quay lại trang Học phí
              </button>
              <button
                onClick={() => navigate('/student')}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                Trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thanh toán thất bại
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ToastContainer />
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Thanh toán không thành công</h1>
              <p className="text-slate-500 mb-6">{errorMessage}</p>
            </div>

            {order && (
              <div className="rounded-lg bg-slate-50 p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-medium">#{order.orderCode || order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="font-bold text-red-600">{formatMoney(order.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trạng thái:</span>
                    <span className="text-red-600 font-medium">Thanh toán thất bại</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/student/finance')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Quay lại trang Học phí
              </button>
              <button
                onClick={handleRetry}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                Thử kiểm tra lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thanh toán đang xử lý
  if (!isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ToastContainer />
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="text-2xl font-bold text-yellow-600 mb-2">Đang xử lý thanh toán</h1>
              <p className="text-slate-500 mb-6">
                Thanh toán của bạn đang được xử lý. Vui lòng đợi và kiểm tra lại sau.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Thời gian xử lý thường là 1-5 phút.
              </p>
            </div>

            {order && (
              <div className="rounded-lg bg-slate-50 p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-medium">#{order.orderCode || order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="font-bold">{formatMoney(order.amount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Kiểm tra lại
              </button>
              <button
                onClick={() => navigate('/student/finance')}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                Quay lại trang Học phí
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thanh toán thành công
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Thanh toán thành công!</h1>
            <p className="text-slate-500">
              Cảm ơn bạn đã thanh toán học phí. Hệ thống sẽ tự động đăng ký môn học cho bạn.
            </p>
          </div>

          {order && (
            <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Mã đơn hàng:</span>
                  <span className="font-medium">#{order.orderCode || order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Số tiền:</span>
                  <span className="font-bold text-green-700">{formatMoney(order.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Trạng thái:</span>
                  <span className="text-green-600 font-medium">✓ Đã thanh toán</span>
                </div>
              </div>
            </div>
          )}

          {/* Thông tin đăng ký học phần */}
          {summary && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 font-semibold text-green-800 flex items-center gap-2">
                <span>📋</span> Thông tin đăng ký học phần
              </h3>

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded bg-white p-2">
                  <p className="text-slate-500">Học kỳ</p>
                  <p className="font-medium">{summary.semesterName || '—'}</p>
                </div>
                <div className="rounded bg-white p-2">
                  <p className="text-slate-500">Tổng tín chỉ</p>
                  <p className="font-medium">{summary.registeredCredits || 0} TC</p>
                </div>
              </div>

              {summary.enrolledSubjects && summary.enrolledSubjects.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-sm font-medium text-green-700">Danh sách môn học đã đăng ký:</p>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {summary.enrolledSubjects.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between rounded bg-white p-2 text-xs">
                        <div>
                          <p className="font-medium">{subject.subjectName || subject.name}</p>
                          <p className="text-slate-500">{subject.subjectCode || subject.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{subject.credits || subject.credit} TC</p>
                          <p className="text-slate-500">{formatMoney(subject.tuitionFee || subject.fee)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-between border-t border-green-200 pt-3 text-sm">
                <span className="font-medium text-green-800">Tổng tiền học phí:</span>
                <span className="font-bold text-green-700">{formatMoney(summary.totalTuition)}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate('/student/finance')}
              className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
            >
              Xem chi tiết học phí
            </button>
            <button
              onClick={() => navigate('/student/registrations')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Xem đăng ký học phần
            </button>
            <button
              onClick={() => navigate('/student')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
