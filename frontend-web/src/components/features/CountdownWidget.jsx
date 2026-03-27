import { useState, useEffect } from 'react';
import countdownService from '../../services/countdownService';

const CountdownWidget = ({ className = '', onCountdownUpdate }) => {
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCountdown();
    // Update every minute
    const interval = setInterval(fetchCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCountdown = async () => {
    try {
      const response = await countdownService.getFeeCountdown();
      setCountdown(response.data);
      setError(null);
      
      // Callback for parent component
      if (onCountdownUpdate) {
        onCountdownUpdate(response.data);
      }
    } catch (err) {
      setError('Không thể tải deadline');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(n);
  };

  // Loading
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  // Error
  if (error) {
    return null;
  }

  // Không có countdown: đã thanh toán / quá hạn học phí kỳ khung / còn nợ khác
  if (!countdown?.hasUpcomingDeadline) {
    const isPaid = countdown?.status === 'paid';
    const isLapsed = countdown?.status === 'curriculum_payment_lapsed';
    const boxClass = isPaid
      ? 'bg-green-50 border-green-200'
      : isLapsed
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200';
    const iconWrap = isPaid ? 'bg-green-100' : isLapsed ? 'bg-red-100' : 'bg-amber-100';
    const iconColor = isPaid ? 'text-green-600' : isLapsed ? 'text-red-600' : 'text-amber-600';
    const textClass = isPaid ? 'text-green-800' : isLapsed ? 'text-red-900' : 'text-amber-900';
    const debtClass = isLapsed ? 'text-red-800' : 'text-amber-800';
    const btnClass = isLapsed
      ? 'bg-red-700 hover:bg-red-800'
      : 'bg-amber-600 hover:bg-amber-700';

    return (
      <div className={`rounded-xl border p-4 ${boxClass} ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconWrap}`}>
            {isPaid ? (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-relaxed font-medium ${textClass}`}>{countdown?.message}</p>
            {!isPaid && Number(countdown?.outstandingAmount) > 0 && (
              <p className={`mt-1 text-sm ${debtClass}`}>
                Còn nợ: {formatCurrency(countdown.outstandingAmount)}
              </p>
            )}
            {!isPaid && (
              <a
                href="/student/finance"
                className={`inline-flex items-center mt-2 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition ${btnClass}`}
              >
                {isLapsed ? 'Chi tiết học phí' : 'Thanh toán ngay'}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Overdue
  if (countdown.status === 'overdue') {
    return (
      <div className={`bg-red-50 rounded-xl border border-red-200 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800">Đã quá hạn thanh toán!</p>
            <p className="text-sm text-red-600">Hạn: {countdown.deadline.formattedDate}</p>
            <a
              href="/student/finance"
              className="inline-flex items-center mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
            >
              Thanh toán ngay
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Active countdown
  const urgentClass = countdown.timeRemaining.isUrgent 
    ? 'bg-red-50 border-red-200' 
    : 'bg-blue-50 border-blue-200';

  return (
    <div className={`rounded-xl border p-4 ${urgentClass} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-sm font-medium ${countdown.timeRemaining.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
            Hạn thanh toán
          </p>
          <p className={`text-xs ${countdown.timeRemaining.isUrgent ? 'text-red-500' : 'text-blue-500'}`}>
            {countdown.deadline.periodName} - {countdown.deadline.formattedDate}
          </p>
        </div>
        {countdown.timeRemaining.isUrgent && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            GẤP!
          </span>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <TimeUnit 
          value={countdown.timeRemaining.days} 
          label="Ngày" 
          urgent={countdown.timeRemaining.isUrgent} 
        />
        <span className={`text-2xl font-bold ${countdown.timeRemaining.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>:</span>
        <TimeUnit 
          value={countdown.timeRemaining.hours} 
          label="Giờ" 
          urgent={countdown.timeRemaining.isUrgent} 
        />
        <span className={`text-2xl font-bold ${countdown.timeRemaining.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>:</span>
        <TimeUnit 
          value={countdown.timeRemaining.minutes} 
          label="Phút" 
          urgent={countdown.timeRemaining.isUrgent} 
        />
      </div>

      {Number(countdown.outstandingAmount) > 0 && (
        <p className={`text-center mt-2 text-sm font-medium ${countdown.timeRemaining.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
          Số tiền còn nợ: {formatCurrency(countdown.outstandingAmount)}
        </p>
      )}

      {Number(countdown.outstandingAmount) > 0 && (
        <a
          href="/student/finance"
          className={`block text-center mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            countdown.timeRemaining.isUrgent
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Thanh toán ngay
        </a>
      )}
    </div>
  );
};

const TimeUnit = ({ value, label, urgent }) => (
  <div className="text-center">
    <div className={`text-2xl font-bold ${urgent ? 'text-red-600' : 'text-blue-600'}`}>
      {String(value).padStart(2, '0')}
    </div>
    <div className={`text-xs ${urgent ? 'text-red-500' : 'text-blue-500'}`}>{label}</div>
  </div>
);

export default CountdownWidget;
