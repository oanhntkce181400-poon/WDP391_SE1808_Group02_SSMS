import axiosClient from './axiosClient';

const feedbackService = {
  /**
   * Submit feedback for a class
   */
  submitFeedback: (data) => {
    return axiosClient.post('/feedbacks', data);
  },

  /**
   * Get feedbacks for a specific class
   */
  getClassFeedback: (classSectionId, status = 'approved') => {
    return axiosClient.get(`/feedbacks/class/${classSectionId}`, {
      params: { status }
    });
  },

  /**
   * Get feedback statistics for a class
   */
  getClassFeedbackStats: (classSectionId) => {
    return axiosClient.get(`/feedbacks/class/${classSectionId}/stats`);
  },

  /**
   * Get student's own feedbacks
   */
  getMyFeedback: () => {
    return axiosClient.get('/feedbacks/my-feedbacks');
  },

  /**
   * Update feedback (student can only update if within feedback window)
   */
  updateFeedback: (feedbackId, data) => {
    return axiosClient.put(`/feedbacks/${feedbackId}`, data);
  },

  /**
   * Get feedback window info (remaining time to edit)
   */
  getFeedbackWindowInfo: (feedbackId) => {
    return axiosClient.get(`/feedbacks/${feedbackId}/window`);
  },

  /**
   * Approve feedback (admin/staff)
   */
  approveFeedback: (feedbackId) => {
    return axiosClient.patch(`/feedbacks/${feedbackId}/approve`);
  },

  /**
   * Reject feedback (admin/staff)
   */
  rejectFeedback: (feedbackId, reason) => {
    return axiosClient.patch(`/feedbacks/${feedbackId}/reject`, { reason });
  },

  /**
   * Delete feedback (admin/staff)
   */
  deleteFeedback: (feedbackId) => {
    return axiosClient.delete(`/feedbacks/${feedbackId}`);
  },

  /**
   * Get all pending feedbacks (admin/staff)
   */
  getPendingFeedback: (limit = 20, skip = 0) => {
    return axiosClient.get('/feedbacks/pending', {
      params: { limit, skip }
    });
  }
};

export default feedbackService;
