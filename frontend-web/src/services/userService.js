import axiosClient from './axiosClient';

const userService = {
  importUsers(formData) {
    return axiosClient.post('/users/import', formData);
  },
  getUsers(params) {
    return axiosClient.get('/users', { params });
  },
};

export default userService;
