import axiosClient from './axiosClient';
import payosService from './payosService';

const financeService = {
  getMyTuitionSummary(semesterId = null) {
    const params = semesterId ? { semesterId } : {};
    return axiosClient.get('/finance/tuition/me', { params });
  },

  // Lịch sử giao dịch của sinh viên
  getMyTransactions() {
    return payosService.getMyTransactions();
  },

  // Tạo link thanh toán PayOS
  createPayment(data) {
    return payosService.createPaymentLink(data);
  },

  // Lấy thông tin đơn hàng
  getOrder(orderCode) {
    return payosService.getOrder(orderCode);
  },

  // Lấy tất cả giao dịch (admin)
  getAllTransactions(params = {}) {
    return payosService.getAllTransactions(params);
  },

  // Xác nhận thanh toán PayOS và lưu vào DB
  confirmPayment(data) {
    return axiosClient.post('/finance/payments/confirm', data);
  },

  // Lấy lịch sử thanh toán của sinh viên
  getPaymentHistory(semesterId = null) {
    const params = semesterId ? { semesterId } : {};
    return axiosClient.get('/finance/payments/history', { params });
  },

  // Tổng hợp thanh toán của tất cả sinh viên (admin)
  getAllStudentsPaymentSummary(params = {}) {
    return axiosClient.get('/finance/payments/all-students', { params });
  },
};

export default financeService;
