Mục Lục
Tổng Quan
Chức Năng 1: View Tuition Fee (Mobile)
Chức Năng 2: Show Fee Countdown
Chức Năng 3: Generate Student Transcripts
Chức Năng 4: Send Payment Reminders
Chức Năng 5: View Tuition Revenue Report
Chức Năng 6: View Student Performance Report
Phụ Lục: Cấu Trúc Project Hiện Tại
1. Tổng Quan
1.1 Danh Sách 6 Chức Năng
#	Chức Năng	Độ Ưu Tiên	Backend	Frontend
1	View Tuition Fee (Mobile)	Must Have	Cập nhật API	Tạo Mobile Page
2	Show Fee Countdown	Must Have	Tạo API mới	Tạo Widget
3	Generate Student Transcripts	Should Have	Tạo PDF Service	Tạo Transcript Page
4	Send Payment Reminders	Should Have	Tạo Reminder System	Tạo Admin Page
5	View Tuition Revenue Report	Should Have	Tạo Report API	Tạo Report Page
6	View Student Performance Report	High/Complex	Tạo Analytics API	Tạo Analytics Page
1.2 Thời Gian Ước Tính
Chức Năng	Backend	Frontend	Testing	Tổng
1. Tuition Fee Mobile	4h	8h	2h	14h
2. Fee Countdown	3h	4h	1h	8h
3. Generate Transcripts	10h	8h	4h	22h
4. Payment Reminders	10h	8h	4h	22h
5. Revenue Report	12h	10h	4h	26h
6. Performance Report	16h	12h	6h	34h
Tổng cộng	55h	50h	21h	~126h
1.3 Dependencies Chung
Backend cần cài đặt:

cd backend-api
npm install pdfkit node-cron
Frontend cần cài đặt:

cd frontend-web
npm install jspdf date-fns
2. Chức Năng 1: View Tuition Fee (Mobile)
2.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	View Tuition Fee (Mobile)
Actor	Student, Parent
Trigger	User điều hướng đến màn hình Tuition Fee trên mobile
Priority	Must Have
2.2 Phân Tích Code Hiện Có
Backend - Đã Có
File: backend-api/src/services/finance.service.js

// Các methods đã có:
- getMyTuitionSummary(userId, semesterId)
- getPaymentHistory(userId, semesterId)
File: backend-api/src/routes/finance.routes.js

// Các endpoints đã có:
GET /api/finance/tuition/me        // Lấy tổng học phí
GET /api/finance/payments/history  // Lịch sử thanh toán
Frontend - Đã Có
File: frontend-web/src/pages/student/TuitionPage.jsx

Trang xem học phí hiện tại (desktop) File: frontend-web/src/services/financeService.js
Service gọi API finance
2.3 Hướng Triển Khai Chi Tiết
Bước 1: Backend - Cập Nhật Finance Controller
File cần sửa: backend-api/src/controllers/finance.controller.js Thêm method mới:

// @route   GET /api/finance/tuition/me
// @desc    Lấy chi tiết học phí của sinh viên hiện tại
// @access  Private
exports.getMyTuitionDetails = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { semesterCode } = req.query;
    // Lấy thông tin sinh viên
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sinh viên' 
      });
    }
    // Lấy tất cả bills của sinh viên
    const query = { student: student._id };
    if (semesterCode) {
      query.semesterCode = semesterCode;
    }
    
    const bills = await TuitionBill.find(query)
      .populate('semester', 'code name')
      .sort({ createdAt: -1 });
    // Tính toán tổng quan
    const summary = bills.reduce((acc, bill) => {
      const outstanding = bill.totalAmount - bill.paidAmount;
      return {
        totalDue: acc.totalDue + bill.totalAmount,
        totalPaid: acc.totalPaid + bill.paidAmount,
        totalOutstanding: acc.totalOutstanding + outstanding
      };
    }, { totalDue: 0, totalPaid: 0, totalOutstanding: 0 });
    // Lấy deadline từ RegistrationPeriod
    const currentPeriod = await RegistrationPeriod.findOne({
      status: 'active',
      endDate: { $gte: new Date() }
    }).sort({ endDate: 1 });
    res.json({
      success: true,
      data: {
        summary,
        bills: bills.map(bill => ({
          _id: bill._id,
          semester: bill.semester?.code || bill.semesterCode,
          semesterName: bill.semester?.name || '',
          totalAmount: bill.totalAmount,
          paidAmount: bill.paidAmount,
          outstanding: bill.totalAmount - bill.paidAmount,
          status: bill.status,
          dueDate: bill.dueDate,
          breakdown: {
            baseTuition: bill.baseAmount,
            overloadAmount: bill.overloadAmount || 0,
            repeatAmount: bill.repeatAmount || 0,
            discountAmount: bill.discountAmount || 0
          },
          baseSubjects: bill.baseSubjects || [],
          repeatSubjects: bill.repeatSubjects || []
        })),
        nextDeadline: currentPeriod ? {
          date: currentPeriod.endDate,
          formattedDate: new Date(currentPeriod.endDate).toLocaleDateString('vi-VN'),
          daysRemaining: Math.ceil((new Date(currentPeriod.endDate) - new Date()) / (1000 * 60 * 60 * 24))
        } : null
      }
    });
  } catch (error) {
    console.error('getMyTuitionDetails error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể tải thông tin học phí' 
    });
  }
};
Bước 2: Frontend - Tạo Mobile Tuition Service
File cần tạo: frontend-web/src/services/mobileTuitionService.js

import axiosClient from './axiosClient';
const mobileTuitionService = {
  /**
   * Lấy chi tiết học phí của sinh viên
   * @param {string|null} semesterCode - Mã kỳ học (optional)
   */
  getTuitionDetails: async (semesterCode = null) => {
    const params = semesterCode ? { semesterCode } : {};
    const response = await axiosClient.get('/finance/tuition/me', { params });
    return response.data;
  },
  /**
   * Lấy lịch sử thanh toán
   */
  getPaymentHistory: async (semesterCode = null) => {
    const params = semesterCode ? { semesterCode } : {};
    const response = await axiosClient.get('/finance/payments/history', { params });
    return response.data;
  },
  /**
   * Lấy thông tin deadline thanh toán
   */
  getPaymentDeadline: async () => {
    const response = await axiosClient.get('/registration-periods/current');
    return response.data;
  }
};
export default mobileTuitionService;
Bước 3: Frontend - Tạo Countdown Timer Component
File cần tạo: frontend-web/src/components/common/CountdownTimer.jsx

import { useState, useEffect } from 'react';
const CountdownTimer = ({ deadline, label = 'Thời gian còn lại' }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, expired: false });
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(deadline) - new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, expired: true };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        expired: false
      };
    };
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [deadline]);
  const isUrgent = timeLeft.days <= 3 && !timeLeft.expired;
  if (timeLeft.expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-600 font-semibold">Đã quá hạn thanh toán!</p>
      </div>
    );
  }
  return (
    <div className={`rounded-xl p-4 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
      <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
        {label}
      </p>
      <div className="flex justify-center gap-3 mt-2">
        <TimeUnit value={timeLeft.days} label="Ngày" urgent={isUrgent} />
        <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>:</span>
        <TimeUnit value={timeLeft.hours} label="Giờ" urgent={isUrgent} />
        <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>:</span>
        <TimeUnit value={timeLeft.minutes} label="Phút" urgent={isUrgent} />
      </div>
    </div>
  );
};
const TimeUnit = ({ value, label, urgent }) => (
  <div className="text-center">
    <span className={`text-2xl font-bold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
      {String(value).padStart(2, '0')}
    </span>
    <p className={`text-xs ${urgent ? 'text-red-500' : 'text-amber-600'}`}>{label}</p>
  </div>
);
export default CountdownTimer;
Bước 4: Frontend - Tạo StatusBadge Component
File cần tạo: frontend-web/src/components/common/StatusBadge.jsx

const statusConfig = {
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã thanh toán' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ thanh toán' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang xử lý' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Quá hạn' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đã hủy' }
};
const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};
export default StatusBadge;
Bước 5: Frontend - Tạo Mobile Tuition Page
File cần tạo: frontend-web/src/pages/student/MobileTuitionPage.jsx

