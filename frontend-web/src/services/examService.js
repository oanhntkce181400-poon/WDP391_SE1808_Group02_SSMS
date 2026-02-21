import axiosClient from './axiosClient';

const examService = {
  // Get my exam schedule (for students)
  getMyExams: (params = {}) => {
    return axiosClient.get('/exams/me', { params });
  },

  // Get all exams (for admin)
  getAllExams: (params = {}) => {
    return axiosClient.get('/exams', { params });
  },

  // Get single exam by ID
  getExamById: (id) => {
    return axiosClient.get(`/exams/${id}`);
  },

  // Create new exam (for admin)
  createExam: (data) => {
    return axiosClient.post('/exams', data);
  },

  // Update exam (for admin)
  updateExam: (id, data) => {
    return axiosClient.patch(`/exams/${id}`, data);
  },

  // Delete exam (for admin)
  deleteExam: (id) => {
    return axiosClient.delete(`/exams/${id}`);
  },

  // Add students to exam
  addStudentsToExam: (examId, data) => {
    return axiosClient.post(`/exams/${examId}/add-students`, data);
  },
};

export default examService;
