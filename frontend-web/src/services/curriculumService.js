import axiosClient from './axiosClient';

const curriculumService = {
  // Curriculum CRUD
  getCurriculums(params) {
    return axiosClient.get('/curriculums', { params });
  },
  getCurriculum(id) {
    return axiosClient.get(`/curriculums/${id}`);
  },
  getCurriculumWithDetails(id) {
    return axiosClient.get(`/curriculums/${id}/details`);
  },
  createCurriculum(data) {
    return axiosClient.post('/curriculums', data);
  },
  updateCurriculum(id, data) {
    return axiosClient.put(`/curriculums/${id}`, data);
  },
  deleteCurriculum(id) {
    return axiosClient.delete(`/curriculums/${id}`);
  },

  // Legacy endpoints (backward compatibility)
  updateCurriculumSemesters(id, semesters) {
    return axiosClient.put(`/curriculums/${id}/semesters`, { semesters });
  },
  getCurriculumSemesters(id) {
    return axiosClient.get(`/curriculums/${id}/semesters`);
  },

  // ========== NEW RELATIONAL STRUCTURE APIs ==========
  
  // Semester APIs
  getSemesters(curriculumId) {
    return axiosClient.get(`/curriculums/${curriculumId}/semesters/list`);
  },
  getSemesterWithCourses(semesterId) {
    return axiosClient.get(`/curriculums/semesters/${semesterId}`);
  },
  createSemester(curriculumId, data) {
    return axiosClient.post(`/curriculums/${curriculumId}/semesters`, data);
  },
  updateSemester(semesterId, data) {
    return axiosClient.put(`/curriculums/semesters/${semesterId}`, data);
  },
  deleteSemester(semesterId) {
    return axiosClient.delete(`/curriculums/semesters/${semesterId}`);
  },
  reorderSemesters(curriculumId, orderedIds) {
    return axiosClient.put(`/curriculums/${curriculumId}/semesters/reorder`, { orderedIds });
  },

  // Course APIs
  getCourses(semesterId) {
    return axiosClient.get(`/curriculums/semesters/${semesterId}/courses`);
  },
  addCourse(curriculumId, semesterId, data) {
    return axiosClient.post(`/curriculums/${curriculumId}/semesters/${semesterId}/courses`, data);
  },
  updateCourse(courseId, data) {
    return axiosClient.put(`/curriculums/courses/${courseId}`, data);
  },
  deleteCourse(courseId) {
    return axiosClient.delete(`/curriculums/courses/${courseId}`);
  },
  moveCourse(courseId, newSemesterId) {
    return axiosClient.put(`/curriculums/courses/${courseId}/move`, { newSemesterId });
  },
};

export default curriculumService;
