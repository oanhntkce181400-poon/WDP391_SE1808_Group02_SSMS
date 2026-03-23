import axiosClient from './axiosClient';

const feedbackService = {
  // Sinh viên chỉ được đánh giá các lớp mình đã học hoặc đang học.
  getMyClasses() {
    return axiosClient.get('/classes/my-classes');
  },

  /*
   * Admin/staff cần xem theo toàn bộ lớp chứ không chỉ nhóm lớp published/scheduled
   * của `/classes/list`. Vì route `/classes` có phân trang, ta gom toàn bộ các trang
   * lại thành một mảng thống nhất để màn hình feedback không bị mất lớp.
   */
  async getClassList() {
    const limit = 100;
    let page = 1;
    let totalPages = 1;
    const allClasses = [];

    do {
      const response = await axiosClient.get('/classes', {
        params: { page, limit },
      });

      const rows = response?.data?.data || [];
      const pagination = response?.data?.pagination || {};

      allClasses.push(...rows);
      totalPages = Number(pagination.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    return {
      data: {
        success: true,
        data: allClasses,
        total: allClasses.length,
      },
    };
  },

  // Feed đánh giá giảng viên theo lớp.
  getClassFeedback(classSectionId) {
    return axiosClient.get(`/feedbacks/class/${classSectionId}`);
  },

  // Thống kê nhanh để hiển thị phía trên danh sách nhận xét.
  getClassFeedbackStats(classSectionId) {
    return axiosClient.get(`/feedbacks/class/${classSectionId}/stats`);
  },

  // Danh sách đánh giá do chính sinh viên hiện tại đã gửi.
  getMyFeedback() {
    return axiosClient.get('/feedbacks/my-feedbacks');
  },

  // Metadata editability cho feedback hiện có.
  getFeedbackWindowInfo(feedbackId) {
    return axiosClient.get(`/feedbacks/${feedbackId}/window`);
  },

  submitFeedback(data) {
    return axiosClient.post('/feedbacks', data);
  },

  updateFeedback(feedbackId, data) {
    return axiosClient.put(`/feedbacks/${feedbackId}`, data);
  },
};

export default feedbackService;
