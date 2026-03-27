import axiosClient from './axiosClient';

const gradeService = {
  // ─── STUDENT GRADES ─────────────────────────────────────────
  
  // Lấy tất cả điểm của sinh viên, grouped by semester
  getMyGrades() {
    return axiosClient.get('/grades/my-grades');
  },

  // Lấy chi tiết các thành phần điểm của một enrollment
  getGradeDetails(enrollmentId) {
    return axiosClient.get(`/grades/${enrollmentId}/details`);
  },

  // Lấy tất cả chi tiết điểm của sinh viên (with filters)
  getMyGradeDetails(filters = {}) {
    const params = new URLSearchParams();
    if (filters.semester) params.append('semester', filters.semester);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = queryString ? `/grades/my-grades/details?${queryString}` : '/grades/my-grades/details';
    return axiosClient.get(url);
  },

  // Lấy lịch sử thay đổi điểm của một enrollment
  getEnrollmentGradeChangeLogs(enrollmentId) {
    return axiosClient.get(`/grades/${enrollmentId}/change-logs`);
  },

  // ─── GPA ────────────────────────────────────────────────────
  
  // Lấy GPA tổng thể của sinh viên
  getGPA() {
    return axiosClient.get('/students/me/gpa');
  },

  // Lấy GPA theo học kỳ cụ thể
  getGPABySemester(semesterNumber, academicYear) {
    return axiosClient.get(`/students/me/gpa/semester/${semesterNumber}/${academicYear}`);
  },

  // ─── CURRENT SEMESTER ────────────────────────────────────────
  
  // Lấy các môn học của học kỳ hiện tại
  getCurrentSemesterCourses() {
    return axiosClient.get('/students/me/current-semester-courses');
  },

  // ─── GRADE COMPONENT HELPERS ────────────────────────────────
  
  /**
   * Lấy tên hiển thị của thành phần điểm
   * @param {string} componentType - 'GK', 'CK', 'ProgressTest', etc.
   * @returns {string} Component name in Vietnamese
   */
  getComponentName(componentType) {
    const names = {
      'GK': 'Giữa kỳ',
      'CK': 'Cuối kỳ',
      'PT': 'ProgressTest',
      'ProgressTest': 'Điểm ProgressTest',
      'midtermScore': 'Giữa kỳ (GK)',
      'finalScore': 'Cuối kỳ (CK)',
      'assignmentScore': 'Bài tập (BT)',
      'continuousScore': 'Quá trình',
    };
    return names[componentType] || componentType;
  },

  /**
   * Lấy trọng số của thành phần điểm
   * @param {string} componentType - 'GK', 'CK', 'PT', etc.
   * @returns {object} { weight: number, displayWeight: string }
   */
  getComponentWeight(componentType) {
    const weights = {
      'GK': { weight: 30, displayWeight: '30%' },
      'CK': { weight: 50, displayWeight: '50%' },
      'PT': { weight: 20, displayWeight: '20%' },
      'ProgressTest': { weight: 20, displayWeight: '20%' },
      'midtermScore': { weight: 30, displayWeight: '30%' },
      'finalScore': { weight: 50, displayWeight: '50%' },
      'assignmentScore': { weight: 20, displayWeight: '20%' },
      'continuousScore': { weight: 0, displayWeight: 'N/A' },
    };
    return weights[componentType] || { weight: 0, displayWeight: '—' };
  },

  /**
   * Lấy màu sắc dựa trên giá trị điểm (React Native format)
   * @param {number} score
   * @returns {object} { color: string, bgColor: string, isDangerZone: boolean }
   */
  getScoreColor(score) {
    if (score === null || score === undefined) {
      return { color: '#9CA3AF', bgColor: '#F3F4F6', isDangerZone: false };
    }
    
    const numScore = parseFloat(score);
    
    if (numScore >= 8.5) {
      return { color: '#10B981', bgColor: '#ECFDF5', isDangerZone: false }; // Green - Excellent
    }
    if (numScore >= 8) {
      return { color: '#059669', bgColor: '#E6FAEA', isDangerZone: false }; // Dark Green - Very Good
    }
    if (numScore >= 6.5) {
      return { color: '#3B82F6', bgColor: '#EFF6FF', isDangerZone: false }; // Blue - Good
    }
    if (numScore >= 5) {
      return { color: '#F59E0B', bgColor: '#FFFBEB', isDangerZone: false }; // Amber - Passing
    }
    if (numScore >= 3) {
      return { color: '#EF4444', bgColor: '#FEE2E2', isDangerZone: true }; // Red - Poor
    }
    // Less than 3
    return { color: '#991B1B', bgColor: '#FEE2E2', isDangerZone: true }; // Dark Red - Fail
  },

  /**
   * Format điểm để hiển thị
   * @param {number} score
   * @returns {string} Formatted score (X.XX) hoặc 'N/A'
   */
  formatScore(score) {
    if (score === null || score === undefined) return 'N/A';
    return parseFloat(score).toFixed(2);
  },

  /**
   * Format GPA với 2 chữ số thập phân
   * @param {number} gpa
   * @returns {string} Formatted GPA
   */
  formatGPA(gpa) {
    if (gpa === null || gpa === undefined) return '0.00';
    return parseFloat(gpa).toFixed(2);
  },
};

export default gradeService;
