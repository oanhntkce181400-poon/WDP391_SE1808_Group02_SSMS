import axiosClient from './axiosClient';

const wishlistService = {
  // Lấy danh sách wishlist của sinh viên hiện tại
  getMyWishlist() {
    return axiosClient.get('/wishlist/my-wishlist');
  },

  // Tạo một yêu cầu wishlist mới
  createWishlist(data) {
    return axiosClient.post('/wishlist', data);
  },

  // Lấy chi tiết hạn chế cho một semester (xem có thể yêu cầu bao nhiêu môn)
  getSemesterBreakdown(semesterId) {
    return axiosClient.get(`/wishlist/semester/${semesterId}/breakdown`);
  },

  // Lấy tất cả wishlist request của một semester (admin only)
  getWishlistBySemester(semesterId, params = {}) {
    return axiosClient.get(`/wishlist/semester/${semesterId}`, { params });
  },

  // Xóa/hủy một yêu cầu wishlist (nếu còn pending)
  deleteWishlist(wishlistId) {
    return axiosClient.delete(`/wishlist/${wishlistId}`);
  },
};

export default wishlistService;
