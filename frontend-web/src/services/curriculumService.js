import axiosClient from './axiosClient';

const curriculumService = {
  getCurriculums(params) {
    return axiosClient.get('/curriculums', { params });
  },
  getCurriculum(id) {
    return axiosClient.get(`/curriculums/${id}`);
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
  updateCurriculumSemesters(id, semesters) {
    return axiosClient.put(`/curriculums/${id}/semesters`, { semesters });
  },
  getCurriculumSemesters(id) {
    return axiosClient.get(`/curriculums/${id}/semesters`);
  },
};

export default curriculumService;

