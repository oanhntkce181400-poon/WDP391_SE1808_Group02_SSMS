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
    * Nhập điểm cho các sinh viên (batch cũ)
   * POST /api/grades/submit
   * Body: { grades: [{ enrollmentId, midtermScore, finalScore, assignmentScore }], autoCalculate: true }
   */
  submitGrades: async (grades, autoCalculate = true) => {
    try {
      const response = await axiosClient.post('/grades/submit', {
        grades,
        autoCalculate
      });
      return response;
    } catch (error) {
      console.error('Error submitting grades:', error);
      throw error;
    }
  },

  /**
   * Nhập điểm theo format mới cho 1 sinh viên
   * POST /api/grades/submit
   * Body: {
   *   studentId,
   *   classSectionId,
   *   grade: { midtermScore, finalScore, otherScore }
   * }
   */
  submitSingleStudentGrade: async ({ studentId, classSectionId, grade }) => {
    try {
      const response = await axiosClient.post('/grades/submit', {
        studentId,
        classSectionId,
        grade
      });
      return response;
    } catch (error) {
      console.error('Error submitting single student grade:', error);
      throw error;
    }
  },

  /**
   * Sửa điểm theo enrollment
   * PATCH /api/grades/:enrollmentId
   * Body: { grade: { midtermScore, finalScore, otherScore, continuousScore }, reason }
   */
  updateEnrollmentGrade: async (enrollmentId, payload) => {
    try {
      const response = await axiosClient.patch(`/grades/${enrollmentId}`, payload);
      return response;
    } catch (error) {
      console.error('Error updating enrollment grade:', error);
      throw error;
    }
  },

  /**
   * Lấy log thay đổi điểm theo enrollment
   * GET /api/grades/:enrollmentId/change-logs
   */
  getEnrollmentGradeChangeLogs: async (enrollmentId) => {
    try {
      const response = await axiosClient.get(`/grades/${enrollmentId}/change-logs`);
      return response;
    } catch (error) {
      console.error('Error fetching enrollment grade change logs:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách sinh viên của một lớp để nhập điểm
   * GET /api/grades/class/:classSectionId/enrollments
   */
  getClassEnrollmentsForGrading: async (classSectionId) => {
    try {
      const response = await axiosClient.get(`/grades/class/${classSectionId}/enrollments`);
      return response;
    } catch (error) {
      console.error('Error fetching class enrollments for grading:', error);
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
      assignmentScore: 'Progress Test (PT)',
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
  },

  /**
   * Công bố điểm chính thức cho tất cả sinh viên trong lớp
   * POST /api/grades/finalize
   * Body: { classSectionId }
   */
  submitFinalClassGrades: async (classSectionId) => {
    try {
      const response = await axiosClient.post('/grades/finalize', {
        classSectionId
      });
      return response;
    } catch (error) {
      console.error('Error submitting final class grades:', error);
      throw error;
    }
  },

  /**
   * Xuất báo cáo điểm dưới dạng Excel
   * GET /api/grades/export?format=excel&semester=...&academicYear=...&classSection=...&major=...
   * @param {string} format - 'excel' (mặc định)
   * @param {object} filters - { semester, academicYear, classSection, major }
   */
  exportGrades: async (format = 'excel', filters = {}) => {
    try {
      const params = new URLSearchParams({
        format: 'excel' // Always use excel
      });

      if (filters.semester) params.append('semester', filters.semester);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.classSection) params.append('classSection', filters.classSection);
      if (filters.major) params.append('major', filters.major);

      const url = `/grades/export?${params.toString()}`;
      
      // Use blob response type for file download
      const response = await axiosClient.get(url, {
        responseType: 'blob',
        transformResponse: [(data) => data] // Don't transform response
      });

      // Check if response is an error (if content-type is JSON)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Export failed');
      }

      // Generate filename
      const timestamp = new Date().getTime();
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `BaoCaoDiem_${timestamp}.${ext}`;

      // Create blob URL and trigger download
      const blob = new Blob([response.data], {
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      return {
        success: true,
        message: 'Export successful',
        filename
      };
    } catch (error) {
      console.error('Error exporting grades:', error);
      // Extract error message better
      let errorMessage = error.message;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      throw new Error(errorMessage || 'Failed to export grades');
    }
  },

  /**
   * Xuất báo cáo điểm cho một kỳ học cụ thể
   * @param {string} format - 'excel' hoặc 'pdf'
   * @param {string} semester - Số kỳ học
   * @param {string} academicYear - Năm học (e.g., '2024-2025')
   */
  exportGradesBySemester: async (format = 'excel', semester, academicYear) => {
    return gradesService.exportGrades(format, {
      semester,
      academicYear
    });
  },

  /**
   * Lấy báo cáo phân bố điểm
   * GET /api/reports/grade-distribution
   * @param {object} filters - { semester, academicYear, classSection, major }
   */
  getGradeDistributionReport: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.classSection) params.append('classSection', filters.classSection);
      if (filters.major) params.append('major', filters.major);

      const url = `/reports/grade-distribution${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching grade distribution report:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách sinh viên xuất sắc
   * GET /api/honors/honor-roll
   * @param {object} filters - { semesterId, semesterCode, academicYear }
   */
  getHonorRollStudents: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.semesterId) params.append('semesterId', filters.semesterId);
      if (filters.semesterCode) params.append('semesterCode', filters.semesterCode);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

      const url = `/honors/honor-roll${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosClient.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching honor roll students:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách tất cả các kỳ học
   * GET /api/honors/semesters
   */
  getHonorRollSemesters: async () => {
    try {
      const response = await axiosClient.get('/honors/semesters');
      return response;
    } catch (error) {
      console.error('Error fetching honor roll semesters:', error);
      throw error;
    }
  },

  /**
   * Xuất danh sách sinh viên xuất sắc dưới dạng Excel
   * @param {object} honorRollData - Dữ liệu danh sách xuất sắc
   */
  exportHonorRollToExcel: async (honorRollData, semesterName) => {
    try {
      const ExcelJS = window.ExcelJS;
      if (!ExcelJS) {
        throw new Error('ExcelJS library not loaded');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Danh sách xuất sắc');

      // Set column widths
      worksheet.columns = [
        { header: 'Mã SV', key: 'studentCode', width: 12 },
        { header: 'Họ và tên', key: 'fullName', width: 25 },
        { header: 'Chuyên ngành', key: 'major', width: 20 },
        { header: 'GPA', key: 'gpa', width: 10 },
        { header: 'Tổng TC', key: 'totalCredits', width: 10 },
        { header: 'Số môn học', key: 'enrollmentCount', width: 12 }
      ];

      // Add header styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'center' };

      // Add data rows
      if (honorRollData && Array.isArray(honorRollData)) {
        honorRollData.forEach((student, index) => {
          worksheet.addRow({
            studentCode: student.studentCode,
            fullName: student.fullName,
            major: student.major || 'N/A',
            gpa: student.gpa,
            totalCredits: student.totalCredits,
            enrollmentCount: student.enrollmentCount
          });

          // Alternate row colors
          if (index % 2 === 0) {
            const row = worksheet.getRow(index + 2);
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }
        });
      }

      // Center align numeric columns
      worksheet.columns.forEach((col) => {
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const cell = worksheet.getCell(i, col.key === 'gpa' ? 4 : col.key === 'totalCredits' ? 5 : col.key === 'enrollmentCount' ? 6 : 1);
          if (['gpa', 'totalCredits', 'enrollmentCount'].includes(col.key)) {
            cell.alignment = { horizontal: 'center' };
          }
        }
      });

      // Generate filename
      const timestamp = new Date().toLocaleString('vi-VN').replace(/[/:\s,]/g, '_');
      const filename = `DanhSachXuatSac_${semesterName || timestamp}.xlsx`;

      // Save file
      await workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      });

      return {
        success: true,
        message: 'Export successful',
        filename
      };
    } catch (error) {
      console.error('Error exporting honor roll to Excel:', error);
      throw error;
    }
  }
};

export default gradesService;
