import axiosClient from './axiosClient';

// PayOS Service - Frontend API calls
const payosService = {
  // Tạo link thanh toán PayOS
  createPaymentLink(data) {
    return axiosClient.post('/payment/create', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // Lấy thông tin đơn hàng theo orderCode
  getOrder(orderCode) {
    return axiosClient.get(`/payment/order/${orderCode}`);
  },

  // Lấy danh sách ngân hàng (proxy qua backend để tránh CORS)
  getListBank() {
    return axiosClient.get('/payment/banks');
  },

  // Hủy đơn hàng
  cancelOrder(orderCode) {
    return axiosClient.post(`/payment/order/${orderCode}/cancel`);
  },

  // Lấy lịch sử giao dịch của sinh viên
  getMyTransactions() {
    return axiosClient.get('/payment/transactions/me');
  },

  // Lấy lịch sử giao dịch của tất cả sinh viên (admin)
  getAllTransactions(params = {}) {
    return axiosClient.get('/payment/transactions', { params });
  },
};

export default payosService;
