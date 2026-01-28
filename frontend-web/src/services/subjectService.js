// Subject Service - API calls for Subject CRUD operations
import axiosClient from './axiosClient';

const subjectService = {
  // Get all subjects with optional pagination and filters
  getSubjects(params) {
    return axiosClient.get('/api/subjects', { params });
  },

  // Get single subject by ID
  getSubject(id) {
    return axiosClient.get(`/api/subjects/${id}`);
  },

  // Create new subject
  createSubject(data) {
    return axiosClient.post('/api/subjects', data);
  },

  // Update existing subject
  updateSubject(id, data) {
    return axiosClient.put(`/api/subjects/${id}`, data);
  },

  // Delete subject
  deleteSubject(id) {
    return axiosClient.delete(`/api/subjects/${id}`);
  },

  // Search subjects by code or name
  searchSubjects(keyword) {
    return axiosClient.get('/api/subjects/search', { params: { keyword } });
  },

  // Export subjects to Excel
  exportSubjects() {
    return axiosClient.get('/api/subjects/export', { responseType: 'blob' });
  },

  // Import subjects from Excel
  importSubjects(formData) {
    return axiosClient.post('/api/subjects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Update subject prerequisites
  updatePrerequisites(id, prerequisites) {
    return axiosClient.put(`/api/subjects/${id}/prerequisites`, { prerequisites });
  },

  // Get subject prerequisites
  getPrerequisites(id) {
    return axiosClient.get(`/api/subjects/${id}/prerequisites`);
  },
};

export default subjectService;

