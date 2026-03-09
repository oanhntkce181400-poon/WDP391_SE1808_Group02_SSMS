// walletService.js
import axiosClient from './axiosClient';

const walletService = {
  // Lấy thông tin ví
  getMyWallet() {
    return axiosClient.get('/wallet');
  },

  // Lấy lịch sử giao dịch
  getTransactions(params = {}) {
    return axiosClient.get('/wallet/transactions', { params });
  },

  // Tạo link nạp tiền
  createDeposit(amount) {
    return axiosClient.post('/wallet/deposit', { amount });
  },

  // Xác nhận nạp tiền
  confirmDeposit(orderCode, amount) {
    return axiosClient.post('/wallet/confirm', { orderCode, amount });
  },

  // Chuyển tiền thừa học phí vào ví
  refundTuitionExcess() {
    return axiosClient.post('/wallet/refund-tuition-excess');
  },
};

export default walletService;
