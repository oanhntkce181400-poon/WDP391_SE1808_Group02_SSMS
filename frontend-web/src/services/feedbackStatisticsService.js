import axiosClient from './axiosClient';

const feedbackStatisticsService = {
  /**
   * Lấy thống kê giáo viên
   */
  getTeacherStatistics: (teacherId) => {
    return axiosClient.get(`/feedback-statistics/teacher/${teacherId}`);
  },

  /**
   * Lấy thống kê template
   */
  getTemplateStatistics: (templateId) => {
    return axiosClient.get(`/feedback-statistics/template/${templateId}`);
  },

  /**
   * Lấy top N giáo viên có GPA cao nhất
   */
  getTeacherComparison: (limit = 10) => {
    return axiosClient.get(`/feedback-statistics/teachers/top`, {
      params: { limit }
    });
  },

  /**
   * Lấy thống kê theo khoảng thời gian
   */
  getStatisticsByDateRange: (startDate, endDate) => {
    return axiosClient.get(`/feedback-statistics/range`, {
      params: {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      }
    });
  },

  /**
   * Phân tích câu hỏi cụ thể
   */
  analyzeQuestion: (templateId, questionId) => {
    return axiosClient.get(`/feedback-statistics/question/${templateId}/${questionId}`);
  },

  /**
   * Gửi đánh giá
   */
  submitFeedback: (data) => {
    return axiosClient.post(`/feedback-submissions`, data);
  }
};

export default feedbackStatisticsService;
