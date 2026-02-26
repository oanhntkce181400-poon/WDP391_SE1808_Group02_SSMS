import axiosClient from './axiosClient';

/**
 * Service xử lý API calls cho Announcements
 */
const announcementService = {
  /**
   * Lấy danh sách announcements (Admin/Staff)
   * @param {Object} params - { page, limit, category, status, search }
   */
  getAnnouncements(params) {
    return axiosClient.get('/announcements', { params });
  },

  /**
   * Lấy announcements active cho student
   * @param {Object} params - { page, limit, category }
   */
  getActiveAnnouncements(params) {
    return axiosClient.get('/announcements/active', { params });
  },

  /**
   * Lấy chi tiết một announcement
   * @param {String} id - Announcement ID
   */
  getAnnouncement(id) {
    return axiosClient.get(`/announcements/${id}`);
  },

  /**
   * Tạo announcement mới (Admin/Staff)
   * @param {FormData} formData - Form data chứa title, category, content, file
   */
  createAnnouncement(formData) {
    return axiosClient.post('/announcements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Cập nhật announcement (Admin/Staff)
   * @param {String} id - Announcement ID
   * @param {FormData} formData - Form data chứa title, category, content, file
   */
  updateAnnouncement(id, formData) {
    return axiosClient.put(`/announcements/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Xóa announcement (soft delete - Admin/Staff)
   * @param {String} id - Announcement ID
   */
  deleteAnnouncement(id) {
    return axiosClient.delete(`/announcements/${id}`);
  },
};

export default announcementService;
