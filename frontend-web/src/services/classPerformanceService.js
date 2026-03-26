import axiosClient from './axiosClient';

const classPerformanceService = {
  getAccessibleClasses: () => axiosClient.get('/attendance/classes'),
  getClassPerformance: (classId) =>
    axiosClient.get(`/class-sections/${classId}/performance`),
};

export default classPerformanceService;
