import axiosClient from './axiosClient';

const authService = {
  login(data) {
    return axiosClient.post('/auth/login', data);
  },
};

export default authService;
