import axiosClient from './axiosClient';

const attendanceService = {
  getMyAttendance: (params = {}) => axiosClient.get('/attendance/my-attendance', { params }),
};

export default attendanceService;
