import axiosClient from './axiosClient';

const scheduleService = {
<<<<<<< HEAD
  // Lấy lịch học của sinh viên hiện tại (theo tuần)
  getMySchedule: (weekStart) => 
    axiosClient.get('/schedules/my', { params: { weekStart } }),

=======
>>>>>>> main
  // Lấy tất cả lịch học của một lớp
  getClassSchedules: (classId) => axiosClient.get(`/classes/${classId}/schedules`),

  // Gán lịch học cho lớp
  assignSchedule: (classId, scheduleData) => axiosClient.post(`/classes/${classId}/schedules`, scheduleData),

  // Cập nhật lịch học
  updateSchedule: (classId, scheduleId, scheduleData) => 
    axiosClient.put(`/classes/${classId}/schedules/${scheduleId}`, scheduleData),

  // Xóa lịch học
  deleteSchedule: (classId, scheduleId) => 
    axiosClient.delete(`/classes/${classId}/schedules/${scheduleId}`),

  // Kiểm tra xung đột lịch học
  checkConflict: (classId, data) => 
    axiosClient.post(`/classes/${classId}/schedules/check-conflict`, data),

  // Công bố lịch học
  publishSchedule: (classId) => 
    axiosClient.post(`/classes/${classId}/schedules/publish`),

  // Khóa lịch học
  lockSchedule: (classId) => 
    axiosClient.post(`/classes/${classId}/schedules/lock`),
};

export default scheduleService;
