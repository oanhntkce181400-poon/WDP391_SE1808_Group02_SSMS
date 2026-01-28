import axiosClient from './axiosClient';

const majorService = {
  getMajors(params) {
    return axiosClient.get('/api/majors', { params });
  },

  createMajor(data) {
    return axiosClient.post('/api/majors', data);
  },

  updateMajor(id, data) {
    return axiosClient.put(`/api/majors/${id}`, data);
  },

  deleteMajor(id) {
    return axiosClient.delete(`/api/majors/${id}`);
  },

  exportMajors(params) {
    return axiosClient.get('/api/majors/export', {
      params,
      responseType: 'blob',
    });
  },
};

export default majorService;
