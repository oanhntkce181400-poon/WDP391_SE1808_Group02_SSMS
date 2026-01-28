import axiosClient from './axiosClient';

const majorService = {
  // Get all majors with pagination and filters
  getMajors(params = {}) {
    return axiosClient.get('/api/majors', { params });
  },

  // Get a single major by ID
  getMajorById(id) {
    return axiosClient.get(`/api/majors/${id}`);
  },

  // Create a new major
  createMajor(data) {
    return axiosClient.post('/api/majors', data);
  },

  // Update an existing major
  updateMajor(id, data) {
    return axiosClient.put(`/api/majors/${id}`, data);
  },

  // Delete a major
  deleteMajor(id) {
    return axiosClient.delete(`/api/majors/${id}`);
  },

  // Export majors to Excel
  exportMajors(params = {}) {
    return axiosClient.get('/api/majors/export', {
      params,
      responseType: 'blob',
    });
  },
};

export default majorService;
