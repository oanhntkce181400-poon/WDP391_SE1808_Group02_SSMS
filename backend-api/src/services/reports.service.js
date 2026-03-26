// reports.service.js
// Service xử lý báo cáo phân tích dữ liệu
// Tác giả: Group02 - WDP391

const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection = require('../models/classSection.model');
const Student = require('../models/student.model');

class ReportsService {
  /**
   * Lấy báo cáo phân bố điểm với các filter
   * @param {Object} filters - { semester, academicYear, classSection, major }
   * @returns {Object} Phân bố điểm, thống kê
   */
  async getGradeDistribution(filters = {}) {
    try {
      // Build query for enrollments
      const enrollmentQuery = {
        status: { $in: ['enrolled', 'completed', 'active'] }
      };

      // Get enrollments with populated data
      let enrollments = await ClassEnrollment.find(enrollmentQuery)
        .populate({
          path: 'classSection',
          populate: [
            {
              path: 'subject',
              select: 'subjectCode subjectName credits'
            }
          ]
        })
        .populate('student', 'studentCode fullName major')
        .lean();

      // Apply filters
      if (filters.semester) {
        const semesterNum = parseInt(filters.semester);
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection.semester === semesterNum
        );
      }

      if (filters.academicYear) {
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection.academicYear === filters.academicYear
        );
      }

      if (filters.classSection) {
        enrollments = enrollments.filter(e => 
          e.classSection && e.classSection._id.toString() === filters.classSection
        );
      }

      if (filters.major) {
        enrollments = enrollments.filter(e => 
          e.student && e.student.major === filters.major
        );
      }

      // Tính toán phân bố điểm
      const distribution = this.calculateDistribution(enrollments);
      
      // Tính toán thống kê
      const statistics = this.calculateStatistics(enrollments);

      // Nhóm theo classSection nếu cần
      const byClassSection = this.groupByClassSection(enrollments);

      // Nhóm theo semester nếu cần
      const bySemester = this.groupBySemester(enrollments);

