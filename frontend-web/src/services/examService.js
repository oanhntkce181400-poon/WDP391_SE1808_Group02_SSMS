import axiosClient from './axiosClient';

const examService = {
  // Admin: Get all exams with filtering and pagination
  getAllExams: (params) => axiosClient.get('/exams', { params }),

  getMyExams: () => axiosClient.get('/exams/me'),

  getExamDetails: (examId) => axiosClient.get(`/exams/${examId}`),

  createExam: (examData) => axiosClient.post('/exams', examData),

  updateExam: (examId, updates) => axiosClient.patch(`/exams/${examId}`, updates),

  deleteExam: (examId) => axiosClient.delete(`/exams/${examId}`),

  registerStudentForExam: (examId, registrationData) =>
    axiosClient.post(`/exams/${examId}/register-student`, registrationData),

  // Helper APIs for dropdowns
  getSubjects: (params) => axiosClient.get('/subjects', { params }),

  getRooms: (params) => axiosClient.get('/rooms', { params }),

  getTimeslots: (params) => axiosClient.get('/timeslots', { params }),

  getClassSections: (params) => axiosClient.get('/class-sections', { params }),
};

export default examService;
