// grades.service.js
// Service xử lý tính toán điểm và quản lý grade
// Tác giả: Group02 - WDP391

const ClassEnrollment = require('../models/classEnrollment.model');

class GradesService {
  /**
   * Cấu hình trọng số tính điểm
   * GK (Midterm): 30%, CK (Final): 50%, BT (Assignment): 20%
   * Quá trình (Continuous): được tính trong bài tập hoặc riêng biệt
   */
  static GRADE_WEIGHTS = {
    midtermScore: 0.30,      // GK - Giữa kỳ: 30%
    finalScore: 0.50,        // CK - Cuối kỳ: 50%
    assignmentScore: 0.20    // BT - Bài tập/Thực hành: 20%
  };

  /**
   * Tính điểm cuối cùng dựa trên các thành phần điểm
   * Final Grade = (GK × 0.3) + (CK × 0.5) + (BT × 0.2)
   * 
   * @param {string} enrollmentId - ID của enrollment
   * @returns {Promise<Object>} { success: boolean, enrollment: Object, grade: number, components: Object }
   */
  async calculateFinalGrade(enrollmentId) {
    try {
      // Lấy enrollment chi tiết
      const enrollment = await ClassEnrollment.findById(enrollmentId)
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName');

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Check if have all required score components
      const { midtermScore, finalScore, assignmentScore } = enrollment;
      
      // If not all scores are entered, return current state
      if (midtermScore === null || finalScore === null || assignmentScore === null) {
        return {
          success: false,
          message: 'Một hoặc nhiều thành phần điểm chưa được nhập đủ',
          enrollment,
          components: {
            midtermScore,
            finalScore,
            assignmentScore,
            continuousScore: enrollment.continuousScore
          },
          grade: enrollment.grade
        };
      }

      // Tính điểm cuối cùng
      const calculatedGrade = 
        (midtermScore * this.constructor.GRADE_WEIGHTS.midtermScore) +
        (finalScore * this.constructor.GRADE_WEIGHTS.finalScore) +
        (assignmentScore * this.constructor.GRADE_WEIGHTS.assignmentScore);

      // Round to 2 decimal places
      const finalGrade = parseFloat(calculatedGrade.toFixed(2));

      // Cập nhật grade field
      enrollment.grade = finalGrade;
      await enrollment.save();

      return {
        success: true,
        message: 'Tính điểm thành công',
        enrollment,
        components: {
          midtermScore,
          finalScore,
          assignmentScore,
          continuousScore: enrollment.continuousScore,
          weights: this.constructor.GRADE_WEIGHTS
        },
        grade: finalGrade
      };
    } catch (error) {
      console.error('Error calculating final grade:', error);
      throw new Error(`Lỗi tính điểm cuối cùng: ${error.message}`);
    }
  }

  /**
   * Cập nhật một thành phần điểm
   * 
   * @param {string} enrollmentId - ID của enrollment
   * @param {Object} scoreData - { componentType, score }
   * @returns {Promise<Object>} Updated enrollment
   */
  async updateGradeComponent(enrollmentId, scoreData) {
    try {
      const { componentType, score } = scoreData;

      // Validate component type
      const validComponents = ['midtermScore', 'finalScore', 'assignmentScore', 'continuousScore'];
      if (!validComponents.includes(componentType)) {
        throw new Error(`Invalid component type: ${componentType}`);
      }

      // Validate score value
      if (score < 0 || score > 10) {
        throw new Error('Điểm phải nằm trong khoảng 0-10');
      }

      // Update component score
      const enrollment = await ClassEnrollment.findByIdAndUpdate(
        enrollmentId,
        { [componentType]: score },
        { new: true, runValidators: true }
      )
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName');

      return {
        success: true,
        message: `Cập nhật ${componentType} thành công`,
        enrollment
      };
    } catch (error) {
      console.error('Error updating grade component:', error);
      throw new Error(`Lỗi cập nhật thành phần điểm: ${error.message}`);
    }
  }

