import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import walletService from '../../services/walletService';
import payosService from '../../services/payosService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function WalletResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const confirmCalledRef = useRef(false);

  const orderCode = searchParams.get('orderCode');
  const amountParam = searchParams.get('amount');
  const amountFromQuery = amountParam ? parseInt(amountParam, 10) : null;

  // Kiểm tra thanh toán: gọi PayOS rồi nếu PAID thì gọi confirmDeposit (backend sẽ verify lại)
  const checkAndConfirmDeposit = useCallback(async () => {
    if (!orderCode) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await payosService.getOrder(orderCode);
      const orderData = res.data?.data;

      if (orderData?.status === 'PAID') {
        const amount = orderData.amount ?? amountFromQuery;
        const confirmRes = await walletService.confirmDeposit(orderCode, amount);
        if (confirmRes?.data?.success) {
          setOrder({ status: 'PAID', amount: orderData.amount ?? amount });
          toast.success(confirmRes.data?.message || 'Nạp tiền vào ví thành công!');
        } else {
          setOrder({ status: 'PENDING' });
          setErrorMessage(confirmRes?.data?.message || 'Xác nhận giao dịch thất bại.');
        }
      } else {
        setOrder({ status: orderData?.status || 'PENDING', amount: orderData?.amount ?? amountFromQuery });
        if (orderData?.status === 'CANCELLED' || orderData?.status === 'EXPIRED') {
          setErrorMessage(
            orderData?.status === 'CANCELLED'
              ? 'Giao dịch đã bị hủy.'
              : 'Giao dịch đã hết hạn. Vui lòng tạo yêu cầu nạp tiền mới.'
          );
        }
      }
    } catch (err) {
      console.error('Error checking/confirming deposit:', err);
      const msg = err.response?.data?.message || 'Không thể xác minh giao dịch. Vui lòng thử lại.';
      setErrorMessage(msg);
      setOrder({ status: 'ERROR' });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [orderCode, amountFromQuery]);

  useEffect(() => {
    if (!orderCode) {
      setLoading(false);
      return;
    }
    if (confirmCalledRef.current) return;
    confirmCalledRef.current = true;
    checkAndConfirmDeposit();
  }, [orderCode, checkAndConfirmDeposit]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 mx-auto" />
          <p className="mt-4 text-slate-600 font-medium">Đang kiểm tra thanh toán...</p>
          <p className="mt-1 text-sm text-slate-400">Vui lòng đợi trong giây lát.</p>
        </div>
      </div>
    );
  }

  const isPaid = order?.status === 'PAID';
  const isError = order?.status === 'ERROR' || !!errorMessage;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mb-4 text-6xl">
              {isPaid ? '✅' : isError ? '❌' : '⏳'}
            </div>
            <h1 className={`text-2xl font-bold ${
              isPaid ? 'text-green-600' : isError ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {isPaid ? 'Nạp tiền thành công!' : isError ? 'Chưa thể nạp tiền' : 'Đang chờ thanh toán'}
            </h1>
            <p className="mt-2 text-slate-500">
              {isPaid
                ? `Bạn đã nạp ${formatMoney(order?.amount)} vào ví.`
                : isError
                  ? (errorMessage || 'Thanh toán chưa hoàn tất hoặc đã hết hạn.')
                  : 'Vui lòng chuyển khoản theo QR/STK, sau vài phút bấm "Kiểm tra lại".'}
            </p>
          </div>

          {order?.amount != null && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn:</span>
                <span className="font-medium">#{orderCode}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-bold">{formatMoney(order.amount)}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {!isPaid && (
              <button
                onClick={() => { confirmCalledRef.current = false; checkAndConfirmDeposit(); }}
                disabled={loading}
                className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Kiểm tra lại
              </button>
            )}
            <button
              onClick={() => navigate('/student/wallet')}
              className={`rounded-lg px-5 py-2.5 font-medium ${isPaid ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isPaid ? 'Xem ví của tôi' : 'Quay lại ví'}
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
