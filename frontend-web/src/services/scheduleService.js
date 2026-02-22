import axiosClient from './axiosClient';

const scheduleService = {
  getMySchedule: (weekStart) => axiosClient.get(`/schedules/me?weekStart=${weekStart}`),
};

export default scheduleService;
