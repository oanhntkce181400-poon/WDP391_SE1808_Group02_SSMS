import axiosClient from './axiosClient';

const academicCalendarService = {
  getEvents(year) {
    return axiosClient.get('/academic-calendar', {
      params: { year },
    });
  },
};

export default academicCalendarService;
