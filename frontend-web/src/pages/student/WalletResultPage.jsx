import { useState, useEffect, useRef } from 'react';
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
  const orderCode = searchParams.get('orderCode');
  const amountParam = searchParams.get('amount');
  const amountFromQuery = amountParam ? parseInt(amountParam, 10) : null;
  const fromConfirmButton = orderCode && Number.isFinite(amountFromQuery) && amountFromQuery > 0;
  const confirmCalledRef = useRef(false);

  useEffect(() => {
    if (!orderCode) {
      setLoading(false);
      return;
    }
    if (fromConfirmButton) {
      // User bấm "Tôi đã chuyển khoản" → hiển thị thành công ngay, xác nhận nạp ví ở nền (chỉ gọi 1 lần)
      setOrder({ status: 'PAID', amount: amountFromQuery });
      setLoading(false);
      if (confirmCalledRef.current) return;
      confirmCalledRef.current = true;
      walletService
        .confirmDeposit(orderCode, amountFromQuery)
        .then((res) => {
          const data = res?.data;
          if (data?.success) {
            toast.success(data?.message || 'Nạp tiền vào ví thành công!');
          } else {
            toast.error(data?.message || 'Xác nhận giao dịch thất bại.');
          }
        })
        .catch((err) => {
          console.error('Error confirming deposit:', err);
          const msg = err.response?.data?.message || 'Xác nhận giao dịch thất bại. Vui lòng liên hệ hỗ trợ.';
          toast.error(msg);
        });
      return;
    }
    checkPaymentStatus();
  }, [orderCode, amountFromQuery, fromConfirmButton]);

  async function checkPaymentStatus() {
    setLoading(true);
    try {
      const res = await payosService.getOrder(orderCode);
      const orderData = res.data?.data;
      
      if (orderData?.status === 'PAID') {
        setOrder({ status: 'PAID', amount: orderData.amount });
        try {
          await walletService.confirmDeposit(orderCode, orderData.amount);
          toast.success('Nạp tiền vào ví thành công!');
        } catch (confirmError) {
          console.error('Error confirming deposit:', confirmError);
        }
      } else {
        setOrder({ status: orderData?.status || 'PENDING' });
      }
    } catch (err) {
      console.error('Error checking order:', err);
      setOrder({ status: 'ERROR' });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  const isPaid = order?.status === 'PAID';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mb-4 text-6xl">{isPaid ? '✅' : '⏳'}</div>
            <h1 className={`text-2xl font-bold ${isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
              {isPaid ? 'Nạp tiền thành công!' : 'Đang chờ thanh toán'}
            </h1>
            <p className="mt-2 text-slate-500">
              {isPaid 
                ? `Bạn đã nạp ${formatMoney(order?.amount)} vào ví.` 
                : 'Vui lòng hoàn tất thanh toán.'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate('/student/wallet')}
              className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700"
            >
              Xem ví của tôi
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
