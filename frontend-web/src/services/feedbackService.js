import axiosClient from './axiosClient';

const feedbackService = {
  /*
   * Student flow starts from the enrolled-class list, because feedback is only
   * valid for classes the current student has actually joined.
   */
  getMyClasses() {
    return axiosClient.get('/classes/my-classes');
  },

  /*
   * Admin/staff feedback view must see the full class catalog, not just the
   * narrower `/classes/list` subset used elsewhere. We page through `/classes`
   * and flatten all rows so the feedback UI can browse every class section.
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

  submitFeedback(data) {
    return axiosClient.post('/feedbacks', data);
  },

  getClassFeedback(classSectionId) {
    return axiosClient.get(`/feedbacks/class/${classSectionId}`);
  },

  getClassFeedbackStats(classSectionId) {
    return axiosClient.get(`/feedbacks/class/${classSectionId}/stats`);
  },

  getMyFeedback() {
    return axiosClient.get('/feedbacks/my-feedbacks');
  },

  getFeedbackAvailability() {
    return axiosClient.get('/feedbacks/availability');
  },

  updateFeedback(feedbackId, data) {
    return axiosClient.put(`/feedbacks/${feedbackId}`, data);
  },

  getFeedbackWindowInfo(feedbackId) {
    return axiosClient.get(`/feedbacks/${feedbackId}/window`);
  },

  approveFeedback(feedbackId) {
    return axiosClient.patch(`/feedbacks/${feedbackId}/approve`);
  },

  rejectFeedback(feedbackId, reason) {
    return axiosClient.patch(`/feedbacks/${feedbackId}/reject`, { reason });
  },

  deleteFeedback(feedbackId) {
    return axiosClient.delete(`/feedbacks/${feedbackId}`);
  },

  getPendingFeedback(limit = 20, skip = 0) {
    return axiosClient.get('/feedbacks/pending', {
      params: { limit, skip },
    });
  },
};

export default feedbackService;
