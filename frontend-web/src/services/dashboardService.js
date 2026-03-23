import axiosClient from './axiosClient';

/*
 * A dedicated service keeps the admin dashboard page focused on presentation.
 * That page only needs one analytics endpoint, so this wrapper stays intentionally small.
 */
const dashboardService = {
  // Single-purpose analytics call used by the admin dashboard cards.
  getStats() {
    return axiosClient.get('/dashboard/stats');
  },
};

export default dashboardService;
