// Timeslot Service - API calls for Timeslot CRUD operations
import axiosClient from './axiosClient';

const timeslotService = {
  // Get all timeslots with optional pagination and filters
  getTimeslots(params) {
    return axiosClient.get('/api/timeslots', { params });
  },

  // Get single timeslot by ID
  getTimeslot(id) {
    return axiosClient.get(`/api/timeslots/${id}`);
  },

  // Create new timeslot
  createTimeslot(data) {
    return axiosClient.post('/api/timeslots', data);
  },

  // Update existing timeslot
  updateTimeslot(id, data) {
    return axiosClient.put(`/api/timeslots/${id}`, data);
  },

  // Delete timeslot
  deleteTimeslot(id) {
    return axiosClient.delete(`/api/timeslots/${id}`);
  },

  // Search timeslots by group name
  searchTimeslots(keyword) {
    return axiosClient.get('/api/timeslots/search', { params: { keyword } });
  },
};

export default timeslotService;
