import axiosClient from './axiosClient';

const scheduleService = {
  getTeachingSchedule: (params) =>
    axiosClient.get('/lecturer/teaching-schedule', { params }),

  // Student weekly schedule
  getMySchedule: (weekStart) =>
    axiosClient.get('/schedules/me', { params: { weekStart } }),

  // Backward-compatible alias
  getMyWeekSchedule: (weekStart) =>
    axiosClient.get('/schedules/me', { params: { weekStart } }),

  // Class schedule management
  autoGenerateTimetables: (payload) =>
    axiosClient.post('/classes/schedules/auto-generate', payload),
  getGeneratedTimetables: (params) =>
    axiosClient.get('/classes/schedules/auto-generated', { params }),
  reassignGeneratedSchedule: (scheduleId, payload) =>
    axiosClient.patch(`/classes/schedules/${scheduleId}/reassign`, payload),

  getClassSchedules: (classId) => axiosClient.get(`/classes/${classId}/schedules`),
  assignSchedule: (classId, scheduleData) => axiosClient.post(`/classes/${classId}/schedules`, scheduleData),
  updateSchedule: (classId, scheduleId, scheduleData) =>
    axiosClient.put(`/classes/${classId}/schedules/${scheduleId}`, scheduleData),
  deleteSchedule: (classId, scheduleId) =>
    axiosClient.delete(`/classes/${classId}/schedules/${scheduleId}`),
  checkConflict: (classId, data) =>
    axiosClient.post(`/classes/${classId}/schedules/check-conflict`, data),
  publishSchedule: (classId) =>
    axiosClient.post(`/classes/${classId}/schedules/publish`),
  lockSchedule: (classId) =>
    axiosClient.post(`/classes/${classId}/schedules/lock`),
};

export default scheduleService;
