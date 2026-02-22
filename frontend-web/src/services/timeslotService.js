import axiosClient from './axiosClient';

const timeslotService = {
  getTimeslots(params) {
    return axiosClient.get('/api/timeslots', { params });
  },
  getTimeslot(id) {
    return axiosClient.get(`/api/timeslots/${id}`);
  },
  createTimeslot(data) {
    return axiosClient.post('/api/timeslots', data);
  },
  updateTimeslot(id, data) {
    return axiosClient.put(`/api/timeslots/${id}`, data);
  },
  deleteTimeslot(id) {
    return axiosClient.delete(`/api/timeslots/${id}`);
  },
  searchTimeslots(keyword) {
    return axiosClient.get('/api/timeslots/search', { params: { keyword } });
  },
};

export default timeslotService;
