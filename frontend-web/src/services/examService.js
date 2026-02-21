import axiosClient from './axiosClient';

const examService = {
  /**
   * Get all exams for current student
   * Returns exam schedule based on enrolled classes
   */
  getMyExams: () => {
    return axiosClient.get('/exams/me');
  },

  /**
   * Get exam details by exam ID
   */
  getExamDetails: (examId) => {
    return axiosClient.get(`/exams/${examId}`);
  },

  /**
   * Admin: Create new exam
   */
  createExam: (examData) => {
    return axiosClient.post('/exams', examData);
  },

  /**
   * Admin: Update exam
   */
  updateExam: (examId, updates) => {
    return axiosClient.patch(`/exams/${examId}`, updates);
  },

  /**
   * Admin: Delete exam
   */
  deleteExam: (examId) => {
    return axiosClient.delete(`/exams/${examId}`);
  },

  /**
   * Admin: Register student for exam (assign SBD)
   */
  registerStudentForExam: (examId, registrationData) => {
    return axiosClient.post(`/exams/${examId}/register-student`, registrationData);
  },
};

export default examService;
