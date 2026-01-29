// Tuition Fee Service - Call API backend
import axiosClient from './axiosClient';

const tuitionFeeService = {
  // Lấy danh sách học phí
  getTuitionFees: (params) => {
    return axiosClient.get('/tuition-fees', { params });
  },

  // Lấy chi tiết học phí
  getTuitionFeeById: (id) => {
    return axiosClient.get(`/tuition-fees/${id}`);
  },

  // Tạo học phí mới
  createTuitionFee: (data) => {
    return axiosClient.post('/tuition-fees', data);
  },

  // Cập nhật học phí
  updateTuitionFee: (id, data) => {
    return axiosClient.put(`/tuition-fees/${id}`, data);
  },

  // Thêm discount
  addDiscount: (id, discount) => {
    return axiosClient.post(`/tuition-fees/${id}/discounts`, discount);
  },

  // Xóa discount
  removeDiscount: (id, discountId) => {
    return axiosClient.delete(`/tuition-fees/${id}/discounts/${discountId}`);
  },

  // Xóa học phí
  deleteTuitionFee: (id) => {
    return axiosClient.delete(`/tuition-fees/${id}`);
  },

  // Lấy summary theo cohort
  getSummaryByCohort: (params) => {
    return axiosClient.get('/tuition-fees/summary', { params });
  },
};

export default tuitionFeeService;
