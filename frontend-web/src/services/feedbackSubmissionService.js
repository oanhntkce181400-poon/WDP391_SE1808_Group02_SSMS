import axiosClient from './axiosClient';

const feedbackSubmissionService = {
  submitFeedback(data) {
    return axiosClient.post('/feedback-submissions', data);
  },

  getMySubmissions(params) {
    return axiosClient.get('/feedback-submissions/me', { params });
  },

  getSubmissions(params) {
    return axiosClient.get('/feedback-submissions', { params });
  },

  getTemplateStatistics(templateId) {
    return axiosClient.get(`/feedback-submissions/${templateId}/statistics`);
  },

  getTeacherSummary(teacherId) {
    return axiosClient.get(`/feedback-submissions/teacher/${teacherId}/summary`);
  },
};

export default feedbackSubmissionService;
