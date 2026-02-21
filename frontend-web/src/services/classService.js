import axiosClient from './axiosClient';

const classService = {
  /**
   * Get all class sections
   */
  getAllClasses: (params) => {
    return axiosClient.get('/classes', { params });
  },

  /**
   * Get class section by ID
   */
  getClassById: (classId) => {
    return axiosClient.get(`/classes/${classId}`);
  },

  /**
   * Get enrollments for a specific class
   */
  getClassEnrollments: (classId) => {
    return axiosClient.get(`/classes/${classId}/enrollments`);
  },

  /**
   * Get student's course enrollments
   */
  getStudentEnrollments: (studentId, status) => {
    const params = status ? { status } : {};
    return axiosClient.get(`/classes/student/${studentId}/enrollments`, { params });
  },

  /**
   * Create new class section (Admin/Staff)
   */
  createClass: (classData) => {
    return axiosClient.post('/classes', classData);
  },

  /**
   * Update class section (Admin/Staff)
   */
  updateClass: (classId, updates) => {
    return axiosClient.patch(`/classes/${classId}`, updates);
  },

  /**
   * Delete class section (Admin/Staff)
   */
  deleteClass: (classId) => {
    return axiosClient.delete(`/classes/${classId}`);
  },

  /**
   * Enroll student in class (Admin/Staff)
   */
  enrollStudent: (classId, studentId) => {
    return axiosClient.post('/classes/enrollment/create', {
      classId,
      studentId,
    });
  },

  /**
   * Drop course
   */
  dropCourse: (enrollmentId) => {
    return axiosClient.post(`/classes/enrollment/${enrollmentId}/drop`);
  },
};

export default classService;
