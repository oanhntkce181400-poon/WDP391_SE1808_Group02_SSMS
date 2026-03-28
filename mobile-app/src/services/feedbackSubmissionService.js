import axiosClient from './axiosClient';

const feedbackSubmissionService = {
  submitFeedback(data) {
    return axiosClient.post('/feedback-submissions', data);
  },

  getMySubmissions(params) {
    return axiosClient.get('/feedback-submissions/me', { params });
  },
};

export default feedbackSubmissionService;
