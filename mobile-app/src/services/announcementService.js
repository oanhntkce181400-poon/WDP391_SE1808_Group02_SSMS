import axiosClient from './axiosClient';

const announcementService = {
  getActiveAnnouncements(params = {}) {
    return axiosClient.get('/announcements/active', { params });
  },

  getAnnouncementById(id) {
    return axiosClient.get(`/announcements/${id}`);
  },
};

export default announcementService;
