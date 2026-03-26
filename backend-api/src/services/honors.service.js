// honors.service.js
// Service xử lý danh sách ngoài ra các sinh viên xuất sắc
// Tiêu chí: GPA >= 8.0 và không có điểm F (< 4.0)

const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection = require('../models/classSection.model');
const Subject = require('../models/subject.model');
const Student = require('../models/student.model');
const Semester = require('../models/semester.model');

class HonorsService {
  /**
   * Lấy danh sách sinh viên xuất sắc trong một kỳ học
   * Tiêu chí: GPA >= 8.0 && không có điểm F (< 4.0)
   * 
   * @param {Object} filters - { semesterId, semesterCode, academicYear }
   * @returns {Promise<Object>} { honorRollStudents, totalCount, passCount, statistics }
   */
  async getHonorRollStudents(filters = {}) {
    try {
      const { semesterId, semesterCode, academicYear } = filters;

      // Lấy thông tin semester
      let semesterQuery = {};
      if (semesterId) {
        const mongoose = require('mongoose');
        semesterQuery._id = new mongoose.Types.ObjectId(semesterId);
      } else if (semesterCode) {
        semesterQuery.code = semesterCode;
      } else if (academicYear) {
        semesterQuery.academicYear = academicYear;
      }

      const semester = await Semester.findOne(semesterQuery).lean();
      if (!semester) {
        throw new Error('Không tìm thấy kỳ học');
      }

      // Lấy tất cả ClassSection của kỳ học này
      const classSections = await ClassSection.find({
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
      })
        .populate('subject', 'subjectCode subjectName credits')
        .lean();

      if (!classSections || classSections.length === 0) {
        return {
          honorRollStudents: [],
          totalCount: 0,
          passCount: 0,
          statistics: {
            avgGPA: 0,
            minGPA: 0,
            maxGPA: 0,
          },
          semester: {
            id: semester._id,
            code: semester.code,
            name: semester.name,
            academicYear: semester.academicYear,
          },
        };
      }

      const classSectionIds = classSections.map(cs => cs._id);

      // Lấy tất cả enrollments trong kỳ học này
      const enrollments = await ClassEnrollment.find({
        classSection: { $in: classSectionIds },
        status: { $in: ['enrolled', 'completed'] },
        grade: { $exists: true, $ne: null },
      })
        .populate({
          path: 'classSection',
          populate: { path: 'subject', select: 'subjectCode subjectName credits' },
        })
        .populate('student', 'studentCode fullName major')
        .lean();

      if (!enrollments || enrollments.length === 0) {
        return {
          honorRollStudents: [],
          totalCount: 0,
          passCount: 0,
          statistics: {
            avgGPA: 0,
            minGPA: 0,
            maxGPA: 0,
          },
          semester: {
            id: semester._id,
            code: semester.code,
            name: semester.name,
            academicYear: semester.academicYear,
          },
        };
      }

      // Nhóm enrollments theo sinh viên
      const studentMap = new Map();

      for (const enrollment of enrollments) {
        if (!enrollment.student || !enrollment.classSection?.subject) {
          continue;
        }

        const studentId = enrollment.student._id.toString();

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student: enrollment.student,
            enrollments: [],
            allGrades: [],
          });
        }

        const studentData = studentMap.get(studentId);
        studentData.enrollments.push(enrollment);
        studentData.allGrades.push(enrollment.grade);
      }

      // Tính GPA cho mỗi sinh viên và kiểm tra tiêu chí
      const honorRollStudents = [];
      const gpas = [];

      for (const [studentId, studentData] of studentMap) {
        // Kiểm tra điều kiện 1: Không có điểm F (< 4.0)
        const hasFailingGrade = studentData.allGrades.some(grade => grade < 4.0);
        if (hasFailingGrade) {
          continue;
        }

        // Tính GPA
        let weightedSum = 0;
        let totalCredits = 0;
        const courses = [];

        for (const enrollment of studentData.enrollments) {
          if (!enrollment.classSection?.subject) {
            continue;
          }

          // Tính lại grade từ component scores để chính xác
          let calculatedGrade = null;

          if (enrollment.midtermScore !== null && enrollment.finalScore !== null) {
            let grade = enrollment.midtermScore * 0.3 + enrollment.finalScore * 0.5;

            if (enrollment.assignmentScore !== null) {
              grade += enrollment.assignmentScore * 0.2;
              calculatedGrade = parseFloat(grade.toFixed(2));
            } else if (
              enrollment.ptScores &&
              Array.isArray(enrollment.ptScores) &&
              enrollment.ptScores.length > 0
            ) {
              const ptAverage =
                enrollment.ptScores.reduce((sum, pt) => sum + pt.score, 0) /
                enrollment.ptScores.length;
              grade += ptAverage * 0.2;
              calculatedGrade = parseFloat(grade.toFixed(2));
            } else {
              calculatedGrade = parseFloat((grade / 0.8).toFixed(2));
            }
          }

          const grade =
            calculatedGrade !== null ? calculatedGrade : enrollment.grade;
          const credits = enrollment.classSection.subject.credits;

          if (grade >= 0 && credits > 0) {
            weightedSum += grade * credits;
            totalCredits += credits;

            courses.push({
              classCode: enrollment.classSection.classCode,
              subjectCode: enrollment.classSection.subject.subjectCode,
              subjectName: enrollment.classSection.subject.subjectName,
              credits,
              grade,
            });
          }
        }

        const gpa = totalCredits > 0 ? parseFloat((weightedSum / totalCredits).toFixed(2)) : 0;

        // Kiểm tra điều kiện 2: GPA >= 8.0
        if (gpa < 8.0) {
          continue;
        }

        gpas.push(gpa);
        honorRollStudents.push({
          studentCode: studentData.student.studentCode,
          fullName: studentData.student.fullName,
          major: studentData.student.major || 'N/A',
          gpa,
          totalCredits,
          courses,
          enrollmentCount: studentData.enrollments.length,
        });
      }

      // Sắp xếp theo GPA giảm dần
      honorRollStudents.sort((a, b) => b.gpa - a.gpa);

      // Tính toán thống kê
      const statistics = {
        avgGPA:
          gpas.length > 0 ? parseFloat((gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2)) : 0,
        minGPA: gpas.length > 0 ? Math.min(...gpas) : 0,
        maxGPA: gpas.length > 0 ? Math.max(...gpas) : 0,
        totalEnrollments: enrollments.length,
        totalStudents: studentMap.size,
      };

      return {
        honorRollStudents,
        totalCount: honorRollStudents.length,
        passCount: honorRollStudents.length,
        statistics,
        semester: {
          id: semester._id,
          code: semester.code,
          name: semester.name,
          academicYear: semester.academicYear,
        },
      };
    } catch (error) {
      console.error('[HonorsService] getHonorRollStudents error:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả các kỳ học
   * 
   * @returns {Promise<Array>} Danh sách các kỳ học
   */
  async getAllSemesters() {
    try {
      const semesters = await Semester.find({})
        .sort({ academicYear: -1, semesterNum: -1 })
        .lean();

      console.log('[HonorsService] getAllSemesters found:', semesters.length, 'semesters');
      console.log('[HonorsService] Semester list:', semesters.map(s => ({ _id: s._id, code: s.code, name: s.name })));

      return semesters;
    } catch (error) {
      console.error('[HonorsService] getAllSemesters error:', error);
      throw error;
    }
  }
}

// Export instance
module.exports = new HonorsService();
