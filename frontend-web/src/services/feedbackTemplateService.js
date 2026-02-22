// Feedback Template Service - API calls for Feedback Template CRUD operations
import axiosClient from './axiosClient';

const feedbackTemplateService = {
  // Get all feedback templates with optional pagination and filters
  getFeedbackTemplates(params) {
    return axiosClient.get('/feedback-templates', { params });
  },

  // Get single feedback template by ID
  getFeedbackTemplate(id) {
    return axiosClient.get(`/feedback-templates/${id}`);
  },

  // Get active feedback templates
  getActiveFeedbackTemplates() {
    return axiosClient.get('/feedback-templates/active');
  },

  // Create new feedback template
  createFeedbackTemplate(data) {
    return axiosClient.post('/feedback-templates', data);
  },

  // Update existing feedback template
  updateFeedbackTemplate(id, data) {
    return axiosClient.patch(`/feedback-templates/${id}`, data);
  },

  // Delete feedback template
  deleteFeedbackTemplate(id) {
    return axiosClient.delete(`/feedback-templates/${id}`);
  },

  // Add question to template
  addQuestion(templateId, questionData) {
    return axiosClient.post(`/feedback-templates/${templateId}/questions`, questionData);
  },

  // Remove question from template
  removeQuestion(templateId, questionId) {
    return axiosClient.delete(`/feedback-templates/${templateId}/questions/${questionId}`);
  },

  // Update question in template
  updateQuestion(templateId, questionId, questionData) {
    return axiosClient.patch(`/feedback-templates/${templateId}/questions/${questionId}`, questionData);
  },

  // Change feedback template status
  changeStatus(id, status) {
    return axiosClient.patch(`/feedback-templates/${id}/status`, { status });
  },
};

export default feedbackTemplateService;
