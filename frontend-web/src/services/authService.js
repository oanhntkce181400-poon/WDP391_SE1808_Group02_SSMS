import axiosClient from './axiosClient';

const authService = {
  loginWithGoogle(idToken) {
    return axiosClient.post('/auth/google', { idToken });
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
};

export default authService;
