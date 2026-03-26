import axiosClient from './axiosClient';

const scheduleService = {
  getMySchedule: (weekStart) => axiosClient.get('/schedules/me', { params: { weekStart } }),
  getMyWeekSchedule: (weekStart) => axiosClient.get('/schedules/me', { params: { weekStart } }),
};

export default scheduleService;
