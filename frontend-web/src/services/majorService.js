import axiosClient from './axiosClient';

const majorService = {
  getMajors(params) {
    return axiosClient.get('/api/majors', { params });
  },
};

export default majorService;
