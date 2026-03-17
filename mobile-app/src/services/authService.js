import axiosClient from './axiosClient';

const authService = {
  login(data) {
    return axiosClient.post('/auth/login', data);
  },

  refresh(refreshToken) {
    return axiosClient.post('/auth/refresh', { refreshToken });
  },

  logout(refreshToken) {
    return axiosClient.post('/auth/logout', { refreshToken });
  },
};

export default authService;
