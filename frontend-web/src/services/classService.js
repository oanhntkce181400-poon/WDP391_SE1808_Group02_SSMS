import axiosClient from './axiosClient';

const classService = {
  getAllClasses: (params) => axiosClient.get('/classes', { params }),

  getClassById: (classId) => axiosClient.get(`/classes/${classId}`),

  getClassEnrollments: (classId) => axiosClient.get(`/classes/${classId}/enrollments`),

  getStudentEnrollments: (studentId, status) => {
    const params = status ? { status } : {};
    return axiosClient.get(`/classes/student/${studentId}/enrollments`, { params });
  },

  createClass: (classData) => axiosClient.post('/classes', classData),

  updateClass: (classId, updates) => axiosClient.patch(`/classes/${classId}`, updates),

  deleteClass: (classId) => axiosClient.delete(`/classes/${classId}`),

  enrollStudent: (classId, studentId) =>
    axiosClient.post('/classes/enrollment/create', { classId, studentId }),

  dropCourse: (enrollmentId) => axiosClient.post(`/classes/enrollment/${enrollmentId}/drop`),

  // Check schedule conflict
  checkConflict: (data) => axiosClient.post('/classes/check-conflict', data),

  // Bulk update status
  bulkUpdateStatus: (ids, status) => axiosClient.patch('/classes/bulk-status', { ids, status }),

  // Reassign class - chuyển sinh viên giữa các lớp
  reassignClass: (data) => axiosClient.post('/classes/reassign', data),

  // Student tự đăng ký lớp
  selfEnroll: (classId) => axiosClient.post(`/classes/${classId}/self-enroll`),
};

export default classService;
