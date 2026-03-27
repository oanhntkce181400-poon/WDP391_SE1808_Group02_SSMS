import axiosClient from './axiosClient';

const gradeService = {
  // Lấy tất cả điểm của sinh viên, grouped by semester
  getMyGrades() {
    return axiosClient.get('/grades/my-grades');
  },

  // Lấy chi tiết các thành phần điểm của một enrollment
  getGradeDetails(enrollmentId) {
    return axiosClient.get(`/grades/${enrollmentId}/details`);
  },

  // Lấy chi tiết GPA của sinh viên
  getGPA() {
    return axiosClient.get('/students/me/gpa');
  },

  // Lấy GPA theo học kỳ
  getGPABySemester(semesterNumber, academicYear) {
    return axiosClient.get(`/students/me/gpa/semester/${semesterNumber}/${academicYear}`);
  },

  // Lấy các môn học hiện tại
  getCurrentSemesterCourses() {
    return axiosClient.get('/students/me/current-semester-courses');
  },

  // Lấy tất cả chi tiết điểm của sinh viên
  getMyGradeDetails(filters = {}) {
    const params = new URLSearchParams();
    if (filters.semester) params.append('semester', filters.semester);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = queryString ? `/grades/my-grades/details?${queryString}` : '/grades/my-grades/details';
    return axiosClient.get(url);
  },
};

export default gradeService;
