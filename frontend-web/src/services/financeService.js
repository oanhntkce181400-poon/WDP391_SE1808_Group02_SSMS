import axiosClient from './axiosClient';

const financeService = {
  getMyTuitionSummary(semesterId = null) {
    const params = semesterId ? { semesterId } : {};
    return axiosClient.get('/finance/tuition/me', { params });
  },
};

export default financeService;
