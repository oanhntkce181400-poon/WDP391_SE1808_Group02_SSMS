// gradesService.js
// Service để lấy dữ liệu điểm từ backend
// Tác giả: Group02 - WDP391

import axiosClient from './axiosClient';

const gradesService = {
  /**
   * Lấy chi tiết điểm của một enrollment
   * GET /api/grades/:enrollmentId/details
   */
  getGradeDetails: async (enrollmentId) => {
    try {
      const response = await axiosClient.get(`/grades/${enrollmentId}/details`);
      return response;
    } catch (error) {
      console.error('Error fetching grade details:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết điểm của sinh viên hiện tại
   * GET /api/students/me/grades/details
   * Query params: status, semester, academicYear
   */
  getMyGradeDetails: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

      const url = `/students/me/grades/details${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching my grade details:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết điểm của một sinh viên (Admin/Staff)
   * GET /api/students/:studentId/grades/details
   */
  getStudentGradeDetails: async (studentId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

      const url = `/students/${studentId}/grades/details${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching student grade details:', error);
      throw error;
    }
  },

  /**
   * Tính điểm cuối cùng dựa trên các thành phần điểm
   * POST /api/grades/:enrollmentId/calculate
   * Admin/Staff only
   */
  calculateFinalGrade: async (enrollmentId) => {
    try {
      const response = await axiosClient.post(`/grades/${enrollmentId}/calculate`);
      return response;
    } catch (error) {
      console.error('Error calculating final grade:', error);
      throw error;
    }
  },

  /**
   * Cập nhật một thành phần điểm
   * PATCH /api/grades/:enrollmentId/component
   * Admin/Staff only
   * Body: { componentType: 'midtermScore|finalScore|assignmentScore|continuousScore', score: number }
   */
  updateGradeComponent: async (enrollmentId, componentType, score) => {
    try {
      const response = await axiosClient.patch(`/grades/${enrollmentId}/component`, {
        componentType,
        score
      });
      return response;
    } catch (error) {
      console.error('Error updating grade component:', error);
      throw error;
    }
  },

  /**
   * Tính điểm cuối cùng cho tất cả enrollments của một lớp học
   * POST /api/grades/class/:classSectionId/calculate-all
   * Admin/Staff only
   */
  calculateFinalGradesForClass: async (classSectionId) => {
    try {
      const response = await axiosClient.post(`/grades/class/${classSectionId}/calculate-all`);
      return response;
    } catch (error) {
      console.error('Error calculating grades for class:', error);
      throw error;
    }
  },

  /**
   * Format điểm để hiển thị
   * @param {number} score
   * @returns {string} Formatted score (X.XX)
   */
  formatScore: (score) => {
    if (score === null || score === undefined) return 'N/A';
    return parseFloat(score).toFixed(2);
  },

  /**
   * Lấy màu sắc dựa trên giá trị điểm
   * @param {number} score
   * @returns {string} Tailwind color class
   */
  getScoreColor: (score) => {
    if (score === null || score === undefined) return 'text-gray-500';
    if (score >= 8) return 'text-green-600 font-bold';
    if (score >= 6.5) return 'text-blue-600 font-bold';
    if (score >= 5) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  },

  /**
   * Lấy tất cả điểm của sinh viên, grouped by semester
   * GET /api/grades/my-grades
   */
  getMyGrades: async () => {
    try {
      const response = await axiosClient.get('/grades/my-grades');
      return response;
    } catch (error) {
      console.error('Error fetching my grades:', error);
      throw error;
    }
  },

  /**
   * Lấy tên hiển thị của thành phần điểm
   * @param {string} componentType
   * @returns {string} Component name in Vietnamese
   */
  getComponentName: (componentType) => {
    const names = {
      midtermScore: 'Giữa kỳ (GK)',
      finalScore: 'Cuối kỳ (CK)',
      assignmentScore: 'Bài tập (BT)',
      continuousScore: 'Quá trình'
    };
    return names[componentType] || componentType;
  },

  /**
   * Lấy trọng số của thành phần điểm
   * @param {string} componentType
   * @returns {string} Weight percentage
   */
  getComponentWeight: (componentType) => {
    const weights = {
      midtermScore: '30%',
      finalScore: '50%',
      assignmentScore: '20%',
      continuousScore: 'Thông tin thêm'
    };
    return weights[componentType] || '—';
  }
};

export default gradesService;
