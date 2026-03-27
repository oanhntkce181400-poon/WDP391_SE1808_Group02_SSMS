import axiosClient from './axiosClient';

const classService = {
  getAllClasses: (params) => axiosClient.get('/classes', { params }),

  getClassById: (classId) => axiosClient.get(`/classes/${classId}`),

  getClassEnrollments: (classId, params = {}) =>
    axiosClient.get(`/classes/${classId}/enrollments`, { params }),

  getStudentEnrollments: (studentId, status) => {
    const params = status ? { status } : {};
    return axiosClient.get(`/classes/student/${studentId}/enrollments`, { params });
  },

  createClass: (classData) => axiosClient.post('/classes', classData),

  updateClass: (classId, updates) => axiosClient.patch(`/classes/${classId}`, updates),

  assignLecturer: (classId, lecturerId) =>
    axiosClient.patch(`/class-sections/${classId}/assign-lecturer`, { lecturerId }),

  deleteClass: (classId) => axiosClient.delete(`/classes/${classId}`),

  enrollStudent: (classId, studentId) =>
    axiosClient.post('/classes/enrollment/create', { classId, studentId }),

  dropCourse: (enrollmentId) => axiosClient.post(`/classes/enrollment/${enrollmentId}/drop`),

  // Check schedule conflict
  checkConflict: (data) => axiosClient.post('/classes/check-conflict', data),

  // Bulk update status
  bulkUpdateStatus: (ids, status) => axiosClient.patch('/classes/bulk-status', { ids, status }),

   // Student tự đăng ký lớp
   selfEnroll: (classId) => axiosClient.post(`/classes/${classId}/self-enroll`),
   // UC22 - Search Available Classes
   searchClasses: (params) => axiosClient.get('/classes/search', { params }),

   // UC39 - View Class List with Capacity
   getClassList: () => axiosClient.get('/classes/list'),
  // UC99 - View Class Roster (student)
  getClassRoster: (classId) => axiosClient.get(`/class-sections/${classId}/students`),
   // Get class details for student - xem chi tiết lớp học phần
  getClassDetails: (classId) => axiosClient.get(`/classes/${classId}/details`),
  // Reassign class - chuyển sinh viên giữa các lớp
  reassignClass: (data) => axiosClient.post('/classes/reassign', data),

  // Bulk create class sections from curriculum
  bulkCreate: (classes) => axiosClient.post('/classes/bulk-create', { classes }),

  // Bulk create class sections from curriculum with classGroup
  bulkCreateFromCurriculum: (data) => axiosClient.post('/classes/bulk-create-from-curriculum', data),

  // Bulk assign classGroup to multiple existing class sections
  bulkAssignGroup: (data) => axiosClient.post('/classes/bulk-assign-group', data),

  // Get distinct classGroups for filtering
  getClassGroups: (params) => axiosClient.get('/classes/groups', { params }),

  /** Nhóm lớp + các lớp học phần (môn, GV) trong nhóm */
  getClassGroupsOverview: (params) =>
    axiosClient.get('/classes/groups/overview', { params }),
};

export default classService;
