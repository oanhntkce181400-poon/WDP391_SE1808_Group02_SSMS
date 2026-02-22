import axiosClient from './axiosClient';

const examService = {
  getMyExams: () => axiosClient.get('/exams/me'),

  getExamDetails: (examId) => axiosClient.get(`/exams/${examId}`),

  createExam: (examData) => axiosClient.post('/exams', examData),

  updateExam: (examId, updates) => axiosClient.patch(`/exams/${examId}`, updates),

  deleteExam: (examId) => axiosClient.delete(`/exams/${examId}`),

  registerStudentForExam: (examId, registrationData) =>
    axiosClient.post(`/exams/${examId}/register-student`, registrationData),
};

export default examService;
