import axiosClient from './axiosClient';

const requestService = {
  getMyRequests() {
    return axiosClient.get('/requests/me');
  },

  getRequestById(id) {
    return axiosClient.get(`/requests/${id}`);
  },
};

export default requestService;
