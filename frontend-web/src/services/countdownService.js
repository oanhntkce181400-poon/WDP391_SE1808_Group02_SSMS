import axiosClient from './axiosClient';

const countdownService = {
  /**
   * Lấy thông tin countdown deadline thanh toán
   */
  getFeeCountdown: async () => {
    const response = await axiosClient.get('/finance/countdown');
    return response.data;
  },

  /**
   * Lấy tất cả deadline (cho admin)
   */
  getAllDeadlines: async () => {
    const response = await axiosClient.get('/finance/countdown/all');
    return response.data;
  }
};

export default countdownService;
