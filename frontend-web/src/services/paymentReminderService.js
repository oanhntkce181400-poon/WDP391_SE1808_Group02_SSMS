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
