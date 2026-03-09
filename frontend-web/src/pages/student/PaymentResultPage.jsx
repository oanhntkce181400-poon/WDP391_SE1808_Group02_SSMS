import { useState, useEffect, useRef } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10;
  const retryIntervalRef = useRef(null);
  const isPaidRef = useRef(false);
  
  const orderCode = searchParams.get('orderCode');
  
  useEffect(() => {
    if (orderCode) {
      getOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderCode]);
  
  // Retry khi retryCount thay đổi
  useEffect(() => {
    if (orderCode && retryCount > 0 && !isPaidRef.current) {
      console.log(`Retrying... Attempt ${retryCount}`);
      getOrderDetails();
    }
  }, [retryCount]);
  
  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);
  
  async function getOrderDetails() {
    setLoading(true);
    try {
      // Gọi API lấy thông tin đơn hàng từ PayOS
      const res = await payosService.getOrder(orderCode);
      console.log('Order response:', res);
      
      if (res.data?.error === 0 && res.data.data?.status === 'PAID') {
        const orderData = res.data.data;
        setOrder(orderData);
        isPaidRef.current = true;
        setLoading(false);
        toast.success('Thanh toán thành công!');
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
        }
        
        // Xác nhận thanh toán và lưu vào DB (chạy ngầm, dùng curriculum semesterCode để lịch sử trả về đúng)
        (async () => {
          setIsRefreshing(true);
          try {
            await financeService.confirmPaymentWithEnrollment({
              orderCode: orderCode,
              amount: orderData.amount,
              status: 'PAID',
            });
          } catch (_) {
            try {
              await financeService.confirmPayment({
                orderCode: orderCode,
                amount: orderData.amount,
                status: 'PAID',
              });
            } catch (e) {
              console.error('Lỗi xác nhận thanh toán:', e);
            }
          }
          try {
            const summaryRes = await financeService.getMyTuitionSummary();
            setSummary(summaryRes.data.data);
          } catch (_) {}
          finally {
            setIsRefreshing(false);
          }
        })();
      } else {
        // Thanh toán chưa hoàn tất - thử lại sau
        console.log(`Payment not completed. Status: ${res.data?.data?.status}. Retrying... (${retryCount + 1}/${maxRetries})`);
        
        if (retryCount < maxRetries && !isPaidRef.current) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000); // Thử lại sau 3 giây
        } else if (retryCount >= maxRetries) {
          toast.warning('Thanh toán đang xử lý. Vui lòng kiểm tra lại sau.');
        }
        
        setOrder(res.data?.data || { status: 'PENDING' });
      }
    } catch (err) {
      console.error('Error getting order:', err);
      setOrder({ status: 'ERROR' });
    } finally {
      setLoading(false);
    }
  }
  
  if (loading || isRefreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">
            {isRefreshing ? 'Đang cập nhật dữ liệu...' : 'Đang tải thông tin thanh toán...'}
          </p>
        </div>
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
              {isPaid ? 'Thanh toán thành công!' : 'Đang chờ thanh toán'}
            </h1>
            <p className="mt-2 text-slate-500">
              {isPaid ? 'Đã hoàn thành học phí và không còn nợ.' : 'Vui lòng hoàn tất thanh toán.'}
            </p>
          </div>
          
          {order && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-medium">#{order.orderCode || order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="font-bold">{formatMoney(order.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className={isPaid ? 'text-green-600' : 'text-yellow-600'}>
                    {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Thông tin đăng ký học phần - chỉ hiển thị khi thanh toán thành công */}
          {isPaid && summary && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 font-semibold text-green-800">📋 Thông tin đăng ký học phần</h3>
              
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
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Xem lịch sử
            </button>
            <button
              onClick={() => navigate('/student')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
