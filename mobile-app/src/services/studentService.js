import axiosClient from './axiosClient';

const studentService = {
  getMyProfile() {
    return axiosClient.get('/students/me');
  },
};

export default studentService;
