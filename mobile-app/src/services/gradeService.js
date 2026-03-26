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
};

export default gradeService;