  /**
   * Lấy chi tiết các thành phần điểm của một enrollment
   * 
   * @param {string} enrollmentId - ID của enrollment
   * @returns {Promise<Object>} Grade components with details
   */
  async getGradeDetails(enrollmentId) {
    try {
      const enrollment = await ClassEnrollment.findById(enrollmentId)
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName');

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      const { midtermScore, finalScore, assignmentScore, continuousScore, grade } = enrollment;
      const allComponentsProvided = midtermScore !== null && finalScore !== null && assignmentScore !== null;

      return {
        success: true,
        enrollment,
        gradeDetails: {
          components: {
            GK: { // Giữa kỳ
              name: 'Giữa kỳ',
              score: midtermScore,
              weight: this.constructor.GRADE_WEIGHTS.midtermScore * 100 + '%'
            },
            CK: { // Cuối kỳ
              name: 'Cuối kỳ',
              score: finalScore,
              weight: this.constructor.GRADE_WEIGHTS.finalScore * 100 + '%'
            },
            BT: { // Bài tập
              name: 'Bài tập/Thực hành',
              score: assignmentScore,
              weight: this.constructor.GRADE_WEIGHTS.assignmentScore * 100 + '%'
            },
            'Quá trình': {
              name: 'Điểm quá trình',
              score: continuousScore,
              weight: 'Thông tin thêm'
            }
          },
          finalGrade: grade,
          allComponentsProvided,
          weights: this.constructor.GRADE_WEIGHTS
        }
      };
    } catch (error) {
      console.error('Error getting grade details:', error);
      throw new Error(`Lỗi lấy chi tiết điểm: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả các enrollment với chi tiết điểm của một sinh viên
   * 
   * @param {string} studentId - ID của sinh viên
   * @param {Object} filters - { status, semester, academicYear }
   * @returns {Promise<Array>} Array of enrollments with grade details
   */
  async getStudentGradeDetails(studentId, filters = {}) {
    try {
      const queryFilter = {
        student: studentId
      };

      if (filters.status) {
        queryFilter.status = filters.status;
      }

      const enrollments = await ClassEnrollment.find(queryFilter)
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName')
        .lean();

      // Filter by semester if provided
      let result = enrollments;
      if (filters.semester && filters.academicYear) {
        result = enrollments.filter(e => 
          e.classSection &&
          e.classSection.semester === filters.semester &&
          e.classSection.academicYear === filters.academicYear
        );
      }

      // Add processed grade details to each enrollment
      const detailedEnrollments = result.map(e => ({
        ...e,
        gradeComponents: {
          GK: e.midtermScore,
          CK: e.finalScore,
          BT: e.assignmentScore,
          'Quá trình': e.continuousScore
        },
        finalGrade: e.grade,
        allComponentsProvided: e.midtermScore !== null && e.finalScore !== null && e.assignmentScore !== null
      }));

      return {
        success: true,
        enrollments: detailedEnrollments,
        count: detailedEnrollments.length
      };
    } catch (error) {
      console.error('Error getting student grade details:', error);
      throw new Error(`Lỗi lấy chi tiết điểm sinh viên: ${error.message}`);
    }
  }

  /**
   * Batch tính điểm final cho tất cả enrollments của một lớp học
   * 
   * @param {string} classSectionId - ID của class section
   * @returns {Promise<Object>} { success: boolean, calculated: number, errors: Array }
   */
  async calculateFinalGradesForClass(classSectionId) {
    try {
      const enrollments = await ClassEnrollment.find({
        classSection: classSectionId,
        status: 'completed'
      });

      let successCount = 0;
      const errors = [];

      for (const enrollment of enrollments) {
        try {
          const result = await this.calculateFinalGrade(enrollment._id);
          if (result.success) {
            successCount++;
          }
        } catch (err) {
          errors.push({
            enrollmentId: enrollment._id,
            error: err.message
          });
        }
      }

      return {
        success: true,
        message: `Tính điểm cho ${successCount} enrollments thành công`,
        calculated: successCount,
        errors,
        total: enrollments.length
      };
    } catch (error) {
      console.error('Error calculating grades for class:', error);
      throw new Error(`Lỗi tính điểm cho lớp: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả các enrollment có điểm của một sinh viên, group by semester
   * 
   * @param {string} studentId - ID của sinh viên
   * @returns {Promise<Object>} { success: boolean, enrollments: Array, groupedBySemester: Object }
   */
  async getMyGrades(studentId) {
    try {
      const enrollments = await ClassEnrollment.find({
        student: studentId,
        status: { $in: ['enrolled', 'completed', 'active'] }
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName')
        .sort({ createdAt: -1 })
        .lean();

      if (!enrollments || enrollments.length === 0) {
        return {
          success: true,
          message: 'Chưa có dữ liệu điểm',
          enrollments: [],
          groupedBySemester: {},
          semesters: []
        };
      }

      // Group by semester
      const groupedBySemester = {};
      const semesterSet = new Set();

      for (const enrollment of enrollments) {
        if (!enrollment.classSection) continue;

        const semesterNumber = enrollment.classSection.semester;
        const academicYear = enrollment.classSection.academicYear;
        const semesterKey = `${semesterNumber}-${academicYear}`;
        const semesterDisplay = `Kỳ ${semesterNumber} - ${academicYear}`;

        semesterSet.add(semesterKey);

        if (!groupedBySemester[semesterKey]) {
          groupedBySemester[semesterKey] = {
            semesterNumber,
            academicYear,
            semesterDisplay,
            enrollments: []
          };
        }

        groupedBySemester[semesterKey].enrollments.push({
          _id: enrollment._id,
          subjectCode: enrollment.classSection.subject?.subjectCode || 'N/A',
          subjectName: enrollment.classSection.subject?.subjectName || 'N/A',
          credits: enrollment.classSection.subject?.credits || 0,
          grade: enrollment.grade,
          midtermScore: enrollment.midtermScore,
          finalScore: enrollment.finalScore,
          assignmentScore: enrollment.assignmentScore,
          continuousScore: enrollment.continuousScore,
          classCode: enrollment.classSection.classCode,
          gradeComponents: {
            GK: enrollment.midtermScore,
            CK: enrollment.finalScore,
            BT: enrollment.assignmentScore,
            'Quá trình': enrollment.continuousScore
          }
        });
      }

      // Sort semesters (most recent first)
      const semesters = Array.from(semesterSet)
        .sort((a, b) => {
          const [semA, yearA] = a.split('-');
          const [semB, yearB] = b.split('-');
          const yearDiff = yearB.localeCompare(yearA);
          if (yearDiff !== 0) return yearDiff;
          return parseInt(semB) - parseInt(semA);
        });

      return {
        success: true,
        message: 'Lấy dữ liệu điểm thành công',
        enrollments,
        groupedBySemester,
        semesters,
        totalGrades: enrollments.length
      };
    } catch (error) {
      console.error('Error getting my grades:', error);
      throw new Error(`Lỗi lấy dữ liệu điểm: ${error.message}`);
    }
  }

  /**
   * Nhập điểm cho các sinh viên theo thành phần
   * Giáo viên nhập GK, CK, BT - Tính grade tự động
   * 
   * @param {Array} gradesData - Array of { enrollmentId, midtermScore, finalScore, assignmentScore, continuousScore }
   * @param {Object} options - { autoCalculate: boolean }
   * @returns {Promise<Object>} { success: boolean, updated: number, errors: Array }
   */
  async submitGrades(gradesData, options = { autoCalculate: true }) {
    try {
      if (!Array.isArray(gradesData) || gradesData.length === 0) {
        throw new Error('Dữ liệu điểm không hợp lệ');
      }

      let successCount = 0;
      const errors = [];
      const updatedEnrollments = [];

      for (const gradeUpdate of gradesData) {
        try {
          const { enrollmentId, midtermScore, finalScore, assignmentScore, continuousScore } = gradeUpdate;

          if (!enrollmentId) {
            errors.push({ enrollmentId: null, error: 'enrollmentId is required' });
            continue;
          }

          // Find enrollment
          const enrollment = await ClassEnrollment.findById(enrollmentId);
          if (!enrollment) {
            errors.push({ enrollmentId, error: 'Enrollment not found' });
            continue;
          }

          // Validate scores are within range
          const scores = { midtermScore, finalScore, assignmentScore, continuousScore };
          for (const [key, score] of Object.entries(scores)) {
            if (score !== null && score !== undefined && (score < 0 || score > 10)) {
              errors.push({ 
                enrollmentId, 
                error: `${key} phải nằm trong khoảng 0-10` 
              });
              continue;
            }
          }

          // Update only provided scores (не перезаписывать существующие)
          if (midtermScore !== null && midtermScore !== undefined) {
            enrollment.midtermScore = midtermScore;
          }
          if (finalScore !== null && finalScore !== undefined) {
            enrollment.finalScore = finalScore;
          }
          if (assignmentScore !== null && assignmentScore !== undefined) {
            enrollment.assignmentScore = assignmentScore;
          }
          if (continuousScore !== null && continuousScore !== undefined) {
            enrollment.continuousScore = continuousScore;
          }

          // Auto-calculate final grade if all components are provided
          if (options.autoCalculate && 
              enrollment.midtermScore !== null && 
              enrollment.finalScore !== null && 
              enrollment.assignmentScore !== null) {
            const calculatedGrade = 
              (enrollment.midtermScore * this.constructor.GRADE_WEIGHTS.midtermScore) +
              (enrollment.finalScore * this.constructor.GRADE_WEIGHTS.finalScore) +
              (enrollment.assignmentScore * this.constructor.GRADE_WEIGHTS.assignmentScore);
            enrollment.grade = parseFloat(calculatedGrade.toFixed(2));
          }

          // Save enrollment
          const saved = await enrollment.save();
          updatedEnrollments.push(saved);
          successCount++;
        } catch (err) {
          errors.push({
            enrollmentId: gradeUpdate?.enrollmentId,
            error: err.message
          });
        }
      }

      return {
        success: successCount > 0,
        message: `Cập nhật điểm cho ${successCount}/${gradesData.length} sinh viên thành công`,
        updated: successCount,
        total: gradesData.length,
        updatedEnrollments,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error submitting grades:', error);
      throw new Error(`Lỗi nhập điểm: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách sinh viên của một lớp học để nhập điểm
   * 
   * @param {string} classSectionId - ID của class section
   * @returns {Promise<Array>} Array of enrollments with student info
   */
  async getClassEnrollmentsForGrading(classSectionId) {
    try {
      const enrollments = await ClassEnrollment.find({
        classSection: classSectionId,
        status: { $in: ['enrolled', 'completed'] }
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName email')
        .select('student classSection midtermScore finalScore assignmentScore continuousScore grade status')
        .lean();

      if (!enrollments || enrollments.length === 0) {
        return {
          success: true,
          message: 'Không có sinh viên đăng ký lớp này',
          enrollments: [],
          count: 0
        };
      }

      return {
        success: true,
        message: 'Lấy danh sách sinh viên thành công',
        enrollments,
        count: enrollments.length,
        classInfo: enrollments[0]?.classSection
      };
    } catch (error) {
      console.error('Error getting class enrollments for grading:', error);
      throw new Error(`Lỗi lấy danh sách sinh viên: ${error.message}`);
    }
  }

  /**
   * Nộp điểm chính thức cho tất cả sinh viên trong lớp
   * Tính grade cuối cùng, lock điểm, ghi log
   * 
   * @param {string} classSectionId - ID lớp học
   * @returns {Promise<Object>} { success, message, processed, errors, classInfo }
   */
  async submitFinalClassGrades(classSectionId) {
    try {
      // Get all enrollments in class with incomplete grades
      const enrollments = await ClassEnrollment.find({
        classSection: classSectionId,
        status: { $in: ['enrolled', 'active'] }
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName');

      if (!enrollments || enrollments.length === 0) {
        return {
          success: false,
          message: 'Không có sinh viên để nộp điểm',
          processed: 0,
          errors: []
        };
      }

      let successCount = 0;
      const errors = [];
      const processedEnrollments = [];

      for (const enrollment of enrollments) {
        try {
          // Skip if no grades entered
          if (enrollment.midtermScore === null && enrollment.finalScore === null && enrollment.assignmentScore === null) {
            errors.push({
              studentCode: enrollment.student?.studentCode,
              error: 'Chưa nhập điểm nào'
            });
            continue;
          }

          // Skip if not all grades are entered (require all 3 components)
          if (enrollment.midtermScore === null || enrollment.finalScore === null || enrollment.assignmentScore === null) {
            errors.push({
              studentCode: enrollment.student?.studentCode,
              error: 'Chưa nhập đủ 3 thành phần điểm (GK, CK, BT)'
            });
            continue;
          }

          // Calculate final grade
          const gk = enrollment.midtermScore;
          const ck = enrollment.finalScore;
          const bt = enrollment.assignmentScore;
          const calculatedGrade = (gk * 0.3) + (ck * 0.5) + (bt * 0.2);
          const finalGrade = Math.round(calculatedGrade * 100) / 100;

          // Update enrollment
          enrollment.grade = finalGrade;
          enrollment.status = 'completed';
          enrollment.submittedAt = new Date();
          
          await enrollment.save();

          processedEnrollments.push({
            studentCode: enrollment.student?.studentCode,
            fullName: enrollment.student?.fullName,
            grade: finalGrade,
            components: {
              GK: gk,
              CK: ck,
              BT: bt,
              QT: enrollment.continuousScore
            }
          });

          successCount++;
        } catch (err) {
          errors.push({
            studentCode: enrollment.student?.studentCode,
            error: err.message
          });
        }
      }

      return {
        success: successCount > 0,
        message: `Nộp điểm thành công cho ${successCount}/${enrollments.length} sinh viên`,
        processed: successCount,
        total: enrollments.length,
        errors: errors.length > 0 ? errors : undefined,
        processedEnrollments,
        classInfo: enrollments[0]?.classSection
      };
    } catch (error) {
      console.error('Error submitting final class grades:', error);
      throw new Error(`Lỗi nộp điểm: ${error.message}`);
    }
  }
}

// Export instance
module.exports = new GradesService();
