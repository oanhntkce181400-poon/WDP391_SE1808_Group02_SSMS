import axiosClient from './axiosClient';

const authService = {
  login(data) {
    return axiosClient.post('/auth/login', data);
  },

  me() {
    return axiosClient.get('/auth/me');
  },

  refresh(refreshToken) {
    return axiosClient.post('/auth/refresh', { refreshToken });
  },

  forgotPassword(email) {
    return axiosClient.post('/auth/forgot-password', { email });
  },

  resetPassword(email, otp, newPassword) {
    return axiosClient.post('/auth/reset-password', { email, otp, newPassword });
  },

  logout(refreshToken) {
    return axiosClient.post('/auth/logout', { refreshToken });
  },
};

export default authService;
