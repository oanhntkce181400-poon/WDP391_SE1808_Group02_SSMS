// studentService.js
// Frontend API service cho Student Management
// Tác giả: Group02 - WDP391

import axiosClient from './axiosClient';

const studentService = {
  // ─────────────────────────────────────────────────────────────
  // Lấy danh sách sinh viên (có filter, search, pagination)
  // ─────────────────────────────────────────────────────────────
  getStudents: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.majorCode) queryParams.append('majorCode', params.majorCode);
    if (params.cohort) queryParams.append('cohort', params.cohort);
    if (params.academicStatus) queryParams.append('academicStatus', params.academicStatus);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const url = `/students${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return axiosClient.get(url);
  },

  // ─────────────────────────────────────────────────────────────
  // Lấy chi tiết sinh viên
  // ─────────────────────────────────────────────────────────────
  getStudentById: async (id) => {
    return axiosClient.get(`/students/${id}`);
  },

  // ─────────────────────────────────────────────────────────────
  // Tạo sinh viên mới
  // ─────────────────────────────────────────────────────────────
  createStudent: async (data) => {
    return axiosClient.post('/students', data);
  },

  // ─────────────────────────────────────────────────────────────
  // Cập nhật thông tin sinh viên
  // ─────────────────────────────────────────────────────────────
  updateStudent: async (id, data) => {
    return axiosClient.put(`/students/${id}`, data);
  },

  // ─────────────────────────────────────────────────────────────
  // Xóa sinh viên
  // ─────────────────────────────────────────────────────────────
  deleteStudent: async (id) => {
    return axiosClient.delete(`/students/${id}`);
  },

  // ─────────────────────────────────────────────────────────────
  // Lấy danh sách ngành học (cho dropdown filter)
  // ─────────────────────────────────────────────────────────────
  getMajors: async () => {
    return axiosClient.get('/students/filters/majors');
  },

  // ─────────────────────────────────────────────────────────────
  // Lấy danh sách khóa (cho dropdown filter)
  // ─────────────────────────────────────────────────────────────
  getCohorts: async () => {
    return axiosClient.get('/students/filters/cohorts');
  },

  // ─────────────────────────────────────────────────────────────
  // Gợi ý lớp sinh hoạt
  // ─────────────────────────────────────────────────────────────
  getSuggestedClassSection: async (majorCode, cohort) => {
    return axiosClient.get(`/students/suggest-class?majorCode=${majorCode}&cohort=${cohort}`);
  },
};

export default studentService;
