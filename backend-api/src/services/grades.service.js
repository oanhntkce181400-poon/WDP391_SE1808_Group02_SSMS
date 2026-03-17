// grades.service.js
// Service xử lý tính toán điểm và quản lý grade
// Tác giả: Group02 - WDP391

const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection = require('../models/classSection.model');
const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const GradeChangeLog = require('../models/gradeChangeLog.model');
const mailer = require('../external/mailer');

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
   * Resolve teacher profile from authenticated user id.
   * We try userId first, then fallback to email mapping.
   */
  async resolveTeacherByUserId(userId) {
    if (!userId) return null;

    let teacher = await Teacher.findOne({ userId, isActive: true }).lean();
    if (teacher) return teacher;

    const user = await User.findById(userId).lean();
    if (!user?.email) return null;

    teacher = await Teacher.findOne({ email: user.email.toLowerCase(), isActive: true }).lean();
    return teacher;
  }

  /**
   * Check if current user can submit grade for a class.
   * - admin/staff: always allowed
   * - lecturer: only allowed when classSection.teacher matches teacher profile
   */
  async checkLecturerPermission({ userId, role, classSectionId }) {
    if (!classSectionId) {
      throw new Error('classSectionId is required');
    }

    if (role === 'admin' || role === 'staff') {
      return { allowed: true };
    }

    const normalizedRole = role === 'teacher' ? 'lecturer' : role;

    if (normalizedRole !== 'lecturer') {
      return {
        allowed: false,
        message: 'Bạn không có quyền nhập điểm cho lớp này'
      };
    }

    const teacher = await this.resolveTeacherByUserId(userId);
    if (!teacher) {
      return {
        allowed: false,
        message: 'Không tìm thấy hồ sơ giảng viên của tài khoản hiện tại'
      };
    }

    const classSection = await ClassSection.findById(classSectionId).select('teacher');
    if (!classSection) {
      return {
        allowed: false,
        message: 'Lớp học không tồn tại'
      };
    }

    const isOwnerLecturer = String(classSection.teacher) === String(teacher._id);
    if (!isOwnerLecturer) {
      return {
        allowed: false,
        message: 'Bạn không phải giảng viên phụ trách lớp này'
      };
    }

    return { allowed: true, teacherId: teacher._id };
  }

  /**
   * Validate score in range [0, 10].
   */
  validateScore(score, fieldName) {
    if (score === null || score === undefined) return;
    if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 10) {
      throw new Error(`${fieldName} phải nằm trong khoảng 0-10`);
    }
  }

  /**
   * Apply score fields to enrollment and auto-calculate final grade if enough data.
   */
  applyScoresToEnrollment(enrollment, { midtermScore, finalScore, otherScore, continuousScore }, autoCalculate) {
    if (midtermScore !== null && midtermScore !== undefined) {
      enrollment.midtermScore = midtermScore;
    }
    if (finalScore !== null && finalScore !== undefined) {
      enrollment.finalScore = finalScore;
    }
    if (otherScore !== null && otherScore !== undefined) {
      // Keep backward compatibility with existing schema: otherScore -> assignmentScore
      enrollment.assignmentScore = otherScore;
    }
    if (continuousScore !== null && continuousScore !== undefined) {
      enrollment.continuousScore = continuousScore;
    }

    if (
      autoCalculate &&
      enrollment.midtermScore !== null &&
      enrollment.finalScore !== null &&
      enrollment.assignmentScore !== null
    ) {
      const calculatedGrade =
        (enrollment.midtermScore * this.constructor.GRADE_WEIGHTS.midtermScore) +
        (enrollment.finalScore * this.constructor.GRADE_WEIGHTS.finalScore) +
        (enrollment.assignmentScore * this.constructor.GRADE_WEIGHTS.assignmentScore);
      enrollment.grade = parseFloat(calculatedGrade.toFixed(2));
    }
  }

  /**
   * Check enrollment can still be edited.
   */
  ensureEnrollmentEditable(enrollment) {
    const isFinalized = enrollment.isFinalized === true || enrollment.status === 'completed';
    if (isFinalized) {
      const error = new Error('Điểm đã finalized, không thể chỉnh sửa');
      error.statusCode = 400;
      throw error;
    }
  }

  buildGradePublishedEmail({ studentName, classCode, subjectName, grade, teacherName }) {
    return `
      <div style="font-family: Inter, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);">
          <div style="background: #1A237E; padding: 18px 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px;">SSMS - Cong bo diem chinh thuc</h2>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p style="margin-top: 0;">Xin chao <strong>${studentName || 'Sinh vien'}</strong>,</p>
            <p>Diem chinh thuc cua ban da duoc cong bo:</p>
            <ul style="line-height: 1.8; padding-left: 18px;">
              <li>Lop: <strong>${classCode || 'N/A'}</strong></li>
              <li>Mon hoc: <strong>${subjectName || 'N/A'}</strong></li>
              <li>Diem tong ket: <strong>${grade ?? 'N/A'}</strong></li>
              <li>Giang vien: <strong>${teacherName || 'N/A'}</strong></li>
            </ul>
            <p style="margin-bottom: 0; color: #64748b; font-size: 13px;">Vui long dang nhap he thong de xem chi tiet thanh phan diem.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build before/after snapshot for score logging.
   */
  buildScoreSnapshot(enrollment) {
    return {
      midtermScore: enrollment.midtermScore ?? null,
      finalScore: enrollment.finalScore ?? null,
      assignmentScore: enrollment.assignmentScore ?? null,
      continuousScore: enrollment.continuousScore ?? null,
      grade: enrollment.grade ?? null,
    };
  }

  /**
   * Return changed score fields between 2 snapshots.
   */
  getChangedFields(beforeScores, afterScores) {
    const fields = ['midtermScore', 'finalScore', 'assignmentScore', 'continuousScore', 'grade'];
    return fields.filter((field) => {
      const beforeValue = beforeScores[field] ?? null;
      const afterValue = afterScores[field] ?? null;
      return beforeValue !== afterValue;
    });
  }

  /**
   * PATCH /api/grades/:enrollmentId
   * Edit enrollment grades, check lecturer permission, and save change logs.
   */
  async updateEnrollmentGrade(enrollmentId, payload = {}, requester = {}) {
    const { userId, role } = requester;
    const { grade = {}, reason = '' } = payload;

    if (!enrollmentId) {
      const error = new Error('enrollmentId is required');
      error.statusCode = 400;
      throw error;
    }

    const enrollment = await ClassEnrollment.findById(enrollmentId)
      .populate('student', 'studentCode fullName')
      .populate('classSection', 'classCode teacher');

    if (!enrollment) {
      const error = new Error('Enrollment not found');
      error.statusCode = 404;
      throw error;
    }

    const permission = await this.checkLecturerPermission({
      userId,
      role,
      classSectionId: enrollment.classSection?._id || enrollment.classSection,
    });

    if (!permission.allowed) {
      const error = new Error(permission.message || 'Unauthorized');
      error.statusCode = 403;
      throw error;
    }

    this.ensureEnrollmentEditable(enrollment);

    const { midtermScore, finalScore, otherScore, continuousScore } = grade;
    this.validateScore(midtermScore, 'midtermScore');
    this.validateScore(finalScore, 'finalScore');
    this.validateScore(otherScore, 'otherScore');
    this.validateScore(continuousScore, 'continuousScore');

    const beforeScores = this.buildScoreSnapshot(enrollment);

    this.applyScoresToEnrollment(
      enrollment,
      { midtermScore, finalScore, otherScore, continuousScore },
      true
    );

    const afterScores = this.buildScoreSnapshot(enrollment);
    const changedFields = this.getChangedFields(beforeScores, afterScores);

    if (changedFields.length === 0) {
      const error = new Error('Không có thay đổi điểm để lưu');
      error.statusCode = 400;
      throw error;
    }

    const savedEnrollment = await enrollment.save();

    const savedLog = await GradeChangeLog.create({
      enrollment: savedEnrollment._id,
      classSection: savedEnrollment.classSection?._id || savedEnrollment.classSection,
      student: savedEnrollment.student?._id || savedEnrollment.student,
      changedBy: userId,
      changedByRole: role || 'lecturer',
      reason: String(reason || '').trim(),
      changedFields,
      beforeScores,
      afterScores,
    });

    return {
      success: true,
      message: 'Cập nhật điểm thành công',
      data: {
        enrollment: savedEnrollment,
        logId: savedLog._id,
        changedFields,
      },
    };
  }

  /**
   * GET /api/grades/:enrollmentId/change-logs
   * Get grade change logs of one enrollment.
   */
  async getEnrollmentGradeChangeLogs(enrollmentId, requester = {}) {
    const { userId, role } = requester;

    if (!enrollmentId) {
      const error = new Error('enrollmentId is required');
      error.statusCode = 400;
      throw error;
    }

    const enrollment = await ClassEnrollment.findById(enrollmentId)
      .select('classSection')
      .lean();

    if (!enrollment) {
      const error = new Error('Enrollment not found');
      error.statusCode = 404;
      throw error;
    }

    const permission = await this.checkLecturerPermission({
      userId,
      role,
      classSectionId: enrollment.classSection,
    });

    if (!permission.allowed) {
      const error = new Error(permission.message || 'Unauthorized');
      error.statusCode = 403;
      throw error;
    }

    const logs = await GradeChangeLog.find({ enrollment: enrollmentId })
      .populate('changedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Lấy log thay đổi điểm thành công',
      data: logs,
    };
  }

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
  async submitGrades(payload, options = {}) {
    try {
      const autoCalculate = options.autoCalculate !== false;
      const requester = options.requester || {};

      // New format from requirement:
      // { studentId, classSectionId, grade: { midtermScore, finalScore, otherScore } }
      const isSinglePayload = payload && !Array.isArray(payload) && payload.studentId && payload.classSectionId;

      // Old format (keep existing flow unchanged):
      // [{ enrollmentId, midtermScore, finalScore, assignmentScore, continuousScore }, ...]
      const isBatchPayload = Array.isArray(payload);

      if (!isSinglePayload && !isBatchPayload) {
        throw new Error('Dữ liệu điểm không hợp lệ');
      }

      // --- Single mode ---
      if (isSinglePayload) {
        const { studentId, classSectionId, grade = {} } = payload;
        const { midtermScore, finalScore, otherScore } = grade;

        const permission = await this.checkLecturerPermission({
          userId: requester.userId,
          role: requester.role,
          classSectionId
        });
        if (!permission.allowed) {
          const permissionError = new Error(permission.message || 'Unauthorized');
          permissionError.statusCode = 403;
          throw permissionError;
        }

        this.validateScore(midtermScore, 'midtermScore');
        this.validateScore(finalScore, 'finalScore');
        this.validateScore(otherScore, 'otherScore');

        const enrollment = await ClassEnrollment.findOne({
          student: studentId,
          classSection: classSectionId,
          status: { $in: ['enrolled', 'completed'] }
        });

        if (!enrollment) {
          throw new Error('Không tìm thấy enrollment của sinh viên trong lớp này');
        }

        this.ensureEnrollmentEditable(enrollment);

        this.applyScoresToEnrollment(
          enrollment,
          { midtermScore, finalScore, otherScore },
          autoCalculate
        );

        const saved = await enrollment.save();

        return {
          success: true,
          message: 'Nhập điểm thành công',
          updated: 1,
          total: 1,
          updatedEnrollment: saved
        };
      }

      // --- Batch mode (backward compatible) ---
      if (!isBatchPayload || payload.length === 0) {
        throw new Error('Dữ liệu điểm không hợp lệ');
      }

      let successCount = 0;
      const errors = [];
      const updatedEnrollments = [];

      for (const gradeUpdate of payload) {
        try {
          const { enrollmentId, midtermScore, finalScore, assignmentScore, continuousScore } = gradeUpdate;

          if (!enrollmentId) {
            errors.push({ enrollmentId: null, error: 'enrollmentId is required' });
            continue;
          }

          const enrollment = await ClassEnrollment.findById(enrollmentId);
          if (!enrollment) {
            errors.push({ enrollmentId, error: 'Enrollment not found' });
            continue;
          }

          this.ensureEnrollmentEditable(enrollment);

          if (requester.role === 'lecturer' || requester.role === 'teacher') {
            const permission = await this.checkLecturerPermission({
              userId: requester.userId,
              role: requester.role,
              classSectionId: enrollment.classSection
            });
            if (!permission.allowed) {
              errors.push({ enrollmentId, error: permission.message || 'Unauthorized' });
              continue;
            }
          }

          this.validateScore(midtermScore, 'midtermScore');
          this.validateScore(finalScore, 'finalScore');
          this.validateScore(assignmentScore, 'assignmentScore');
          this.validateScore(continuousScore, 'continuousScore');

          this.applyScoresToEnrollment(
            enrollment,
            {
              midtermScore,
              finalScore,
              otherScore: assignmentScore,
              continuousScore
            },
            autoCalculate
          );

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
        message: `Cập nhật điểm cho ${successCount}/${payload.length} sinh viên thành công`,
        updated: successCount,
        total: payload.length,
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
  async getClassEnrollmentsForGrading(classSectionId, requester = {}) {
    try {
      const permission = await this.checkLecturerPermission({
        userId: requester.userId,
        role: requester.role,
        classSectionId
      });

      if (!permission.allowed) {
        const permissionError = new Error(permission.message || 'Unauthorized');
        permissionError.statusCode = 403;
        throw permissionError;
      }

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
        .select('student classSection midtermScore finalScore assignmentScore continuousScore grade status isFinalized submittedAt')
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
  async submitFinalClassGrades(classSectionId, options = {}) {
    try {
      const requester = options.requester || {};
      const io = options.io;

      const permission = await this.checkLecturerPermission({
        userId: requester.userId,
        role: requester.role,
        classSectionId
      });

      if (!permission.allowed) {
        const permissionError = new Error(permission.message || 'Unauthorized');
        permissionError.statusCode = 403;
        throw permissionError;
      }

      // Get all not-yet-finalized enrollments in class.
      const enrollments = await ClassEnrollment.find({
        classSection: classSectionId,
        status: { $in: ['enrolled', 'completed'] },
        isFinalized: { $ne: true }
      })
        .populate({
          path: 'classSection',
          populate: {
            path: 'subject',
            select: 'subjectCode subjectName credits'
          }
        })
        .populate('student', 'studentCode fullName email userId');

      if (!enrollments || enrollments.length === 0) {
        return {
          success: false,
          message: 'Không có sinh viên để nộp điểm',
          processed: 0,
          errors: []
        };
      }

      let successCount = 0;
      let emailCount = 0;
      let notificationCount = 0;
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
          enrollment.isFinalized = true;
          enrollment.submittedAt = new Date();
          
          await enrollment.save();

          const studentName = enrollment.student?.fullName || 'Sinh vien';
          const studentEmail = enrollment.student?.email;
          const studentUserId = enrollment.student?.userId;
          const classCode = enrollment.classSection?.classCode || 'N/A';
          const subjectName = enrollment.classSection?.subject?.subjectName || 'N/A';

          if (studentUserId && io && typeof io.sendToUser === 'function') {
            io.sendToUser(String(studentUserId), 'grade-finalized', {
              type: 'grade-finalized',
              title: 'Cong bo diem chinh thuc',
              message: `${subjectName} (${classCode}) da duoc cong bo diem`,
              classSectionId,
              grade: finalGrade,
              studentCode: enrollment.student?.studentCode,
              publishedAt: enrollment.submittedAt,
            });
            notificationCount += 1;
          }

          if (studentEmail) {
            const emailHtml = this.buildGradePublishedEmail({
              studentName,
              classCode,
              subjectName,
              grade: finalGrade,
              teacherName: requester.role || 'Giang vien',
            });

            const emailResult = await mailer.sendMail({
              to: studentEmail,
              subject: `[SSMS] Cong bo diem ${subjectName}`,
              text: `Diem chinh thuc cua ban cho ${subjectName} (${classCode}) la ${finalGrade}.`,
              html: emailHtml,
            });

            if (emailResult?.sent) {
              emailCount += 1;
            }
          }

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
        notificationsSent: notificationCount,
        emailsSent: emailCount,
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
