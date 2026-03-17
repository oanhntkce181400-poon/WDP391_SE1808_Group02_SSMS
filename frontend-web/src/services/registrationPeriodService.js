// registrationPeriodService.js
// Service gọi API Registration Period

import axiosClient from './axiosClient';

const registrationPeriodService = {
  // Tạo đợt đăng ký mới
  createPeriod: (data) => {
    return axiosClient.post('/registration-periods', data);
  },

  // Lấy danh sách đợt đăng ký
  getPeriods: (params = {}) => {
    return axiosClient.get('/registration-periods', { params });
  },

  // Lấy đợt đăng ký hiện tại
  getCurrentPeriod: () => {
    return axiosClient.get('/registration-periods/current');
  },

  // Lấy chi tiết đợt đăng ký
  getPeriodById: (id) => {
    return axiosClient.get(`/registration-periods/${id}`);
  },

  // Cập nhật đợt đăng ký
  updatePeriod: (id, data) => {
    return axiosClient.put(`/registration-periods/${id}`, data);
  },

  // Toggle trạng thái
  toggleStatus: (id, status) => {
    return axiosClient.patch(`/registration-periods/${id}/status`, { status });
  },

  // Xóa đợt đăng ký
  deletePeriod: (id) => {
    return axiosClient.delete(`/registration-periods/${id}`);
  },

  // Check registration period theo loại đơn + cohort sinh viên
  // Dùng cho trang sinh viên trước khi hiển thị form đăng ký
  checkRequestOpen: ({ requestType, studentCohort }) => {
    return axiosClient.get('/registration-periods/check-request', {
      params: { requestType, studentCohort },
    });
  },

  // Lấy các loại đơn đang mở để hiển thị menu cho sinh viên
  getOpenRequestTypes: (params = {}) => {
    return axiosClient.get('/registration-periods/open-request-types', { params });
  },

  // Lấy danh sách semesters
  getSemesters: () => {
    return axiosClient.get('/semesters');
  },
};

export default registrationPeriodService;
