import axiosClient from './axiosClient';

const wishlistService = {
  createWishlist: (payload) => axiosClient.post('/wishlist', payload),

  getMyWishlist: () => axiosClient.get('/wishlist/my-wishlist'),

  getSemesterBreakdown: (semesterId, params = {}) =>
    axiosClient.get(`/wishlist/semester/${semesterId}/breakdown`, { params }),

  getWishlistBySemester: (semesterId, params = {}) =>
    axiosClient.get(`/wishlist/semester/${semesterId}`, { params }),

  approveWishlist: (wishlistId, payload = {}) =>
    axiosClient.patch(`/wishlist/${wishlistId}/approve`, payload),

  rejectWishlist: (wishlistId, payload = {}) =>
    axiosClient.patch(`/wishlist/${wishlistId}/reject`, payload),
};

export default wishlistService;
