import axiosClient from './axiosClient';

const attendanceService = {
  getClasses: () => axiosClient.get('/attendance/classes'),

  getClassSlots: (classId) => axiosClient.get(`/attendance/classes/${classId}/slots`),

  getSlotAttendance: (classId, slotId) =>
    axiosClient.get(`/attendance/classes/${classId}/slots/${encodeURIComponent(slotId)}`),

  markAttendance: (payload) => axiosClient.post('/attendance/mark', payload),
  bulkSave: (payload) => axiosClient.post('/attendance/mark', payload),
};

export default attendanceService;
