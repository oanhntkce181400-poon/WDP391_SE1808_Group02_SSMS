import axiosClient from './axiosClient';

const tuitionFeeService = {
  getTuitionFees: (params) => axiosClient.get('/tuition-fees', { params }),
  getTuitionFeeById: (id) => axiosClient.get(`/tuition-fees/${id}`),
  createTuitionFee: (data) => axiosClient.post('/tuition-fees', data),
  updateTuitionFee: (id, data) => axiosClient.put(`/tuition-fees/${id}`, data),
  addDiscount: (id, discount) => axiosClient.post(`/tuition-fees/${id}/discounts`, discount),
  removeDiscount: (id, discountId) => axiosClient.delete(`/tuition-fees/${id}/discounts/${discountId}`),
  deleteTuitionFee: (id) => axiosClient.delete(`/tuition-fees/${id}`),
  getSummaryByCohort: (params) => axiosClient.get('/tuition-fees/summary', { params }),
};

export default tuitionFeeService;
