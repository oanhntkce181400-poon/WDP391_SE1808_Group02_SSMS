// Curriculum Service - API calls for Curriculum CRUD operations
import axiosClient from './axiosClient';

const curriculumService = {
  // Get all curriculum frameworks
  getCurriculums(params) {
    return axiosClient.get('/api/curriculums', { params });
  },

  // Get single curriculum by ID
  getCurriculum(id) {
    return axiosClient.get(`/api/curriculums/${id}`);
  },

  // Create new curriculum
  createCurriculum(data) {
    return axiosClient.post('/api/curriculums', data);
  },

  // Update existing curriculum
  updateCurriculum(id, data) {
    return axiosClient.put(`/api/curriculums/${id}`, data);
  },

  // Delete curriculum
  deleteCurriculum(id) {
    return axiosClient.delete(`/api/curriculums/${id}`);
  },

  // Update curriculum semesters (courses in each semester)
  updateCurriculumSemesters(id, semesters) {
    return axiosClient.put(`/api/curriculums/${id}/semesters`, { semesters });
  },

  // Get curriculum semesters
  getCurriculumSemesters(id) {
    return axiosClient.get(`/api/curriculums/${id}/semesters`);
  },
};

export default curriculumService;