import { useState, useEffect } from 'react';
import mobileTuitionService from '../../services/mobileTuitionService';
import CountdownTimer from '../../components/common/CountdownTimer';
import StatusBadge from '../../components/common/StatusBadge';
const MobileTuitionPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tuitionData, setTuitionData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('all');
  useEffect(() => {
    fetchTuitionData();
  }, [selectedSemester]);
  const fetchTuitionData = async () => {
    try {
      setLoading(true);
      const response = await mobileTuitionService.getTuitionDetails(
        selectedSemester === 'all' ? null : selectedSemester
      );
      setTuitionData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông tin học phí');
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };
  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button 
            onClick={fetchTuitionData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  // No Outstanding Fees
  if (tuitionData && tuitionData.summary.totalOutstanding === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Bạn không có học phí chưa thanh toán
          </h2>
          <p className="text-green-600">Cảm ơn bạn đã thanh toán đầy đủ!</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-xl font-bold mb-4">Học Phí</h1>
        
        {/* Summary Card */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
          <p className="text-blue-100 text-sm mb-1">Tổng cần thanh toán</p>
          <p className="text-3xl font-bold">
            {formatCurrency(tuitionData?.summary?.totalOutstanding || 0)}
          </p>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-blue-100 mb-1">
              <span>Đã thanh toán: {formatCurrency(tuitionData?.summary?.totalPaid || 0)}</span>
              <span>
                {Math.round((tuitionData?.summary?.totalPaid / tuitionData?.summary?.totalDue) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(tuitionData?.summary?.totalPaid / tuitionData?.summary?.totalDue) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Countdown Timer */}
      {tuitionData?.nextDeadline && (
        <div className="mx-4 -mt-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <CountdownTimer 
            deadline={tuitionData.nextDeadline.date}
            label={`Hạn thanh toán: ${tuitionData.nextDeadline.formattedDate}`}
          />
        </div>
      )}
      {/* Semester Filter */}
      <div className="px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedSemester('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedSemester === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Tất cả
          </button>
          {tuitionData?.bills?.map(bill => (
            <button
              key={bill._id}
              onClick={() => setSelectedSemester(bill.semester)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedSemester === bill.semester 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {bill.semesterName || bill.semester}
            </button>
          ))}
        </div>
      </div>
      {/* Bill List */}
      <div className="px-4 mt-4 space-y-4">
        {tuitionData?.bills?.map((bill) => (
          <div
            key={bill._id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Bill Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">
                  {bill.semesterName || bill.semester}
                </h3>
                <StatusBadge status={bill.status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Hạn: {formatDate(bill.dueDate)}
              </p>
            </div>
            {/* Bill Details */}
            <div className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Học phí cơ bản</span>
                  <span className="font-medium">{formatCurrency(bill.breakdown.baseTuition)}</span>
                </div>
                
                {bill.breakdown.overloadAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phí đăng ký vượt</span>
                    <span className="font-medium text-orange-600">
                      +{formatCurrency(bill.breakdown.overloadAmount)}
                    </span>
                  </div>
                )}
                
                {bill.breakdown.repeatAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phí học lại</span>
                    <span className="font-medium text-orange-600">
                      +{formatCurrency(bill.breakdown.repeatAmount)}
                    </span>
                  </div>
                )}
                
                {bill.breakdown.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giảm trừ</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(bill.breakdown.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Còn lại</span>
                    <span className={bill.outstanding > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(bill.outstanding)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Pay Button */}
              {bill.outstanding > 0 && (
                <button
                  onClick={() => window.location.href = '/student/payment'}
                  className="w-full mt-4 py-3 bg-blue-600 text-white font-semibold rounded-xl"
                >
                  Thanh toán ngay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default MobileTuitionPage;
Bước 6: Thêm Route
File cần sửa: frontend-web/src/App.jsx Thêm vào phần Student Routes:

<Route path="tuition-mobile" element={<MobileTuitionPage />} />
2.4 Checklist Triển Khai

Cập nhật
finance.controller.js
- thêm method
getMyTuitionDetails

Cập nhật
finance.routes.js
- thêm route

Tạo
mobileTuitionService.js

Tạo
CountdownTimer.jsx
component

Tạo
StatusBadge.jsx
component

Tạo
MobileTuitionPage.jsx

Cập nhật
App.jsx
- thêm route

Test API endpoint

Test UI trên mobile viewport
3. Chức Năng 2: Show Fee Countdown
3.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	Show Fee Countdown
Actor	Student, Parent
Trigger	User điều hướng đến màn hình Tuition Fee hoặc Dashboard
Priority	Must Have
3.2 Phân Tích Code Hiện Có
Backend - Đã Có
Model: backend-api/src/models/registrationPeriod.model.js

// Có các fields:
- periodName
- startDate
- endDate
- status: 'upcoming' | 'active' | 'closed' | 'cancelled'
Model: backend-api/src/models/tuitionBill.model.js

// Có các fields:
- student
- semester
- totalAmount
- paidAmount
- status: 'pending' | 'processing' | 'paid' | 'overdue'
- dueDate
Frontend - Đã Có
Component CountdownTimer đã được tạo ở chức năng 1.

3.3 Hướng Triển Khai Chi Tiết
Bước 1: Backend - Tạo Countdown Controller
File cần tạo: backend-api/src/controllers/countdown.controller.js

const RegistrationPeriod = require('../../models/registrationPeriod.model');
const TuitionBill = require('../../models/tuitionBill.model');
const Student = require('../../models/student.model');
const mongoose = require('mongoose');
/**
 * @route   GET /api/finance/countdown
 * @desc    Lấy thông tin countdown deadline thanh toán
 * @access  Private
 */
exports.getFeeCountdown = async (req, res) => {
  try {
    const userId = req.auth.sub;
    
    // Lấy thông tin sinh viên
    const student = await Student.findOne({ userId }).select('_id cohort');
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin sinh viên' 
      });
    }
    const now = new Date();
    // Tìm registration period với deadline trong tương lai
    const currentPeriod = await RegistrationPeriod.findOne({
      status: 'active',
      endDate: { $gte: now },
      $or: [
        { allowedCohorts: { $size: 0 } },
        { allowedCohorts: student.cohort }
      ]
    })
    .sort({ endDate: 1 })
    .select('periodName endDate startDate');
    // Nếu không có deadline sắp tới
    if (!currentPeriod) {
      // Kiểm tra xem đã thanh toán hết chưa
      const unpaidBill = await TuitionBill.findOne({
        student: student._id,
        status: { $in: ['pending', 'overdue'] }
      });
      if (!unpaidBill) {
        return res.json({
          success: true,
          data: {
            hasUpcomingDeadline: false,
            status: 'paid',
            message: 'Bạn đã thanh toán tất cả học phí!'
          }
        });
      }
      // Có nợ nhưng không có deadline
      return res.json({
        success: true,
        data: {
          hasUpcomingDeadline: false,
          status: 'no_deadline',
          message: 'Không có deadline sắp tới'
        }
      });
    }
    // Kiểm tra trạng thái thanh toán
    const unpaidBill = await TuitionBill.findOne({
      student: student._id,
      status: { $in: ['pending', 'overdue'] },
      $expr: { $gt: ['$totalAmount', '$paidAmount'] }
    });
    // Nếu đã thanh toán hết
    if (!unpaidBill) {
      return res.json({
        success: true,
        data: {
          hasUpcomingDeadline: false,
          status: 'paid',
          message: 'Bạn đã thanh toán tất cả học phí!'
        }
      });
    }
    // Tính thời gian còn lại
    const timeRemaining = currentPeriod.endDate - now;
    const isOverdue = timeRemaining < 0;
    const isUrgent = timeRemaining > 0 && timeRemaining <= (3 * 24 * 60 * 60 * 1000);
    res.json({
      success: true,
      data: {
        hasUpcomingDeadline: true,
        deadline: {
          date: currentPeriod.endDate,
          formattedDate: new Date(currentPeriod.endDate).toLocaleDateString('vi-VN'),
          periodName: currentPeriod.periodName
        },
        timeRemaining: {
          days: Math.floor(Math.abs(timeRemaining) / (1000 * 60 * 60 * 24)),
          hours: Math.floor((Math.abs(timeRemaining) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((Math.abs(timeRemaining) % (1000 * 60 * 60)) / (1000 * 60)),
          isUrgent
        },
        status: isOverdue ? 'overdue' : 'active',
        outstandingAmount: unpaidBill.totalAmount - unpaidBill.paidAmount
      }
    });
  } catch (error) {
    console.error('getFeeCountdown error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể tải thông tin deadline' 
    });
  }
};
Bước 2: Backend - Thêm Route
File cần tạo: backend-api/src/routes/countdown.routes.js

const express = require('express');
const router = express.Router();
const countdownController = require('../controllers/countdown.controller');
const authMiddleware = require('../middlewares/auth.middleware');
router.get('/countdown', authMiddleware, countdownController.getFeeCountdown);
module.exports = router;
File cần sửa: backend-api/src/index.js Thêm vào phần đăng ký routes:

app.use('/api/finance', require('./routes/countdown.routes'));
Bước 3: Frontend - Tạo Countdown Widget
File cần tạo: frontend-web/src/components/student/CountdownWidget.jsx

import { useState, useEffect } from 'react';
import axiosClient from '../../services/axiosClient';
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
      const response = await axiosClient.get('/finance/countdown');
      setCountdown(response.data.data);
      setError(null);
      
      // Callback for parent component
      if (onCountdownUpdate) {
        onCountdownUpdate(response.data.data);
      }
    } catch (err) {
      setError('Không thể tải deadline');
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
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
  // No upcoming deadline or paid
  if (!countdown?.hasUpcomingDeadline) {
    return (
      <div className={`bg-green-50 rounded-xl border border-green-200 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-800">{countdown?.message}</p>
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
          <div>
            <p className="font-semibold text-red-800">Đã quá hạn thanh toán!</p>
            <p className="text-sm text-red-600">Hạn: {countdown.deadline.formattedDate}</p>
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
      {countdown.outstandingAmount > 0 && (
        <p className={`text-center mt-3 text-sm font-medium ${countdown.timeRemaining.isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
          Số tiền còn nợ: {formatCurrency(countdown.outstandingAmount)}
        </p>
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
Bước 4: Tích Hợp Widget
File cần sửa: frontend-web/src/pages/student/StudentHome.jsx

// Thêm import
import CountdownWidget from '../../components/student/CountdownWidget';
// Trong JSX, thêm vào vị trí phù hợp
<div className="mb-6">
  <CountdownWidget />
</div>
3.4 Checklist Triển Khai

Tạo
countdown.controller.js

Tạo
countdown.routes.js

Đăng ký route trong
index.js

Tạo
CountdownWidget.jsx

Tích hợp vào
StudentHome.jsx

Tích hợp vào
TuitionPage.jsx

Test countdown logic

Test urgent state (3 ngày)
4. Chức Năng 3: Generate Student Transcripts
4.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	Generate Student Transcripts
Actor	Student, Academic Staff, Admin
Trigger	User yêu cầu tạo hoặc xuất bảng điểm
Priority	Should Have
4.2 Phân Tích Code Hiện Có
Backend - Đã Có
File: backend-api/src/services/student.service.js

getStudentByUserId(userId)
getStudentById(studentId) File: backend-api/src/models/classEnrollment.model.js
{
  classSection: ObjectId,
  student: ObjectId,
  midtermScore: Number,
  finalScore: Number,
  assignmentScore: Number,
  continuousScore: Number,
  grade: Number,        // Grade letter: 'A', 'B+', 'C', etc.
  isFinalized: Boolean
}
File: frontend-web/src/pages/student/ViewGradesPage.jsx

Trang xem điểm hiện tại
4.3 Hướng Triển Khai Chi Tiết
Bước 1: Cài Đặt PDF Library
cd backend-api
npm install pdfkit
Bước 2: Backend - Tạo Transcript Model
File cần tạo: backend-api/src/models/transcript.model.js

const mongoose = require('mongoose');
const transcriptSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  semesterRange: {
    from: Number,
    to: Number
  },
  pdfPath: { type: String },
  status: { 
    type: String, 
    enum: ['generated', 'downloaded', 'expired'], 
    default: 'generated' 
  },
  metadata: {
    totalCredits: Number,
    cumulativeGPA: Number,
    semestersIncluded: [Number]
  }
}, { timestamps: true });
transcriptSchema.index({ student: 1, createdAt: -1 });
module.exports = mongoose.model('Transcript', transcriptSchema);
Bước 3: Backend - Tạo Transcript Service
File cần tạo: backend-api/src/services/transcript.service.js

const PDFDocument = require('pdfkit');
const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');
const Transcript = require('../models/transcript.model');
// Grade to Point conversion
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};
class TranscriptService {
  
  /**
   * Lấy preview bảng điểm (không có PDF)
   */
  async getPreview(studentId, options = {}) {
    const { semesterFrom, semesterTo } = options;
    
    const student = await Student.findById(studentId).populate('majorId curriculumId');
    if (!student) {
      throw new Error('Không tìm thấy sinh viên');
    }
    const query = {
      student: studentId,
      grade: { $exists: true, $ne: null },
      isFinalized: true
    };
    const enrollments = await ClassEnrollment.find(query)
      .populate({
        path: 'classSection',
        populate: { path: 'subject' }
      })
      .sort({ 'classSection.semester': 1 });
    if (enrollments.length === 0) {
      throw new Error('Không tìm thấy bảng điểm cho sinh viên này');
    }
    // Group by semester
    const semesterData = this.groupBySemester(enrollments, semesterFrom, semesterTo);
    
    // Calculate cumulative GPA
    const allGrades = enrollments.flatMap(e => {
      if (semesterFrom && e.classSection?.semester < semesterFrom) return [];
      if (semesterTo && e.classSection?.semester > semesterTo) return [];
      const credits = e.classSection?.subject?.credits || 0;
      return [{ grade: e.grade, credits }];
    });
    const cumulativeGPA = this.calculateGPA(allGrades);
    const totalCredits = allGrades.reduce((sum, g) => sum + g.credits, 0);
    return {
      studentInfo: {
        studentId: student._id,
        name: student.fullName,
        studentCode: student.studentCode,
        major: student.majorCode,
        majorName: student.majorId?.name,
        cohort: student.cohort,
        program: student.curriculumId?.name || 'Không xác định'
      },
      summary: {
        totalCredits,
        cumulativeGPA: cumulativeGPA.toFixed(2),
        semesters: Object.keys(semesterData).length
      },
      semesters: semesterData
    };
  }
  /**
   * Generate PDF transcript
   */
  async generatePDF(studentId, options = {}) {
    const preview = await this.getPreview(studentId, options);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'landscape'
      });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('TRƯỜNG ĐẠI HỌC FPT', { align: 'center' });
      doc.fontSize(14).text('BẢNG ĐIỂM SINH VIÊN', { align: 'center' });
      doc.moveDown();
      // Student Info Box
      doc.fontSize(11).font('Helvetica');
      const infoY = doc.y;
      
      doc.text(`Họ và tên: ${preview.studentInfo.name}`, 50, infoY);
      doc.text(`Mã sinh viên: ${preview.studentInfo.studentCode}`, 350, infoY);
      
      doc.text(`Ngành: ${preview.studentInfo.major} - ${preview.studentInfo.majorName || ''}`, 50, infoY + 18);
      doc.text(`Khóa: K${preview.studentInfo.cohort}`, 350, infoY + 18);
      
      doc.text(`Chương trình: ${preview.studentInfo.program}`, 50, infoY + 36);
      doc.moveDown(2);
      // Table Header
      const tableTop = doc.y;
      const colWidths = [60, 200, 60, 50, 60, 70];
      const headers = ['Mã môn', 'Tên môn', 'Số tín chỉ', 'Điểm', 'Thang 4', 'Kết quả'];
      doc.font('Helvetica-Bold').fontSize(10);
      let xPos = 50;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });
      // Draw line
      doc.moveTo(50, tableTop + 15).lineTo(810, tableTop + 15).stroke();
      // Table Rows
      doc.font('Helvetica').fontSize(9);
      let yPos = tableTop + 20;
      Object.values(preview.semesters).forEach((semester) => {
        // Semester header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Học kỳ ${semester.semester}`, 50, yPos);
        doc.text(`GPA: ${semester.semesterGPA.toFixed(2)}`, 700, yPos, { width: 80 });
        yPos += 18;
        // Courses
        doc.font('Helvetica').fontSize(9);
        semester.courses.forEach(course => {
          xPos = 50;
          const row = [
            course.code,
            course.name.substring(0, 30),
            course.credits.toString(),
            course.grade.toString(),
            course.gradePoint.toFixed(1),
            course.gradePoint >= 1.0 ? 'Đạt' : 'Không đạt'
          ];
          row.forEach((cell, i) => {
            doc.text(cell, xPos, yPos, { width: colWidths[i], align: i === 1 ? 'left' : 'center' });
            xPos += colWidths[i];
          });
          yPos += 16;
        });
        // Semester subtotal
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(`Tổng tín chỉ HK${semester.semester}: ${semester.totalCredits}`, 50, yPos);
        yPos += 20;
        // New page if needed
        if (yPos > 500) {
          doc.addPage();
          yPos = 50;
        }
      });
      // Summary
      doc.font('Helvetica-Bold').fontSize(12);
      doc.moveDown(2);
      doc.text(`Tổng số tín chỉ tích lũy: ${preview.summary.totalCredits}`, 50);
      doc.text(`GPA tích lũy: ${preview.summary.cumulativeGPA}`, 50);
      // Footer
      doc.fontSize(9).font('Helvetica');
      const now = new Date();
      doc.text(`Ngày in: ${now.toLocaleDateString('vi-VN')}`, 700, 550, { align: 'right' });
      doc.text(`Trang 1/1`, 50, 550);
      doc.end();
    });
  }
  /**
   * Lưu log transcript request
   */
  async logTranscriptRequest(studentId, userId, options = {}) {
    const preview = await this.getPreview(studentId, options);
    
    const transcript = new Transcript({
      student: studentId,
      generatedBy: userId,
      semesterRange: options,
      status: 'generated',
      metadata: {
        totalCredits: preview.summary.totalCredits,
        cumulativeGPA: preview.summary.cumulativeGPA,
        semestersIncluded: Object.keys(preview.semesters).map(Number)
      }
    });
    await transcript.save();
    return transcript;
  }
  // Helper methods
  groupBySemester(enrollments, from, to) {
    const grouped = {};
    
    enrollments.forEach(enrollment => {
      const semesterNum = enrollment.classSection?.semester || 1;
      
      // Apply filters
      if (from && semesterNum < from) return;
      if (to && semesterNum > to) return;
      
      if (!grouped[semesterNum]) {
        grouped[semesterNum] = {
          semester: semesterNum,
          courses: [],
          semesterGPA: 0
        };
      }
      
      const course = enrollment.classSection?.subject || {};
      grouped[semesterNum].courses.push({
        code: course.code,
        name: course.name,
        credits: course.credits || 0,
        grade: enrollment.grade,
        gradePoint: GRADE_POINTS[enrollment.grade] || 0
      });
    });
    // Calculate GPA for each semester
    Object.values(grouped).forEach(sem => {
      sem.semesterGPA = this.calculateGPA(sem.courses.map(c => ({ grade: c.gradePoint, credits: c.credits })));
      sem.totalCredits = sem.courses.reduce((sum, c) => sum + c.credits, 0);
    });
    return grouped;
  }
  calculateGPA(grades) {
    const totalPoints = grades.reduce((sum, g) => sum + (g.gradePoint * g.credits), 0);
    const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }
}
module.exports = new TranscriptService();
Bước 4: Backend - Tạo Transcript Controller
File cần tạo: backend-api/src/controllers/transcript.controller.js

const transcriptService = require('../services/transcript.service');
const Student = require('../models/student.model');
/**
 * @route   GET /api/grades/transcript/preview
 * @desc    Lấy preview bảng điểm
 * @access  Private
 */
exports.previewTranscript = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { role } = req.auth;
    let studentId = req.params.studentId;
    // Sinh viên chỉ được xem bảng điểm của mình
    if (role === 'student') {
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      studentId = student._id;
    } else if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }
    const preview = await transcriptService.getPreview(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });
    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('previewTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * @route   GET /api/grades/transcript/generate
 * @desc    Tạo và tải bảng điểm PDF
 * @access  Private
 */
exports.generateTranscript = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { role } = req.auth;
    let studentId = req.params.studentId;
    // Sinh viên chỉ được tạo bảng điểm của mình
    if (role === 'student') {
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      studentId = student._id;
    } else if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId' });
    }
    // Log request
    await transcriptService.logTranscriptRequest(studentId, userId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });
    // Generate PDF
    const pdfBuffer = await transcriptService.generatePDF(studentId, {
      semesterFrom: req.query.semesterFrom ? parseInt(req.query.semesterFrom) : null,
      semesterTo: req.query.semesterTo ? parseInt(req.query.semesterTo) : null
    });
    // Get student info for filename
    const student = await Student.findById(studentId);
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BangDiem_${student.studentCode}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('generateTranscript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
Bước 5: Backend - Thêm Routes
File cần tạo: backend-api/src/routes/transcript.routes.js

const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcript.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
// Student - own transcript
router.get('/transcript/preview', authMiddleware, transcriptController.previewTranscript);
router.get('/transcript/generate', authMiddleware, transcriptController.generateTranscript);
// Admin/Staff - any student
router.get('/transcript/preview/:studentId', authMiddleware, rbacMiddleware(['admin', 'staff']), transcriptController.previewTranscript);
router.get('/transcript/generate/:studentId', authMiddleware, rbacMiddleware(['admin', 'staff']), transcriptController.generateTranscript);
module.exports = router;
File cần sửa: backend-api/src/index.js

app.use('/api/grades', require('./routes/transcript.routes'));
Bước 6: Frontend - Tạo Transcript Service
File cần tạo: frontend-web/src/services/transcriptService.js

import axiosClient from './axiosClient';
const transcriptService = {
  /**
   * Lấy preview bảng điểm
   */
  getPreview: async () => {
    const response = await axiosClient.get('/grades/transcript/preview');
    return response.data;
  },
  /**
   * Tải bảng điểm PDF
   */
  downloadTranscript: async (options = {}) => {
    try {
      const response = await axiosClient.get('/grades/transcript/generate', {
        params: options,
        responseType: 'blob'
      });
      // Create blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `BangDiem_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
};
export default transcriptService;
Bước 7: Frontend - Tạo Transcript Page
File cần tạo: frontend-web/src/pages/student/TranscriptPage.jsx

import { useState, useEffect } from 'react';
import transcriptService from '../../services/transcriptService';
const TranscriptPage = () => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchPreview();
  }, []);
  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await transcriptService.getPreview();
      setPreview(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải bảng điểm');
    } finally {
      setLoading(false);
    }
  };
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await transcriptService.downloadTranscript();
    } catch (err) {
      setError('Không thể tải bảng điểm PDF');
    } finally {
      setDownloading(false);
    }
  };
  const getGPAColor = (gpa) => {
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 2.5) return 'text-blue-600';
    if (gpa >= 2.0) return 'text-amber-600';
    return 'text-red-600';
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetchPreview} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg">
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-2">Bảng Điểm</h1>
        <p className="text-indigo-100">Xem và tải bảng điểm chính thức</p>
      </div>
      {/* Student Info Card */}
      <div className="mx-4 -mt-4 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">
              {preview?.studentInfo?.name?.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{preview?.studentInfo?.name}</h2>
            <p className="text-gray-500">{preview?.studentInfo?.studentCode}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Ngành</p>
            <p className="font-semibold">{preview?.studentInfo?.major}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Khóa</p>
            <p className="font-semibold">K{preview?.studentInfo?.cohort}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Số tín chỉ</p>
            <p className="font-semibold">{preview?.summary?.totalCredits}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <p className="text-sm text-indigo-600">GPA Tích lũy</p>
            <p className={`text-2xl font-bold ${getGPAColor(preview?.summary?.cumulativeGPA)}`}>
              {preview?.summary?.cumulativeGPA}
            </p>
          </div>
        </div>
      </div>
      {/* GPA Chart */}
      <div className="mx-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">GPA qua các học kỳ</h3>
          <div className="h-48 flex items-end gap-2 justify-around">
            {preview?.semesters && Object.values(preview.semesters).map((sem) => {
              const height = (sem.semesterGPA / 4.0) * 100;
              const color = sem.semesterGPA >= 3.0 ? 'bg-green-500' 
                : sem.semesterGPA >= 2.0 ? 'bg-amber-500' 
                : 'bg-red-500';
              
              return (
                <div key={sem.semester} className="flex flex-col items-center flex-1">
                  <div className="w-full relative" style={{ height: '160px' }}>
                    <div 
                      className={`absolute bottom-0 w-full rounded-t-lg ${color}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">
                      {sem.semesterGPA.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">HK{sem.semester}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Semester Details */}
      <div className="mx-4 mt-6 space-y-4">
        {preview?.semesters && Object.values(preview.semesters).map((sem) => (
          <div key={sem.semester} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-semibold">Học kỳ {sem.semester}</h4>
              <div className="text-right">
                <p className="text-sm text-gray-500">GPA: <span className={`font-bold ${getGPAColor(sem.semesterGPA)}`}>{sem.semesterGPA.toFixed(2)}</span></p>
                <p className="text-sm text-gray-500">{sem.totalCredits} tín chỉ</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Môn học</th>
                    <th className="px-4 py-2 text-center">Tín chỉ</th>
                    <th className="px-4 py-2 text-center">Điểm</th>
                    <th className="px-4 py-2 text-center">Thang 4</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sem.courses.map((course, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">
                        <p className="font-medium">{course.code}</p>
                        <p className="text-xs text-gray-500">{course.name}</p>
                      </td>
                      <td className="px-4 py-2 text-center">{course.credits}</td>
                      <td className="px-4 py-2 text-center font-semibold">{course.grade}</td>
                      <td className="px-4 py-2 text-center">{course.gradePoint.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {/* Download Button */}
      <div className="mx-4 mt-6">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Tải Bảng Điểm PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default TranscriptPage;
Bước 8: Thêm Route
File cần sửa: frontend-web/src/App.jsx

<Route path="transcript" element={<TranscriptPage />} />
4.4 Checklist Triển Khai

Cài đặt
pdfkit

Tạo
transcript.model.js

Tạo
transcript.service.js

Tạo
transcript.controller.js

Tạo
transcript.routes.js

Đăng ký route trong
index.js

Tạo
transcriptService.js

Tạo
TranscriptPage.jsx

Cập nhật
App.jsx

Test PDF generation

Test GPA calculation
5. Chức Năng 4: Send Payment Reminders
5.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	Send Payment Reminders
Actor	Admin
Trigger	Hệ thống tự động gửi hoặc Admin thủ công
Priority	Should Have
5.2 Hướng Triển Khai Chi Tiết
Bước 1: Backend - Tạo Payment Reminder Model
File cần tạo: backend-api/src/models/paymentReminder.model.js

const mongoose = require('mongoose');
const paymentReminderSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  semester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Semester' 
  },
  reminderType: { 
    type: String, 
    enum: ['email', 'sms', 'inapp', 'all'], 
    default: 'all' 
  },
  template: { type: String, default: 'default' },
  customMessage: { type: String },
  sentBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  sentAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed', 'skipped'], 
    default: 'pending' 
  },
  errorMessage: { type: String },
  results: {
    email: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
    sms: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
    inapp: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] }
  }
}, { timestamps: true });
// Index for preventing duplicate reminders
paymentReminderSchema.index({ student: 1, sentAt: -1 });
paymentReminderSchema.index({ sentBy: 1, sentAt: -1 });
module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);
Bước 2: Backend - Tạo Payment Reminder Service
File cần tạo: backend-api/src/services/paymentReminder.service.js

const PaymentReminder = require('../models/paymentReminder.model');
const Student = require('../models/student.model');
const TuitionBill = require('../models/tuitionBill.model');
const User = require('../models/user.model');
const emailService = require('./email.service');
class PaymentReminderService {
  
  /**
   * Lấy danh sách sinh viên có nợ học phí
   */
  async getStudentsWithOutstandingFees(filters = {}) {
    const { semesterId, majorCode, cohort } = filters;
    // Find unpaid bills
    const bills = await TuitionBill.find({
      $expr: { $gt: ['$totalAmount', '$paidAmount'] },
      status: { $in: ['pending', 'overdue'] }
    })
    .populate('student', 'studentCode fullName majorCode cohort email phone userId')
    .populate('semester', 'code name');
    // Group by student
    const studentMap = new Map();
    
    bills.forEach(bill => {
      const studentId = bill.student._id.toString();
      
      // Apply filters
      if (majorCode && bill.student.majorCode !== majorCode) return;
      if (cohort && bill.student.cohort !== cohort) return;
      if (semesterId && bill.semester?._id.toString() !== semesterId) return;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: bill.student._id,
          studentCode: bill.student.studentCode,
          fullName: bill.student.fullName,
          email: bill.student.email,
          phone: bill.student.phone,
          majorCode: bill.student.majorCode,
          cohort: bill.student.cohort,
          totalOutstanding: bill.totalAmount - bill.paidAmount,
          billsCount: 1,
          latestDueDate: bill.dueDate
        });
      } else {
        const existing = studentMap.get(studentId);
        existing.totalOutstanding += bill.totalAmount - bill.paidAmount;
        existing.billsCount++;
        if (bill.dueDate > existing.latestDueDate) {
          existing.latestDueDate = bill.dueDate;
        }
      }
    });
    return Array.from(studentMap.values());
  }
  /**
   * Kiểm tra có thể gửi reminder không (prevent spam - 24h)
   */
  async canSendReminder(studentId) {
    const lastReminder = await PaymentReminder.findOne({
      student: studentId,
      status: 'sent'
    }).sort({ sentAt: -1 });
    if (!lastReminder) return { canSend: true };
    const hoursSinceLastReminder = (Date.now() - lastReminder.sentAt) / (1000 * 60 * 60);
    
    if (hoursSinceLastReminder < 24) {
      return { 
        canSend: false, 
        hoursRemaining: Math.ceil(24 - hoursSinceLastReminder)
      };
    }
    return { canSend: true };
  }
  /**
   * Gửi reminder cho một sinh viên
   */
  async sendReminder(studentId, options = {}) {
    const { type = 'all', template = 'default', customMessage, sentBy } = options;
    
    const student = await Student.findById(studentId).populate('userId');
    if (!student) throw new Error('Không tìm thấy sinh viên');
    const user = student.userId;
    
    // Get unpaid bills
    const unpaidBills = await TuitionBill.find({
      student: studentId,
      $expr: { $gt: ['$totalAmount', '$paidAmount'] }
    });
    const totalOutstanding = unpaidBills.reduce(
      (sum, bill) => sum + (bill.totalAmount - bill.paidAmount), 
      0
    );
    // Create reminder record
    const reminder = new PaymentReminder({
      student: studentId,
      semester: unpaidBills[0]?.semester,
      reminderType: type,
      template,
      customMessage,
      sentBy,
      status: 'pending'
    });
    const results = { email: 'skipped', sms: 'skipped', inapp: 'skipped' };
    try {
      const messageContent = customMessage || this.generateMessage(student, totalOutstanding, unpaidBills[0]?.dueDate);
      // Send Email
      if (['email', 'all'].includes(type) && user?.email) {
        try {
          await emailService.sendPaymentReminder({
            to: user.email,
            studentName: student.fullName,
            amount: totalOutstanding,
            deadline: unpaidBills[0]?.dueDate,
            message: messageContent
          });
          results.email = 'sent';
        } catch (error) {
          results.email = 'failed';
        }
      }
      // Send SMS (mock - integrate SMS gateway)
      if (['sms', 'all'].includes(type) && user?.phone) {
        try {
          await this.sendSMS(user.phone, messageContent);
          results.sms = 'sent';
        } catch (error) {
          results.sms = 'failed';
        }
      }
      // Send In-app notification via Socket.IO
      if (['inapp', 'all'].includes(type)) {
        try {
          const io = require('../configs/socket.config').getIO();
          io.to(user._id.toString()).emit('notification', {
            type: 'payment_reminder',
            title: 'Nhắc nhở thanh toán học phí',
            message: messageContent,
            data: { amount: totalOutstanding }
          });
          results.inapp = 'sent';
        } catch (error) {
          results.inapp = 'failed';
        }
      }
      reminder.status = 'sent';
      reminder.sentAt = new Date();
      reminder.results = results;
      await reminder.save();
      return { success: true, reminder, results };
    } catch (error) {
      reminder.status = 'failed';
      reminder.errorMessage = error.message;
      await reminder.save();
      throw error;
    }
  }
  /**
   * Gửi batch reminders
   */
  async sendBatchReminders(studentIds, options = {}) {
    const results = {
      total: studentIds.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: []
    };
    for (const studentId of studentIds) {
      try {
        // Check spam prevention
        const canSend = await this.canSendReminder(studentId);
        if (!canSend.canSend) {
          results.skipped++;
          results.details.push({
            studentId,
            status: 'skipped',
            reason: `Đã gửi reminder cách đây ${24 - canSend.hoursRemaining} giờ`
          });
          continue;
        }
        const result = await this.sendReminder(studentId, options);
        results.sent++;
        results.details.push({
          studentId,
          status: 'sent',
          results: result.results
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          studentId,
          status: 'failed',
          error: error.message
        });
      }
      // Delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }
  /**
   * Lấy lịch sử reminders
   */
  async getReminderHistory(filters = {}) {
    const { studentId, from, to, status, page = 1, limit = 20 } = filters;
    const query = {};
    if (studentId) query.student = studentId;
    if (status) query.status = status;
    if (from || to) {
      query.sentAt = {};
      if (from) query.sentAt.$gte = new Date(from);
      if (to) query.sentAt.$lte = new Date(to);
    }
    const [reminders, total] = await Promise.all([
      PaymentReminder.find(query)
        .populate('student', 'studentCode fullName')
        .populate('sentBy', 'fullName email')
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      PaymentReminder.countDocuments(query)
    ]);
    return {
      reminders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
  /**
   * Tạo nội dung reminder
   */
  generateMessage(student, amount, deadline) {
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
    const formattedDate = deadline ? new Date(deadline).toLocaleDateString('vi-VN') : 'không xác định';
    
    return `Chào ${student.fullName},\
\
` +
      `Bạn có khoản học phí còn nợ: ${formattedAmount} VND.\
` +
      `Hạn thanh toán: ${formattedDate}.\
\
` +
      `Vui lòng thanh toán sớm để tránh ảnh hưởng đến việc đăng ký học phần.\
\
` +
      `Trân trọng,\
Phòng Tài chính - Trường Đại học FPT`;
  }
  /**
   * Mock SMS sending
   */
  async sendSMS(phone, message) {
    console.log(`[SMS] To: ${phone}, Message: ${message.substring(0, 50)}...`);
    return { success: true, messageId: `SMS_${Date.now()}` };
  }
}
module.exports = new PaymentReminderService();
Bước 3: Backend - Tạo Controller
File cần tạo: backend-api/src/controllers/paymentReminder.controller.js

const paymentReminderService = require('../services/paymentReminder.service');
/**
 * @route   GET /api/payment-reminders/students-with-outstanding-fees
 * @desc    Lấy danh sách sinh viên có nợ
 * @access  Private/Admin
 */
exports.getStudentsWithOutstandingFees = async (req, res) => {
  try {
    const { semesterId, majorCode, cohort } = req.query;
    
    const students = await paymentReminderService.getStudentsWithOutstandingFees({
      semesterId, majorCode, cohort
    });
    
    res.json({
      success: true,
      data: {
        count: students.length,
        students
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * @route   POST /api/payment-reminders/send
 * @desc    Gửi reminders
 * @access  Private/Admin
 */
exports.sendReminders = async (req, res) => {
  try {
    const { studentIds, type, template, customMessage } = req.body;
    const sentBy = req.auth.sub;
    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng chọn ít nhất một sinh viên' 
      });
    }
    if (studentIds.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tối đa 100 sinh viên mỗi lần gửi' 
      });
    }
    const results = await paymentReminderService.sendBatchReminders(studentIds, {
      type: type || 'all',
      template: template || 'default',
      customMessage,
      sentBy
    });
    res.json({
      success: true,
      message: `Đã gửi ${results.sent} reminders, ${results.skipped} bị bỏ qua, ${results.failed} thất bại`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * @route   GET /api/payment-reminders/history
 * @desc    Lấy lịch sử gửi reminders
 * @access  Private/Admin
 */
exports.getReminderHistory = async (req, res) => {
  try {
    const { studentId, from, to, status, page, limit } = req.query;
    const history = await paymentReminderService.getReminderHistory({
      studentId, from, to, status, page, limit
    });
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
Bước 4: Backend - Tạo Routes
File cần tạo: backend-api/src/routes/paymentReminder.routes.js

const express = require('express');
const router = express.Router();
const paymentReminderController = require('../controllers/paymentReminder.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
// All routes require admin/staff role
router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));
router.get('/students-with-outstanding-fees', paymentReminderController.getStudentsWithOutstandingFees);
router.post('/send', paymentReminderController.sendReminders);
router.get('/history', paymentReminderController.getReminderHistory);
module.exports = router;
File cần sửa: backend-api/src/index.js

app.use('/api/payment-reminders', require('./routes/paymentReminder.routes'));
Bước 5: Frontend - Tạo Service
File cần tạo: frontend-web/src/services/paymentReminderService.js

import axiosClient from './axiosClient';
const paymentReminderService = {
  /**
   * Lấy danh sách sinh viên có nợ
   */
  getStudentsWithOutstandingFees: async (filters = {}) => {
    const response = await axiosClient.get('/payment-reminders/students-with-outstanding-fees', {
      params: filters
    });
    return response.data;
  },
  /**
   * Gửi reminders
   */
  sendReminders: async (data) => {
    const response = await axiosClient.post('/payment-reminders/send', data);
    return response.data;
  },
  /**
   * Lấy lịch sử reminders
   */
  getReminderHistory: async (filters = {}) => {
    const response = await axiosClient.get('/payment-reminders/history', {
      params: filters
    });
    return response.data;
  }
};
export default paymentReminderService;
Bước 6: Frontend - Tạo Payment Reminder Page
File cần tạo: frontend-web/src/pages/admin/PaymentReminderPage.jsx

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import paymentReminderService from '../../services/paymentReminderService';
const REMINDER_TYPES = [
  { value: 'all', label: 'Tất cả (Email + SMS + In-app)', icon: '📢' },
  { value: 'email', label: 'Chỉ Email', icon: '📧' },
  { value: 'sms', label: 'Chỉ SMS', icon: '📱' },
  { value: 'inapp', label: 'Chỉ In-app', icon: '🔔' }
];
const PaymentReminderPage = () => {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [reminderType, setReminderType] = useState('all');
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({ majorCode: '', cohort: '' });
  useEffect(() => {
    fetchStudents();
  }, [filters]);
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await paymentReminderService.getStudentsWithOutstandingFees(filters);
      setStudents(response.data.students);
    } catch (error) {
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await paymentReminderService.getReminderHistory();
      setHistory(response.data.reminders);
    } catch (error) {
      toast.error('Không thể tải lịch sử');
    } finally {
      setHistoryLoading(false);
    }
  };
  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.studentId));
    }
  };
  const handleSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };
  const handleSendReminders = async () => {
    if (selectedStudents.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một sinh viên');
      return;
    }
    try {
      setSending(true);
      const response = await paymentReminderService.sendReminders({
        studentIds: selectedStudents,
        type: reminderType,
        customMessage: customMessage || undefined
      });
      toast.success(response.message);
      setSelectedStudents([]);
      setCustomMessage('');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gửi reminders thất bại');
    } finally {
      setSending(false);
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };
  const getStatusBadge = (status) => {
    const config = {
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      skipped: 'bg-amber-100 text-amber-700',
      pending: 'bg-gray-100 text-gray-700'
    };
    return <span className={`px-2 py-1 rounded text-xs ${config[status]}`}>{status}</span>;
  };
  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nhắc nhở thanh toán</h1>
        <p className="text-gray-500">Gửi thông báo nhắc nhở học phí cho sinh viên</p>
      </div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('compose')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'compose' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'
          }`}
        >
          Soạn thảo
        </button>
        <button
          onClick={() => { setActiveTab('history'); fetchHistory(); }}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'
          }`}
        >
          Lịch sử gửi
        </button>
      </div>
      {activeTab === 'compose' ? (
        <>
          {/* Reminder Type Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Loại thông báo</h3>
            <div className="flex flex-wrap gap-4">
              {REMINDER_TYPES.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer ${
                    reminderType === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reminderType"
                    value={option.value}
                    checked={reminderType === option.value}
                    onChange={(e) => setReminderType(e.target.value)}
                    className="sr-only"
                  />
                  <span>{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Custom Message */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Tin nhắn tùy chỉnh (không bắt buộc)</h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Nhập tin nhắn tùy chỉnh hoặc để trống để sử dụng mẫu mặc định..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {/* Student Selection */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-800">Danh sách sinh viên</h3>
                <p className="text-sm text-gray-500">
                  {selectedStudents.length} / {students.length} được chọn
                </p>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {selectedStudents.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            {/* Filters */}
            <div className="p-4 border-b bg-white">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Lọc theo ngành (VD: SE, AI)"
                  value={filters.majorCode}
                  onChange={(e) => setFilters(prev => ({ ...prev, majorCode: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Lọc theo khóa (VD: 18, 19)"
                  value={filters.cohort}
                  onChange={(e) => setFilters(prev => ({ ...prev, cohort: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không có sinh viên nào có học phí chưa thanh toán
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {students.map(student => (
                  <label
                    key={student.studentId}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.studentId)}
                      onChange={() => handleSelect(student.studentId)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-sm text-gray-500">
                        {student.studentCode} • {student.majorCode} • K{student.cohort}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(student.totalOutstanding)}
                      </p>
                      <p className="text-xs text-gray-500">{student.billsCount} hóa đơn</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* Send Button */}
          <button
            onClick={handleSendReminders}
            disabled={sending || selectedStudents.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Gửi {selectedStudents.length} thông báo</span>
              </>
            )}
          </button>
        </>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Chưa có lịch sử gửi reminders</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày gửi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map(reminder => (
                  <tr key={reminder._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{reminder.student?.fullName}</p>
                      <p className="text-sm text-gray-500">{reminder.student?.studentCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {reminder.reminderType}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(reminder.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(reminder.sentAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
export default PaymentReminderPage;
Bước 7: Thêm Route
File cần sửa: frontend-web/src/App.jsx

<Route path="admin/payment-reminders" element={<PaymentReminderPage />} />
5.3 Checklist Triển Khai

Tạo
paymentReminder.model.js

Tạo
paymentReminder.service.js

Tạo
paymentReminder.controller.js

Tạo
paymentReminder.routes.js

Đăng ký route trong
index.js

Tạo
paymentReminderService.js

Tạo
PaymentReminderPage.jsx

Cập nhật
App.jsx

Test spam prevention (24h)

Test batch sending
6. Chức Năng 5: View Tuition Revenue Report
6.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	View Tuition Revenue Report
Actor	Admin, Academic Staff
Trigger	User điều hướng đến màn hình báo cáo
Priority	Should Have
6.2 Hướng Triển Khai Chi Tiết
Bước 1: Backend - Tạo Revenue Report Service
File cần tạo: backend-api/src/services/revenueReport.service.js

const Payment = require('../models/payment.model');
const TuitionBill = require('../models/tuitionBill.model');
const Student = require('../models/student.model');
class RevenueReportService {
  
  /**
   * Lấy tổng quan doanh thu
   */
  async getSummary(dateRange, filters = {}) {
    const { startDate, endDate } = dateRange;
    const { majorCode, semesterCode } = filters;
    const paymentMatch = {
      status: 'completed',
      paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    const [payments, allBills] = await Promise.all([
      Payment.find(paymentMatch),
      TuitionBill.find(semesterCode ? { semesterCode } : {})
    ]);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = allBills.reduce((sum, bill) => 
      sum + (bill.totalAmount - bill.paidAmount), 0
    );
    const totalBilled = allBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
    return {
      totalCollected,
      totalOutstanding,
      totalBilled,
      collectionRate: collectionRate.toFixed(2),
      totalTransactions: payments.length
    };
  }
  /**
   * Doanh thu theo thời gian (xu hướng)
   */
  async getTrend(dateRange, groupBy = 'month') {
    const { startDate, endDate } = dateRange;
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'quarter':
        dateFormat = '%Y-Q';
        break;
      default:
        dateFormat = '%Y-%m';
    }
    const payments = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$paidAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    return payments.map(p => ({
      period: p._id,
      revenue: p.revenue,
      count: p.count
    }));
  }
  /**
   * Doanh thu theo ngành
   */
  async getRevenueByMajor(dateRange) {
    const { startDate, endDate } = dateRange;
    const result = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$studentInfo.majorCode',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    return result.map(r => ({
      major: r._id || 'Unknown',
      revenue: r.revenue,
      count: r.count
    }));
  }
  /**
   * Doanh thu theo phương thức thanh toán
   */
  async getRevenueByPaymentMethod(dateRange) {
    const { startDate, endDate } = dateRange;
    const result = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$method',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    const methodLabels = {
      'online': 'Thanh toán online',
      'bank_transfer': 'Chuyển khoản',
      'cash': 'Tiền mặt',
      'wallet': 'Ví điện tử'
    };
    return result.map(r => ({
      method: methodLabels[r._id] || r._id,
      revenue: r.revenue,
      count: r.count
    }));
  }
  /**
   * Phân bổ trạng thái thanh toán
   */
  async getStatusDistribution(dateRange) {
    const { semesterCode } = dateRange;
    const bills = await TuitionBill.find(semesterCode ? { semesterCode } : {});
    const distribution = {
      paid: 0,
      pending: 0,
      overdue: 0,
      partial: 0
    };
    bills.forEach(bill => {
      const outstanding = bill.totalAmount - bill.paidAmount;
      
      if (outstanding <= 0) {
        distribution.paid += bill.totalAmount;
      } else if (bill.status === 'overdue') {
        distribution.overdue += outstanding;
      } else {
        distribution.pending += outstanding;
      }
      
      if (bill.paidAmount > 0 && outstanding > 0) {
        distribution.partial += bill.paidAmount;
      }
    });
    return [
      { status: 'Đã thanh toán', amount: distribution.paid, color: '#22c55e' },
      { status: 'Chờ thanh toán', amount: distribution.pending, color: '#f59e0b' },
      { status: 'Quá hạn', amount: distribution.overdue, color: '#ef4444' },
      { status: 'Thanh toán một phần', amount: distribution.partial, color: '#6366f1' }
    ];
  }
  /**
   * Chi tiết giao dịch
   */
  async getTransactionDetails(dateRange, pagination = {}) {
    const { startDate, endDate } = dateRange;
    const { page = 1, limit = 20 } = pagination;
    const query = {
      status: 'completed',
      paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    const [transactions, total] = await Promise.all([
      Payment.find(query)
        .populate('student', 'studentCode fullName majorCode cohort')
        .sort({ paidAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);
    return {
      transactions: transactions.map(t => ({
        id: t._id,
        orderCode: t.orderCode,
        student: t.student,
        amount: t.amount,
        method: t.method,
        paidAt: t.paidAt,
        description: t.description
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
}
module.exports = new RevenueReportService();
Bước 2: Backend - Tạo Controller
File cần tạo: backend-api/src/controllers/revenueReport.controller.js

const revenueReportService = require('../services/revenueReport.service');
exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate, majorCode, semesterCode } = req.query;
    const summary = await revenueReportService.getSummary(
      { startDate, endDate },
      { majorCode, semesterCode }
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getTrend = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const trend = await revenueReportService.getTrend({ startDate, endDate }, groupBy);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getByMajor = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const byMajor = await revenueReportService.getRevenueByMajor({ startDate, endDate });
    res.json({ success: true, data: byMajor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getByPaymentMethod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const byMethod = await revenueReportService.getRevenueByPaymentMethod({ startDate, endDate });
    res.json({ success: true, data: byMethod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getStatusDistribution = async (req, res) => {
  try {
    const { semesterCode } = req.query;
    const distribution = await revenueReportService.getStatusDistribution({ semesterCode });
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const transactions = await revenueReportService.getTransactionDetails(
      { startDate, endDate },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
Bước 3: Backend - Tạo Routes
File cần tạo: backend-api/src/routes/revenueReport.routes.js

const express = require('express');
const router = express.Router();
const revenueReportController = require('../controllers/revenueReport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');
router.use(authMiddleware);
router.use(rbacMiddleware(['admin', 'staff']));
router.get('/summary', revenueReportController.getSummary);
router.get('/trend', revenueReportController.getTrend);
router.get('/by-major', revenueReportController.getByMajor);
router.get('/by-payment-method', revenueReportController.getByPaymentMethod);
router.get('/status-distribution', revenueReportController.getStatusDistribution);
router.get('/transactions', revenueReportController.getTransactions);
module.exports = router;
File cần sửa: backend-api/src/index.js

app.use('/api/revenue-reports', require('./routes/revenueReport.routes'));
Bước 4: Frontend - Tạo Service
File cần tạo: frontend-web/src/services/revenueReportService.js

import axiosClient from './axiosClient';
const revenueReportService = {
  getSummary: async (params) => {
    const response = await axiosClient.get('/revenue-reports/summary', { params });
    return response.data;
  },
  getTrend: async (params) => {
    const response = await axiosClient.get('/revenue-reports/trend', { params });
    return response.data;
  },
  getByMajor: async (params) => {
    const response = await axiosClient.get('/revenue-reports/by-major', { params });
    return response.data;
  },
  getByPaymentMethod: async (params) => {
    const response = await axiosClient.get('/revenue-reports/by-payment-method', { params });
    return response.data;
  },
  getStatusDistribution: async (params) => {
    const response = await axiosClient.get('/revenue-reports/status-distribution', { params });
    return response.data;
  },
  getTransactions: async (params) => {
    const response = await axiosClient.get('/revenue-reports/transactions', { params });
    return response.data;
  }
};
export default revenueReportService;
Bước 5: Frontend - Tạo Revenue Report Page
File cần tạo: frontend-web/src/pages/admin/RevenueReportPage.jsx

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import revenueReportService from '../../services/revenueReportService';
const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];
const RevenueReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [byMajor, setByMajor] = useState([]);
  const [byMethod, setByMethod] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [activeChart, setActiveChart] = useState('trend');
  useEffect(() => {
    fetchAllData();
  }, [dateRange]);
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, trendRes, byMajorRes, byMethodRes, statusRes, transRes] = await Promise.all([
        revenueReportService.getSummary(dateRange),
        revenueReportService.getTrend(dateRange),
        revenueReportService.getByMajor(dateRange),
        revenueReportService.getByPaymentMethod(dateRange),
        revenueReportService.getStatusDistribution(dateRange),
        revenueReportService.getTransactions({ ...dateRange, page: 1 })
      ]);
      setSummary(summaryRes.data);
      setTrend(trendRes.data);
      setByMajor(byMajorRes.data);
      setByMethod(byMethodRes.data);
      setStatusDistribution(statusRes.data);
      setTransactions(transRes.data.transactions);
      setPagination({ page: transRes.data.page, totalPages: transRes.data.totalPages });
      
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Báo Cáo Doanh Thu Học Phí</h1>
        <p className="text-gray-500">Phân tích doanh thu và xu hướng thanh toán</p>
      </div>
      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange({
                startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
            >
              Năm nay
            </button>
            <button
              onClick={() => setDateRange({
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
            >
              Tháng này
            </button>
          </div>
        </div>
      </div>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <p className="text-green-100 text-sm">Tổng thu</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalCollected)}</p>
            <p className="text-green-100 text-sm mt-2">{summary.totalTransactions} giao dịch</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
            <p className="text-amber-100 text-sm">Còn phải thu</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <p className="text-blue-100 text-sm">Tổng phát hành</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalBilled)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <p className="text-purple-100 text-sm">Tỷ lệ thu</p>
            <p className="text-2xl font-bold mt-1">{summary.collectionRate}%</p>
          </div>
        </div>
      )}
      {/* Chart Tabs */}
      <div className="flex gap-2 mb-6">
        {['trend', 'major', 'method', 'status'].map(chart => (
          <button
            key={chart}
            onClick={() => setActiveChart(chart)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeChart === chart ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            {chart === 'trend' ? 'Xu hướng' : 
             chart === 'major' ? 'Theo ngành' : 
             chart === 'method' ? 'Theo phương thức' : 'Trạng thái'}
          </button>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {activeChart === 'trend' && (
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Doanh thu theo thời gian</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {activeChart === 'major' && (
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Doanh thu theo ngành</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMajor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="major" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {activeChart === 'method' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Theo phương thức</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={byMethod}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="revenue"
                    nameKey="method"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {byMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Chi tiết</h3>
              <div className="space-y-3">
                {byMethod.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{item.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                      <p className="text-sm text-gray-500">{item.count} giao dịch</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {activeChart === 'status' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Phân bổ trạng thái</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="status"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Tổng quan</h3>
              <div className="space-y-4">
                {statusDistribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.status}
                      </span>
                      <span className="font-semibold">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${(item.amount / summary?.totalBilled) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Chi tiết giao dịch</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã GD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phương thức</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((trans) => (
                <tr key={trans.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{trans.orderCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{trans.student?.fullName}</p>
                    <p className="text-sm text-gray-500">{trans.student?.studentCode}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(trans.amount)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-sm">{trans.method}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(trans.paidAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-1 border rounded">Trước</button>
            <span className="px-3 py-1">Trang {pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="px-3 py-1 border rounded">Sau</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default RevenueReportPage;
Bước 6: Thêm Route
File cần sửa: frontend-web/src/App.jsx

<Route path="admin/revenue-report" element={<RevenueReportPage />} />
6.3 Checklist Triển Khai

Tạo
revenueReport.service.js

Tạo
revenueReport.controller.js

Tạo
revenueReport.routes.js

Đăng ký route trong
index.js

Tạo
revenueReportService.js

Tạo
RevenueReportPage.jsx

Cập nhật
App.jsx

Test aggregation queries

Test chart rendering
7. Chức Năng 6: View Student Performance Report
7.1 Mô Tả Yêu Cầu
Thông tin	Chi tiết
UC ID	View Student Performance Report
Actor	Admin, Academic Staff
Trigger	User điều hướng đến màn hình báo cáo
Priority	High (Complex)
7.2 Hướng Triển Khai Chi Tiết
Bước 1: Backend - Tạo Performance Report Service
File cần tạo: backend-api/src/services/performanceReport.service.js

const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');
const Attendance = require('../models/attendance.model');
class PerformanceReportService {
  
  /**
   * Lấy tổng quan hiệu suất
   */
  async getOverview(filters = {}) {
    const { semesterCode, majorCode, cohort } = filters;
    
    // Build match stage
    const matchStage = {};
    if (majorCode) matchStage.majorCode = majorCode;
    if (cohort) matchStage.cohort = parseInt(cohort);
    // GPA Distribution
    const gpaDistribution = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: {
          from: 'classsections',
          localField: 'classSection',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      // Apply filters
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      ...(cohort ? [{ $match: { 'studentInfo.cohort': parseInt(cohort) } }] : []),
      {
        $group: {
          _id: '$student',
          avgGrade: { $avg: '$grade' }
        }
      },
      {
        $bucket: {
          groupBy: '$avgGrade',
          boundaries: [0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);
    // Pass/Fail rate
    const passFailStats = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      ...(majorCode ? [{ $match: { 'studentInfo.majorCode': majorCode } }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $gte: ['$grade', 1.0] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $lt: ['$grade', 1.0] }, 1, 0] } }
        }
      }
    ]);
    // Average by subject
    const avgBySubject = await ClassEnrollment.aggregate([
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: {
          from: 'classsections',
          localField: 'classSection',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'classInfo.subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: '$subjectInfo' },
      {
        $group: {
          _id: '$subjectInfo.code',
          name: { $first: '$subjectInfo.name' },
          avgScore: { $avg: '$grade' },
          minScore: { $min: '$grade' },
          maxScore: { $max: '$grade' },
          totalStudents: { $sum: 1 }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);
    return {
      gpaDistribution: this.formatGPADistribution(gpaDistribution),
      passRate: passFailStats[0] ? {
        passed: passFailStats[0].passed,
        failed: passFailStats[0].failed,
        rate: ((passFailStats[0].passed / passFailStats[0].total) * 100).toFixed(2)
      } : null,
      avgBySubject
    };
  }
  /**
   * GPA Distribution (Histogram)
   */
  async getGPADistribution(filters = {}) {
    const { majorCode, cohort } = filters;
    const pipeline = [
      { $match: { isFinalized: true, grade: { $exists: true } } },
      {
        $lookup: { from: 'classsections', localField: 'classSection', foreignField: '_id', as: 'classInfo' }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$student',
          avgGrade: { $avg: '$grade' }
        }
      },
      {
        $bucket: {
          groupBy: '$avgGrade',
          boundaries: [0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ];