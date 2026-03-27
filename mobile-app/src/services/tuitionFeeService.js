import axiosClient from './axiosClient';

const tuitionFeeService = {
  // ─── STUDENT TUITION SUMMARY ────────────────────────────────
  
  // Lấy tổng quan học phí của sinh viên đang đăng nhập
  getMyTuitionSummary(semesterId = null) {
    const params = semesterId ? { semesterId } : {};
    return axiosClient.get('/finance/tuition/me', { params });
  },

  // Lấy tất cả bills của sinh viên
  getTuitionBills(status = null) {
    const params = status ? { status } : {};
    return axiosClient.get('/finance/tuition/bills', { params });
  },

  // Lấy bill chi tiết theo kỳ
  getTuitionBill(semesterId) {
    return axiosClient.get(`/finance/tuition/bill/${semesterId}`);
  },

  // ─── PAYMENT HISTORY ────────────────────────────────────────
  
  // Lấy lịch sử thanh toán của sinh viên
  getPaymentHistory(semesterId = null) {
    const params = semesterId ? { semesterId } : {};
    return axiosClient.get('/finance/payments/history', { params });
  },

  // Lấy số tiền nộp thừa học phí
  getTuitionExcess() {
    return axiosClient.get('/finance/tuition-excess');
  },

  // ─── PAYMENT OPERATIONS ────────────────────────────────────
  
  // Xác nhận thanh toán PayOS và lưu vào DB
  confirmPayment(data) {
    return axiosClient.post('/finance/payments/confirm', data);
  },

  // ─── CURRICULUM PAYMENT ────────────────────────────────────
  
  // Lấy trạng thái thanh toán theo kỳ của khung chương trình
  getCurriculumPaymentStatus() {
    return axiosClient.get('/finance/payments/curriculum-status');
  },

  // Tạo thanh toán theo kỳ của khung chương trình
  createCurriculumPayment() {
    return axiosClient.post('/finance/payments/create-curriculum');
  },

  // ─── WALLET PAYMENT ────────────────────────────────────────
  
  // Thanh toán học phí bằng ví sinh viên
  payTuitionByWallet() {
    return axiosClient.post('/finance/payments/pay-by-wallet');
  },

  // ─── ADVANCED PAYMENT ──────────────────────────────────────
  
  // Xác nhận thanh toán và tự động đăng ký môn học
  confirmPaymentWithEnrollment(data) {
    return axiosClient.post('/finance/payments/confirm-with-enrollment', data);
  },

  // Kiểm tra nợ học phí
  checkPendingTuition(semesterId) {
    return axiosClient.get('/registrations/check-pending-tuition', { params: { semesterId } });
  },

  // ─── ADMIN OPERATIONS ──────────────────────────────────────
  
  // Tính học phí cho sinh viên theo kỳ
  calculateTuition(semesterId) {
    return axiosClient.post('/finance/tuition/calculate', { semesterId });
  },

  // Tổng hợp thanh toán của tất cả sinh viên (admin)
  getAllStudentsPaymentSummary(params = {}) {
    return axiosClient.get('/finance/payments/all-students', { params });
  },

  // Gửi email nhắc học phí cho sinh viên (admin/staff)
  remindStudentTuition(studentId, semesterCode = null) {
    return axiosClient.post('/finance/payments/remind-student', {
      studentId,
      semesterCode,
    });
  },
};

export default tuitionFeeService;
