import axiosClient from './axiosClient';

const academicCalendarService = {
  getEvents(params = {}) {
    return axiosClient.get('/academic-calendar', { params });
  },

  createEvent(payload) {
    return axiosClient.post('/academic-calendar', payload);
  },

  updateEvent(id, payload) {
    return axiosClient.patch(`/academic-calendar/${id}`, payload);
  },

  deleteEvent(id) {
    return axiosClient.delete(`/academic-calendar/${id}`);
  },
};

export default academicCalendarService;
