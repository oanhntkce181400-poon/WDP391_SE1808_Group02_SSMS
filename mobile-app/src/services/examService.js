import axiosClient from './axiosClient';

const examService = {
  getMyExams: () => axiosClient.get('/student-exams/my-exams'),
};

export default examService;