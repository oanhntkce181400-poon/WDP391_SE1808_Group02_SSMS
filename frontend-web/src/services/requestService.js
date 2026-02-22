import axiosClient from './axiosClient';

const requestService = {
  getMyRequests: () => axiosClient.get('/requests/me'),

  getRequestById: (id) => axiosClient.get(`/requests/${id}`),

  createRequest: (data) => axiosClient.post('/requests', data),

  updateRequest: (id, data) => axiosClient.put(`/requests/${id}`, data),

  cancelRequest: (id) => axiosClient.post(`/requests/${id}/cancel`),

  adminGetAllRequests: (status = 'all') => {
    const params = status && status !== 'all' ? { status } : {};
    return axiosClient.get('/requests', { params });
  },

  adminReviewRequest: (id, status, staffNote = '') =>
    axiosClient.patch(`/requests/${id}/review`, { status, staffNote }),
};

export default requestService;