      return {
        success: true,
        message: 'Lấy báo cáo phân bố điểm thành công',
        data: {
          distribution,
          statistics,
          totalEnrollments: enrollments.length,
          byClassSection,
          bySemester,
          enrollments: enrollments.map(e => ({
            studentCode: e.student?.studentCode || 'N/A',
            studentName: e.student?.fullName || 'N/A',
            major: e.student?.major || 'N/A',
            subjectCode: e.classSection?.subject?.subjectCode || 'N/A',
            subjectName: e.classSection?.subject?.subjectName || 'N/A',
            semester: e.classSection?.semester || 'N/A',
            grade: e.grade,
            gradeName: this.getGradeName(e.grade),
            status: e.status
          }))
        }
      };
    } catch (error) {
      console.error('Error in getGradeDistribution:', error);
      throw new Error(`Lỗi lấy báo cáo phân bố điểm: ${error.message}`);
    }
  }

  /**
   * Tính toán phân bố điểm theo các khoảng
   */
  calculateDistribution(enrollments) {
    const ranges = {
      'Xuất sắc (8.5-10)': 0,
      'Giỏi (8.0-8.4)': 0,
      'Khá (7.0-7.9)': 0,
      'Trung bình (5.5-6.9)': 0,
      'Yếu (4.0-5.4)': 0,
      'Kém (< 4.0)': 0,
      'Chưa có điểm': 0
    };

    enrollments.forEach(enrollment => {
      const grade = enrollment.grade;
      if (grade === null || grade === undefined) {
        ranges['Chưa có điểm']++;
      } else if (grade >= 8.5) {
        ranges['Xuất sắc (8.5-10)']++;
      } else if (grade >= 8.0) {
        ranges['Giỏi (8.0-8.4)']++;
      } else if (grade >= 7.0) {
        ranges['Khá (7.0-7.9)']++;
      } else if (grade >= 5.5) {
        ranges['Trung bình (5.5-6.9)']++;
      } else if (grade >= 4.0) {
        ranges['Yếu (4.0-5.4)']++;
      } else {
        ranges['Kém (< 4.0)']++;
      }
    });

    return ranges;
  }

  /**
   * Tính toán thống kê điểm
   */
  calculateStatistics(enrollments) {
    const grades = enrollments
      .filter(e => e.grade !== null && e.grade !== undefined)
      .map(e => e.grade);

    if (grades.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        stdev: 0,
        passCount: 0,
        passRate: '0%'
      };
    }

    const sum = grades.reduce((a, b) => a + b, 0);
    const average = sum / grades.length;
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    
    // Median
    const sorted = [...grades].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Standard deviation
    const variance = grades.reduce((sum, grade) => sum + Math.pow(grade - average, 2), 0) / grades.length;
    const stdev = Math.sqrt(variance);

    // Pass rate (grade >= 4.0)
    const passCount = grades.filter(g => g >= 4.0).length;
    const passRate = `${((passCount / grades.length) * 100).toFixed(2)}%`;

    return {
      count: grades.length,
      average: average.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      median: median.toFixed(2),
      stdev: stdev.toFixed(2),
      passCount,
      passRate
    };
  }

  /**
   * Nhóm theo classSection
   */
  groupByClassSection(enrollments) {
    const grouped = {};

    enrollments.forEach(enrollment => {
      const classCode = enrollment.classSection?.classCode || 'Unknown';
      const className = enrollment.classSection?.subject?.subjectName || 'Unknown';
      const key = `${classCode} - ${className}`;

      if (!grouped[key]) {
        grouped[key] = {
          classCode,
          className: className,
          enrollments: [],
          distribution: {
            'Xuất sắc (8.5-10)': 0,
            'Giỏi (8.0-8.4)': 0,
            'Khá (7.0-7.9)': 0,
            'Trung bình (5.5-6.9)': 0,
            'Yếu (4.0-5.4)': 0,
            'Kém (< 4.0)': 0,
            'Chưa có điểm': 0
          },
          statistics: {}
        };
      }

      grouped[key].enrollments.push({
        studentCode: enrollment.student?.studentCode || 'N/A',
        grade: enrollment.grade
      });

      // Update distribution
      const grade = enrollment.grade;
      if (grade === null || grade === undefined) {
        grouped[key].distribution['Chưa có điểm']++;
      } else if (grade >= 8.5) {
        grouped[key].distribution['Xuất sắc (8.5-10)']++;
      } else if (grade >= 8.0) {
        grouped[key].distribution['Giỏi (8.0-8.4)']++;
      } else if (grade >= 7.0) {
        grouped[key].distribution['Khá (7.0-7.9)']++;
      } else if (grade >= 5.5) {
        grouped[key].distribution['Trung bình (5.5-6.9)']++;
      } else if (grade >= 4.0) {
        grouped[key].distribution['Yếu (4.0-5.4)']++;
      } else {
        grouped[key].distribution['Kém (< 4.0)']++;
      }
    });

    // Calculate statistics for each class
    Object.keys(grouped).forEach(key => {
      grouped[key].statistics = this.calculateStatistics(grouped[key].enrollments.map(e => ({ grade: e.grade })));
    });

    return grouped;
  }

  /**
   * Nhóm theo semester
   */
  groupBySemester(enrollments) {
    const grouped = {};

    enrollments.forEach(enrollment => {
      const semester = enrollment.classSection?.semester || 'Unknown';
      const academicYear = enrollment.classSection?.academicYear || 'Unknown';
      const key = `Kỳ ${semester} - ${academicYear}`;

      if (!grouped[key]) {
        grouped[key] = {
          semester,
          academicYear,
          enrollments: [],
          distribution: {
            'Xuất sắc (8.5-10)': 0,
            'Giỏi (8.0-8.4)': 0,
            'Khá (7.0-7.9)': 0,
            'Trung bình (5.5-6.9)': 0,
            'Yếu (4.0-5.4)': 0,
            'Kém (< 4.0)': 0,
            'Chưa có điểm': 0
          },
          statistics: {}
        };
      }

      grouped[key].enrollments.push({
        studentCode: enrollment.student?.studentCode || 'N/A',
        grade: enrollment.grade
      });

      // Update distribution
      const grade = enrollment.grade;
      if (grade === null || grade === undefined) {
        grouped[key].distribution['Chưa có điểm']++;
      } else if (grade >= 8.5) {
        grouped[key].distribution['Xuất sắc (8.5-10)']++;
      } else if (grade >= 8.0) {
        grouped[key].distribution['Giỏi (8.0-8.4)']++;
      } else if (grade >= 7.0) {
        grouped[key].distribution['Khá (7.0-7.9)']++;
      } else if (grade >= 5.5) {
        grouped[key].distribution['Trung bình (5.5-6.9)']++;
      } else if (grade >= 4.0) {
        grouped[key].distribution['Yếu (4.0-5.4)']++;
      } else {
        grouped[key].distribution['Kém (< 4.0)']++;
      }
    });

    // Calculate statistics for each semester
    Object.keys(grouped).forEach(key => {
      grouped[key].statistics = this.calculateStatistics(grouped[key].enrollments.map(e => ({ grade: e.grade })));
    });

    return grouped;
  }

  /**
   * Helper: Lấy tên xếp loại từ điểm
   */
  getGradeName(grade) {
    if (grade === null || grade === undefined) return 'Chưa có';
    if (grade >= 8.5) return 'Xuất sắc';
    if (grade >= 8.0) return 'Giỏi';
    if (grade >= 7.0) return 'Khá';
    if (grade >= 5.5) return 'Trung bình';
    if (grade >= 4.0) return 'Yếu';
    return 'Kém';
  }
}

module.exports = new ReportsService();
