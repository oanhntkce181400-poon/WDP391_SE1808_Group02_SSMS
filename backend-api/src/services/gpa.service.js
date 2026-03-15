// gpa.service.js
// Service xử lý tính toán GPA cho sinh viên
// Tác giả: Group02 - WDP391

const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection = require('../models/classSection.model');
const Subject = require('../models/subject.model');
const Semester = require('../models/semester.model');

class GPAService {
  /**
   * Tính GPA của sinh viên
   * GPA = (Σ grade × credits) / Σ credits
   * Chỉ tính với các lớp học đã có điểm (grade) và status = 'completed'
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Object>} { gpa: number, totalCredits: number, weightedSum: number, courses: Array }
   */
  async calculateStudentGPA(studentId) {
    try {
      // Lấy tất cả ClassEnrollment của sinh viên có điểm
      const enrollments = await ClassEnrollment.find({
        student: studentId,
        grade: { $exists: true, $ne: null },
        status: 'completed'
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .lean();

      if (!enrollments || enrollments.length === 0) {
        return {
          gpa: 0,
          totalCredits: 0,
          weightedSum: 0,
          courses: [],
          message: 'Không có điểm số hoặc không có lớp học hoàn thành'
        };
      }

      // Tính tổng điểm có trọng số và tổng tín chỉ
      let weightedSum = 0;
      let totalCredits = 0;
      const courses = [];

      for (const enrollment of enrollments) {
        if (!enrollment.classSection || !enrollment.classSection.subject) {
          continue;
        }

        const grade = enrollment.grade;
        const credits = enrollment.classSection.subject.credits;

        // Chỉ tính nếu có đủ thông tin
        if (grade >= 0 && credits > 0) {
          weightedSum += grade * credits;
          totalCredits += credits;

          courses.push({
            classSection: enrollment.classSection.classCode,
            subject: enrollment.classSection.subject.subjectCode,
            subjectName: enrollment.classSection.subject.subjectName,
            credits: credits,
            grade: grade,
            weightedValue: grade * credits
          });
        }
      }

      // Tính GPA
      const gpa = totalCredits > 0 ? weightedSum / totalCredits : 0;

      return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalCredits,
        weightedSum: parseFloat(weightedSum.toFixed(2)),
        courses,
        status: 'success'
      };
    } catch (error) {
      console.error('Error calculating GPA:', error);
      throw new Error(`Lỗi tính GPA: ${error.message}`);
    }
  }

  /**
   * Lấy thông tin GPA chi tiết của sinh viên (bao gồm danh sách lớp học)
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Object>} GPA với chi tiết các lớp học
   */
  async getDetailedGPA(studentId) {
    return this.calculateStudentGPA(studentId);
  }

  /**
   * Lấy GPA đơn giản (chỉ số GPA)
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<number>} Giá trị GPA
   */
  async getSimpleGPA(studentId) {
    try {
      const result = await this.calculateStudentGPA(studentId);
      return result.gpa;
    } catch (error) {
      console.error('Error getting simple GPA:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra xem GPA có dưới 5.0 không (cho cảnh báo)
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Object>} { isLow: boolean, gpa: number }
   */
  async checkGPAWarning(studentId) {
    try {
      const result = await this.calculateStudentGPA(studentId);
      return {
        isLow: result.gpa < 5.0,
        gpa: result.gpa,
        status: result.gpa < 5.0 ? 'warning' : 'ok'
      };
    } catch (error) {
      console.error('Error checking GPA warning:', error);
      throw error;
    }
  }

  /**
   * Tính GPA của sinh viên trong một kỳ học cụ thể
   * 
   * @param {string} studentId - ID của sinh viên
   * @param {number} semesterNumber - Số thứ tự kỳ học (1, 2, 3...)
   * @param {string} academicYear - Năm học (VD: "2025-2026")
   * @returns {Promise<Object>} GPA kỳ học
   */
  async calculateSemesterGPA(studentId, semesterNumber, academicYear) {
    try {
      // Lấy tất cả ClassEnrollment của sinh viên có điểm
      const enrollments = await ClassEnrollment.find({
        student: studentId,
        grade: { $exists: true, $ne: null },
        status: 'completed'
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .lean();

      // Lọc theo semester và academicYear
      const semesterEnrollments = enrollments.filter(e => 
        e.classSection &&
        e.classSection.semester === semesterNumber &&
        e.classSection.academicYear === academicYear
      );

      if (!semesterEnrollments || semesterEnrollments.length === 0) {
        return {
          gpa: 0,
          totalCredits: 0,
          weightedSum: 0,
          courses: [],
          semesterNumber,
          academicYear,
          message: `Không có điểm số hoặc không có lớp học hoàn thành ở kỳ ${semesterNumber} - ${academicYear}`
        };
      }

      // Tính tổng điểm có trọng số và tổng tín chỉ
      let weightedSum = 0;
      let totalCredits = 0;
      const courses = [];

      for (const enrollment of semesterEnrollments) {
        if (!enrollment.classSection || !enrollment.classSection.subject) {
          continue;
        }

        const grade = enrollment.grade;
        const credits = enrollment.classSection.subject.credits;

        // Chỉ tính nếu có đủ thông tin
        if (grade >= 0 && credits > 0) {
          weightedSum += grade * credits;
          totalCredits += credits;

          courses.push({
            classSection: enrollment.classSection.classCode,
            subject: enrollment.classSection.subject.subjectCode,
            subjectName: enrollment.classSection.subject.subjectName,
            credits: credits,
            grade: grade,
            weightedValue: grade * credits
          });
        }
      }

      // Tính GPA kỳ học
      const gpa = totalCredits > 0 ? weightedSum / totalCredits : 0;

      return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalCredits,
        weightedSum: parseFloat(weightedSum.toFixed(2)),
        courses,
        semesterNumber,
        academicYear,
        status: 'success'
      };
    } catch (error) {
      console.error('Error calculating semester GPA:', error);
      throw new Error(`Lỗi tính GPA kỳ học: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách tất cả các kỳ học mà sinh viên đã/đang học
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Array>} Danh sách {semesterNumber, academicYear, semesterName}
   */
  async getSemesterListForStudent(studentId) {
    try {
      // Lấy tất cả ClassSection mà sinh viên đã đăng ký (và có status = completed)
      const enrollments = await ClassEnrollment.find({
        student: studentId,
        status: 'completed'
      })
        .populate({
          path: 'classSection',
          select: 'semester academicYear',
          lean: true
        })
        .lean();

      // Extract unique semester + academicYear combinations
      const semesterMap = new Map();
      for (const enrollment of enrollments) {
        if (enrollment.classSection) {
          const key = `${enrollment.classSection.semester}-${enrollment.classSection.academicYear}`;
          if (!semesterMap.has(key)) {
            semesterMap.set(key, {
              semesterNumber: enrollment.classSection.semester,
              academicYear: enrollment.classSection.academicYear,
              semesterName: `Kỳ ${enrollment.classSection.semester} - ${enrollment.classSection.academicYear}`
            });
          }
        }
      }

      // Convert to array and sort by academicYear desc, semesterNumber desc
      const semesters = Array.from(semesterMap.values())
        .sort((a, b) => {
          const yearDiff = b.academicYear.localeCompare(a.academicYear);
          if (yearDiff !== 0) return yearDiff;
          return b.semesterNumber - a.semesterNumber;
        });

      return semesters;
    } catch (error) {
      console.error('Error getting semester list:', error);
      throw new Error(`Lỗi lấy danh sách kỳ học: ${error.message}`);
    }
  }

  /**
   * Tính GPA tích lũy của sinh viên (alias cho calculateStudentGPA)
   * Lấy tất cả enrollments từ đầu và tính GPA tích lũy
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Object>} GPA tích lũy với chi tiết các môn học
   */
  async calculateCumulativeGPA(studentId) {
    return this.calculateStudentGPA(studentId);
  }

  /**
   * Lấy GPA chi tiết theo kỳ học
   * 
   * @param {string} studentId - ID của sinh viên
   * @param {number} semesterNumber - Số thứ tự kỳ học
   * @param {string} academicYear - Năm học
   * @returns {Promise<Object>} GPA kỳ học với chi tiết
   */
  async getSemesterGPADetailed(studentId, semesterNumber, academicYear) {
    return this.calculateSemesterGPA(studentId, semesterNumber, academicYear);
  }
}

// Export instance
module.exports = new GPAService();
