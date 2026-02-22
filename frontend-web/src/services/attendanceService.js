import axiosClient from './axiosClient';

const attendanceService = {
  getClasses: () => axiosClient.get('/attendance/classes'),

  getClassSlots: (classId) => axiosClient.get(`/attendance/classes/${classId}/slots`),

  getSlotAttendance: (classId, slotId) =>
    axiosClient.get(`/attendance/classes/${classId}/slots/${encodeURIComponent(slotId)}`),

  bulkSave: (payload) => axiosClient.post('/attendance/bulk', payload),
};

export default attendanceService;
