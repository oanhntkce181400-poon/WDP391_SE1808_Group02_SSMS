import axiosClient from './axiosClient';

const authService = {
  loginWithGoogle(idToken) {
    return axiosClient.post('/auth/google', { idToken });
  },
  loginWithPassword(email, password) {
    return axiosClient.post('/auth/login', { email, password });
  },
  me() {
    return axiosClient.get('/auth/me');
  },
  refresh() {
    return axiosClient.post('/auth/refresh');
  },
  logout() {
    return axiosClient.post('/auth/logout');
  },
  forgotPassword(email) {
    return axiosClient.post('/auth/forgot-password', { email });
  },
  resetPassword(email, otp, newPassword) {
    return axiosClient.post('/auth/reset-password', { email, otp, newPassword });
  },
  getSessions() {
    return axiosClient.get('/auth/sessions');
  },
  logoutAllSessions() {
    return axiosClient.post('/auth/sessions/logout-all');
  },
  revokeSession(familyId) {
    return axiosClient.post(`/auth/sessions/${familyId}/revoke`);
  },
  getLoginHistory(limit = 50) {
    return axiosClient.get('/auth/login-history', { params: { limit } });
  },
};

export default authService;
