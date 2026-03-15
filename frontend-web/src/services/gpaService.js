// gpaService.js
// Frontend API service cho GPA Management
// Tác giả: Group02 - WDP391

import axiosClient from './axiosClient';

const gpaService = {
  /**
   * Lấy GPA của sinh viên hiện tại
   */
  getMyGPA: async () => {
    return axiosClient.get('/students/me/gpa');
  },

  /**
   * Lấy GPA của một sinh viên cụ thể (Admin/Staff)
   * @param {string} studentId - ID của sinh viên
   */
  getStudentGPA: async (studentId) => {
    return axiosClient.get(`/students/${studentId}/gpa`);
  },

  /**
   * Lấy danh sách kỳ học của sinh viên hiện tại
   */
  getMySemesters: async () => {
    return axiosClient.get('/students/me/semesters');
  },

  /**
   * Lấy danh sách kỳ học của một sinh viên (Admin/Staff)
   * @param {string} studentId - ID của sinh viên
   */
  getStudentSemesters: async (studentId) => {
    return axiosClient.get(`/students/${studentId}/semesters`);
  },

  /**
   * Lấy GPA của sinh viên hiện tại theo kỳ học
   * @param {number} semesterNumber - Số thứ tự kỳ học
   * @param {string} academicYear - Năm học (format: "2025-2026")
   */
  getMyGPABySemester: async (semesterNumber, academicYear) => {
    return axiosClient.get(`/students/me/gpa/semester/${semesterNumber}/${academicYear}`);
  },

  /**
   * Lấy GPA của một sinh viên theo kỳ học (Admin/Staff)
   * @param {string} studentId - ID của sinh viên
   * @param {number} semesterNumber - Số thứ tự kỳ học
   * @param {string} academicYear - Năm học
   */
  getStudentGPABySemester: async (studentId, semesterNumber, academicYear) => {
    return axiosClient.get(`/students/${studentId}/gpa/semester/${semesterNumber}/${academicYear}`);
  },

  /**
   * Format GPA cho hiển thị
   * @param {number} gpa - Giá trị GPA
   * @returns {string} GPA được format
   */
  formatGPA: (gpa) => {
    if (typeof gpa !== 'number') return 'N/A';
    return gpa.toFixed(2);
  },

  /**
   * Kiểm tra xem GPA có cần cảnh báo không
   * @param {number} gpa - Giá trị GPA
   * @returns {boolean} true nếu GPA < 5.0
   */
  isGPAWarning: (gpa) => {
    return typeof gpa === 'number' && gpa < 5.0;
  },

  /**
   * Lấy màu sắc dựa trên GPA
   * @param {number} gpa - Giá trị GPA
   * @returns {string} tên class Tailwind
   */
  getGPAColor: (gpa) => {
    if (typeof gpa !== 'number') return 'text-gray-500';
    if (gpa >= 8.0) return 'text-green-600';
    if (gpa >= 6.5) return 'text-blue-600';
    if (gpa >= 5.0) return 'text-yellow-600';
    return 'text-red-600';
  },
};

export default gpaService;
