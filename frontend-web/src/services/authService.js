import axiosClient from './axiosClient';

const authService = {
  login(data) {
    return axiosClient.post('/auth/login', data);
  },
  logout() {
    return axiosClient.post('/auth/logout');
  },
};

export default authService;
