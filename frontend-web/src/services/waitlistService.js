import axiosClient from './axiosClient';

const waitlistService = {
  /**
   * Join waitlist - Sinh viên đăng ký vào danh sách chờ
   * @param {string} subjectId - ID của môn học
   * @param {number} targetSemester - Kỳ học dự kiến (1, 2, 3)
   * @param {string} targetAcademicYear - Năm học dự kiến (VD: "2025-2026")
   */
  joinWaitlist: (data) => axiosClient.post('/waitlist', data),

  /**
   * Get my waitlist - Lấy danh sách waitlist của sinh viên hiện tại
   */
  getMyWaitlist: () => axiosClient.get('/waitlist/my'),

  /**
   * Cancel waitlist - Hủy waitlist của chính mình
   * @param {string} waitlistId - ID của waitlist
   * @param {string} reason - Lý do hủy (optional)
   */
  cancelWaitlist: (waitlistId, reason) => 
    axiosClient.delete(`/waitlist/${waitlistId}`, { data: { reason } }),

  /**
   * Get all waitlist - Lấy danh sách tất cả waitlist (Admin)
   * @param {object} params - Query params
   */
  getAllWaitlist: (params) => axiosClient.get('/waitlist/admin/all', { params }),

  /**
   * Delete waitlist - Xóa waitlist (Admin)
   * @param {string} waitlistId - ID của waitlist
   */
  deleteWaitlist: (waitlistId) => axiosClient.delete(`/waitlist/${waitlistId}/admin`),
};

export default waitlistService;
