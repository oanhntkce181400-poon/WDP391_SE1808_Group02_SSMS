// grades.service.js
// Service xử lý tính toán điểm và quản lý grade
// Tác giả: Group02 - WDP391

const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection = require('../models/classSection.model');
const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const GradeChangeLog = require('../models/gradeChangeLog.model');
const scoreComponentService = require('./scoreComponent.service');
const emailTemplateService = require('./emailTemplate.service');
const notificationEmailService = require('./notificationEmail.service');

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
   * Calculate PT average from multiple PT scores
   * @param {Array} ptScores - Array of PT score objects: [{type, score}, ...]
   * @returns {Number} Average of all PT scores, or null if no PT scores
   */
  calculatePTAverage(ptScores) {
    if (!ptScores || !Array.isArray(ptScores) || ptScores.length === 0) {
      return null;
    }
    const sum = ptScores.reduce((acc, item) => acc + item.score, 0);
    return parseFloat((sum / ptScores.length).toFixed(2));
  }

  /**
   * Get grading weights from subject or use defaults
   * @param {Object} subject - Subject document with gradingWeights
   * @returns {Object} Grading weights: {GK, CK, BT, PT, QT}
   */
  getGradingWeights(subject) {
    const Subject = require('../models/subject.model');
    
    // Use subject's grading weights if available, otherwise use defaults
    if (subject && subject.gradingWeights) {
      return {
        GK: subject.gradingWeights.GK || 30,
        CK: subject.gradingWeights.CK || 50,
        BT: subject.gradingWeights.BT || 20,
        PT: subject.gradingWeights.PT || 0,
        QT: subject.gradingWeights.QT || 0
      };
    }
    
    // Default weights
    return {
      GK: 30,  // Giữa kỳ
      CK: 50,  // Cuối kỳ
      BT: 0,   // Bài tập (assignment)
      PT: 20,  // Kiểm tra thường xuyên (practical/progress tests)
      QT: 0    // Quá trình
    };
  }

  /**
   * Calculate final grade with dynamic formula based on subject weights
   * @param {Object} enrollment - ClassEnrollment document with all score fields
   * @param {Object} weights - Grading weights {GK, CK, BT, PT, QT}
   * @returns {Number} Calculated final grade, or null if insufficient data
   */
  calculateGradeWithDynamicWeights(enrollment, weights) {
    // Minimum requirement: both GK and CK must be provided
    if (enrollment.midtermScore === null || enrollment.finalScore === null) {
      return null;
    }

    let calculatedGrade = 0;
    let totalWeight = 0;

    // Calculate GK (Giữa kỳ) contribution
    if (weights.GK > 0) {
      calculatedGrade += enrollment.midtermScore * (weights.GK / 100);
      totalWeight += weights.GK;
    }

    // Calculate CK (Cuối kỳ) contribution
    if (weights.CK > 0) {
      calculatedGrade += enrollment.finalScore * (weights.CK / 100);
      totalWeight += weights.CK;
    }

    // Calculate BT (Bài tập) contribution if available
    if (weights.BT > 0 && enrollment.assignmentScore !== null) {
      calculatedGrade += enrollment.assignmentScore * (weights.BT / 100);
      totalWeight += weights.BT;
    }

    // Calculate PT (Kiểm tra thường xuyên) average if available
    if (weights.PT > 0) {
      const ptAverage = this.calculatePTAverage(enrollment.ptScores);
      if (ptAverage !== null) {
        calculatedGrade += ptAverage * (weights.PT / 100);
        totalWeight += weights.PT;
      }
    }

    // Calculate QT (Quá trình) contribution if available
    if (weights.QT > 0 && enrollment.continuousScore !== null) {
      calculatedGrade += enrollment.continuousScore * (weights.QT / 100);
      totalWeight += weights.QT;
    }

    // Normalize if not all weights are used
    if (totalWeight > 0 && totalWeight !== 100) {
      calculatedGrade = (calculatedGrade / totalWeight) * 100;
    }

    return parseFloat(calculatedGrade.toFixed(2));
  }

  /**
   * Apply score fields to enrollment and auto-calculate final grade based on subject's grading weights.
   * Async version to fetch subject data.
   */
  async applyScoresToEnrollmentAsync(enrollment, { midtermScore, finalScore, otherScore, continuousScore, ptScores }, subject, autoCalculate) {
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
    if (ptScores !== null && ptScores !== undefined && Array.isArray(ptScores)) {
      enrollment.ptScores = ptScores;
    }

    if (autoCalculate) {
      // Get grading weights from subject
      const weights = this.getGradingWeights(subject);
      
      // Calculate grade using dynamic weights
      const calculatedGrade = this.calculateGradeWithDynamicWeights(enrollment, weights);
      if (calculatedGrade !== null) {
        enrollment.grade = calculatedGrade;
      }
    }
  }

  /**
   * Synchronous version for backward compatibility
   * Uses default weights from static GRADE_WEIGHTS
   */
  applyScoresToEnrollment(enrollment, { midtermScore, finalScore, otherScore, continuousScore, ptScores }, autoCalculate) {
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
    if (ptScores !== null && ptScores !== undefined && Array.isArray(ptScores)) {
      enrollment.ptScores = ptScores;
    }

    if (autoCalculate) {
      // Calculate grade if at least GK and CK are provided (minimum requirement)
      if (enrollment.midtermScore !== null && enrollment.finalScore !== null) {
        let calculatedGrade = 0;
        
        // Always include GK and CK
        calculatedGrade += enrollment.midtermScore * this.constructor.GRADE_WEIGHTS.midtermScore; // 30%
        calculatedGrade += enrollment.finalScore * this.constructor.GRADE_WEIGHTS.finalScore;     // 50%
        
        // Add BT (Assignment) if provided, otherwise distribute its weight to CK
        if (enrollment.assignmentScore !== null) {
          calculatedGrade += enrollment.assignmentScore * this.constructor.GRADE_WEIGHTS.assignmentScore; // 20%
        } else {
          // If BT not provided, distribute BT's 20% weight to CK
          calculatedGrade += enrollment.finalScore * 0.2;
        }
        
        enrollment.grade = parseFloat(calculatedGrade.toFixed(2));
      }
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

  buildGradePublishedEmail({ studentName, classCode, subjectName, grade, teacherName, scoreComponents = {} }) {
    return emailTemplateService.renderSystemTemplateFallback('GRADE_PUBLISHED', {
      studentName: studentName || 'Sinh vien',
      classCode: classCode || 'N/A',
      subjectName: subjectName || 'N/A',
      grade: grade ?? 'N/A',
      teacherName: teacherName || 'N/A',
      gk: scoreComponents.gk ?? '',
      ck: scoreComponents.ck ?? '',
      pt: scoreComponents.pt ?? '',
      bt: scoreComponents.bt ?? '',
      qt: scoreComponents.qt ?? '',
      ptAverage: scoreComponents.ptAverage ?? '',
    }).html;
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
      ptScores: enrollment.ptScores ?? [],
      grade: enrollment.grade ?? null,
    };
  }

  /**
   * Return changed score fields between 2 snapshots.
   */
  getChangedFields(beforeScores, afterScores) {
    const fields = ['midtermScore', 'finalScore', 'assignmentScore', 'continuousScore', 'grade'];
    const changedFields = fields.filter((field) => {
      const beforeValue = beforeScores[field] ?? null;
      const afterValue = afterScores[field] ?? null;
      return beforeValue !== afterValue;
    });

    // Check if ptScores changed
    const beforePT = JSON.stringify(beforeScores.ptScores ?? []);
    const afterPT = JSON.stringify(afterScores.ptScores ?? []);
    if (beforePT !== afterPT) {
      changedFields.push('ptScores');
    }

    return changedFields;
  }

  /**
   * PATCH /api/grades/:enrollmentId
   * Edit enrollment grades, check lecturer permission, and save change logs.
   */
  async updateEnrollmentGrade(enrollmentId, payload = {}, requester = {}) {
    const { userId, role } = requester;
    const { grade = {}, reason = '' } = payload;

    console.log('[updateEnrollmentGrade] Received grade payload:', JSON.stringify(grade, null, 2));

    if (!enrollmentId) {
      const error = new Error('enrollmentId is required');
      error.statusCode = 400;
      throw error;
    }

    const enrollment = await ClassEnrollment.findById(enrollmentId)
      .populate('student', 'studentCode fullName')
      .populate({
        path: 'classSection',
        select: 'classCode teacher subject',
        populate: {
          path: 'subject',
          select: 'subjectCode subjectName gradingWeights'
        }
      });

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

    const { midtermScore, finalScore, otherScore, continuousScore, ptScores } = grade;
    this.validateScore(midtermScore, 'midtermScore');
    this.validateScore(finalScore, 'finalScore');
    this.validateScore(otherScore, 'otherScore');
    this.validateScore(continuousScore, 'continuousScore');

    // Validate ptScores if provided
    if (ptScores !== null && ptScores !== undefined && Array.isArray(ptScores)) {
      ptScores.forEach(pt => {
        if (pt.type && !['PT1', 'PT2', 'PT3'].includes(pt.type)) {
          const error = new Error('Invalid PT type. Must be PT1, PT2, or PT3');
          error.statusCode = 400;
          throw error;
        }
        this.validateScore(pt.score, `ptScores[${pt.type}].score`);
      });
    }

    const beforeScores = this.buildScoreSnapshot(enrollment);

    // Use async version to get subject's grading weights
    const subject = enrollment.classSection?.subject || null;
    await this.applyScoresToEnrollmentAsync(
      enrollment,
      { midtermScore, finalScore, otherScore, continuousScore, ptScores },
      subject,
      true
    );

    console.log('[updateEnrollmentGrade] After apply - enrollment.ptScores:', JSON.stringify(enrollment.ptScores, null, 2));

    const afterScores = this.buildScoreSnapshot(enrollment);
    const changedFields = this.getChangedFields(beforeScores, afterScores);

    if (changedFields.length === 0) {
      const error = new Error('Không có thay đổi điểm để lưu');
      error.statusCode = 400;
      throw error;
    }

    const savedEnrollment = await enrollment.save();

    console.log('[updateEnrollmentGrade] Saved enrollment ptScores:', JSON.stringify(savedEnrollment.ptScores, null, 2));
    console.log('[updateEnrollmentGrade] Change log - beforeScores:', JSON.stringify(beforeScores, null, 2));
    console.log('[updateEnrollmentGrade] Change log - afterScores:', JSON.stringify(afterScores, null, 2));

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

    console.log('[getEnrollmentGradeChangeLogs] Found', logs.length, 'logs for enrollment:', enrollmentId);
    if (logs.length > 0) {
      console.log('[getEnrollmentGradeChangeLogs] First log afterScores:', JSON.stringify(logs[0].afterScores, null, 2));
    }

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
            select: 'subjectCode subjectName credits gradingWeights'
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

      // Filter to only include enrollments with grades (at least GK and CK)
      result = result.filter(e => e.midtermScore !== null && e.finalScore !== null);

      // Add processed grade details to each enrollment
      const detailedEnrollments = result.map(e => {
        // Recalculate final grade from component scores dynamically
        let recalculatedGrade = e.grade; // default to stored grade
        
        const weights = e.classSection?.subject?.gradingWeights || {
          GK: 30,
          CK: 50,
          BT: 0,
          PT: 20,
          QT: 0
        };
        
        // Recalculate using dynamic weights
        if (e.midtermScore !== null && e.finalScore !== null) {
          let grade = (e.midtermScore * 0.3) + (e.finalScore * 0.5);
          
          // Check if assignment score exists
          if (e.assignmentScore !== null) {
            grade += e.assignmentScore * 0.2;
            recalculatedGrade = parseFloat(grade.toFixed(2));
          }
          // Check if PT scores exist
          else if (e.ptScores && Array.isArray(e.ptScores) && e.ptScores.length > 0) {
            const ptAverage = e.ptScores.reduce((sum, pt) => sum + pt.score, 0) / e.ptScores.length;
            grade += ptAverage * 0.2;
            recalculatedGrade = parseFloat(grade.toFixed(2));
          }
          // If neither, scale up
          else {
            recalculatedGrade = parseFloat((grade / 0.8).toFixed(2));
          }
        }
        
        return {
          ...e,
          gradingWeights: weights,
          gradeComponents: {
            GK: e.midtermScore,
            CK: e.finalScore,
            BT: e.assignmentScore,
            PT: e.ptScores?.length > 0 
              ? parseFloat((e.ptScores.reduce((sum, pt) => sum + pt.score, 0) / e.ptScores.length).toFixed(2))
              : null,
            'Quá trình': e.continuousScore
          },
          finalGrade: recalculatedGrade,  // Use recalculated grade, not stored
          allComponentsProvided: e.midtermScore !== null && e.finalScore !== null && e.assignmentScore !== null
        };
      });

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
      console.log('📊 [Grades Service] getMyGrades starting, studentId:', studentId);
      
      const ClassSection = require('../models/classSection.model');
      const Subject = require('../models/subject.model');

      // Get enrollments with classSection populated
      // Only show grades when instructor has submitted/saved (submittedAt !== null)
      const enrollments = await ClassEnrollment.find({
        student: studentId,
        submittedAt: { $ne: null }  // ← Chỉ lấy khi giáo viên đã lưu điểm
      })
        .populate('classSection')
        .sort({ createdAt: -1 })
        .lean();

      console.log('📊 [Grades Service] Found enrollments:', enrollments?.length || 0);
      if (enrollments && enrollments.length > 0) {
        console.log('   First enrollment:', {
          _id: enrollments[0]._id,
          classSection: enrollments[0].classSection?._id,
          grade: enrollments[0].grade
        });
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('⚠️ [Grades Service] No enrollments found, returning empty');
        return {
          semesterGroups: [],
          overallGPA: 0.00
        };
      }

      // Get all subject IDs from classSection
      const subjectIds = [];
      const classData = {};
      
      for (const enrollment of enrollments) {
        if (enrollment.classSection?.subject) {
          subjectIds.push(enrollment.classSection.subject);
          if (!classData[enrollment.classSection._id]) {
            classData[enrollment.classSection._id] = {
              semester: enrollment.classSection.semester,
              academicYear: enrollment.classSection.academicYear,
              subjectId: enrollment.classSection.subject
            };
          }
        }
      }

      console.log('📊 [Grades Service] Subject IDs to fetch:', subjectIds.length);

      // Fetch all subjects
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean().exec();
      
      console.log('📊 [Grades Service] Fetched subjects:', subjects?.length || 0);

      const subjectMap = {};
      subjects.forEach(s => {
        subjectMap[s._id.toString()] = s;
      });

      // Group by semester and calculate GPA
      const groupedBySemester = {};
      let totalWeightedPoints = 0;
      let totalCredits = 0;

      for (const enrollment of enrollments) {
        if (!enrollment.classSection) continue;

        const cs = classData[enrollment.classSection._id];
        if (!cs) continue;

        const { semester, academicYear, subjectId } = cs;
        const subject = subjectMap[subjectId.toString()];
        
        if (!semester || !academicYear || !subject) {
          console.log('⚠️ [Grades Service] Skipping enrollment - missing data:', {
            semester,
            academicYear,
            hasSubject: !!subject
          });
          continue;
        }

        const semesterKey = `${semester}-${academicYear}`;
        const credits = subject?.credits || 0;

        // Recalculate grade from component scores (same as gpaService)
        // Formula: GK 30% + CK 50% + PT 20%
        let calculatedGrade = enrollment.grade || 0;

        if (enrollment.midtermScore !== null && enrollment.finalScore !== null) {
          let grade = (enrollment.midtermScore * 0.3) + (enrollment.finalScore * 0.5);
          
          // Priority 1: Use PT (ProgressTest) scores
          if (enrollment.ptScores && Array.isArray(enrollment.ptScores) && enrollment.ptScores.length > 0) {
            const ptAverage = enrollment.ptScores.reduce((sum, pt) => sum + pt.score, 0) / enrollment.ptScores.length;
            grade += ptAverage * 0.2;
            calculatedGrade = parseFloat(grade.toFixed(2));
          }
          // Priority 2: Use QT (Continuous) scores if available
          else if (enrollment.continuousScore !== null) {
            grade += enrollment.continuousScore * 0.2;
            calculatedGrade = parseFloat(grade.toFixed(2));
          }
          // Priority 3: If neither PT nor QT available, use BT (Assignment) if available
          else if (enrollment.assignmentScore !== null) {
            grade += enrollment.assignmentScore * 0.2;
            calculatedGrade = parseFloat(grade.toFixed(2));
          }
          // Priority 4: If none available, scale up GK + CK to 10-point scale
          else {
            calculatedGrade = parseFloat((grade / 0.8).toFixed(2));
          }
        }

        if (!groupedBySemester[semesterKey]) {
          groupedBySemester[semesterKey] = {
            semester: semester,
            academicYear: academicYear,
            totalCredits: 0,
            totalWeightedPoints: 0,
            enrollments: []
          };
        }

        groupedBySemester[semesterKey].enrollments.push({
          _id: enrollment._id,
          subjectCode: subject?.subjectCode || 'N/A',
          subjectName: subject?.subjectName || 'N/A',
          credits: credits,
          grade: calculatedGrade,
          subject: {
            subjectCode: subject?.subjectCode || 'N/A',
            subjectName: subject?.subjectName || 'N/A',
            credits: credits
          },
          midtermScore: enrollment.midtermScore,
          finalScore: enrollment.finalScore,
          assignmentScore: enrollment.assignmentScore,
          continuousScore: enrollment.continuousScore,
          ptScores: enrollment.ptScores || [],
          status: enrollment.status,
          gradeLabel: this.getGradeLabel(calculatedGrade)
        });

        groupedBySemester[semesterKey].totalCredits += credits;
        groupedBySemester[semesterKey].totalWeightedPoints += calculatedGrade * credits;
        totalCredits += credits;
        totalWeightedPoints += calculatedGrade * credits;
      }

      // Calculate semester GPA and prepare response
      const semesterGroups = Object.values(groupedBySemester).map(group => ({
        semester: group.semester,
        academicYear: group.academicYear,
        totalCredits: group.totalCredits,
        totalWeightedPoints: group.totalWeightedPoints,
        semesterGPA: group.totalCredits > 0 
          ? (group.totalWeightedPoints / group.totalCredits).toFixed(2)
          : '0.00',
        enrollments: group.enrollments
      }));

      // Calculate overall GPA
      const overallGPA = totalCredits > 0 
        ? (totalWeightedPoints / totalCredits).toFixed(2)
        : '0.00';

      console.log('📊 [Grades Service] Final result:', {
        semesterGroupsCount: semesterGroups.length,
        overallGPA,
        totalCredits,
        totalWeightedPoints
      });

      return {
        semesterGroups,
        overallGPA
      };
    } catch (error) {
      console.error('❌ [Grades Service] Error getting my grades:', error);
      throw new Error(`Lỗi lấy dữ liệu điểm: ${error.message}`);
    }
  }

  getGradeLabel(grade) {
    const g = Number(grade);
    if (Number.isNaN(g)) return 'N/A';
    if (g >= 8.5) return 'Xuất sắc';
    if (g >= 8.0) return 'Giỏi';
    if (g >= 7.0) return 'Khá';
    if (g >= 5.5) return 'Trung bình';
    if (g >= 4.0) return 'Yếu';
    return 'Kém';
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
        const { midtermScore, finalScore, otherScore, ptScores } = grade;

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

        // Validate ptScores if provided
        if (ptScores !== null && ptScores !== undefined && Array.isArray(ptScores)) {
          ptScores.forEach(pt => {
            if (pt.type && !['PT1', 'PT2', 'PT3'].includes(pt.type)) {
              const error = new Error('Invalid PT type. Must be PT1, PT2, or PT3');
              error.statusCode = 400;
              throw error;
            }
            this.validateScore(pt.score, `ptScores[${pt.type}].score`);
          });
        }

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
          { midtermScore, finalScore, otherScore, ptScores },
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
        .select('student classSection midtermScore finalScore assignmentScore continuousScore ptScores grade status isFinalized submittedAt')
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
          if (enrollment.midtermScore === null && enrollment.finalScore === null && enrollment.assignmentScore === null && (!enrollment.ptScores || enrollment.ptScores.length === 0)) {
            errors.push({
              studentCode: enrollment.student?.studentCode,
              error: 'Chua nhap diem nao'
            });
            continue;
          }

          // Skip if minimum required grades not entered (need GK + CK at minimum)
          if (enrollment.midtermScore === null || enrollment.finalScore === null) {
            errors.push({
              studentCode: enrollment.student?.studentCode,
              error: 'Chua nhap du 2 thanh phan toi thieu (GK, CK)'
            });
            continue;
          }

          // Calculate final grade with new formula: GK×30% + CK×50% + PT×20%
          const gk = enrollment.midtermScore;
          const ck = enrollment.finalScore;
          const bt = enrollment.assignmentScore; // Keep for display but not in calculation
          const qt = enrollment.continuousScore; // Keep for display
          
          let finalGrade = (gk * 0.3) + (ck * 0.5);
          let ptAverage = null;
          
          // Add PT scores if available
          if (enrollment.ptScores && enrollment.ptScores.length > 0) {
            const ptSum = enrollment.ptScores.reduce((sum, pt) => sum + (pt.score || 0), 0);
            ptAverage = Math.round((ptSum / enrollment.ptScores.length) * 100) / 100;
            finalGrade += ptAverage * 0.2;
          } else {
            // If no PT scores, scale up the existing component weights
            finalGrade = finalGrade / 0.8;
          }
          
          finalGrade = Math.round(finalGrade * 100) / 100;

          // Update enrollment
          enrollment.grade = finalGrade;
          enrollment.status = 'completed';
          enrollment.isFinalized = true;
          enrollment.submittedAt = new Date();
          
          await enrollment.save();

          const studentName = enrollment.student?.fullName || 'Sinh viên';
          const studentEmail = enrollment.student?.email;
          const studentUserId = enrollment.student?.userId;
          const classCode = enrollment.classSection?.classCode || 'N/A';
          const subjectName = enrollment.classSection?.subject?.subjectName || 'N/A';

          if (studentUserId && io && typeof io.sendToUser === 'function') {
            io.sendToUser(String(studentUserId), 'grade-finalized', {
              type: 'grade-finalized',
              title: 'Công bố điểm chính thức',
              message: `${subjectName} (${classCode}) đã được công bố điểm`,
              classSectionId,
              grade: finalGrade,
              studentCode: enrollment.student?.studentCode,
              publishedAt: enrollment.submittedAt,
            });
            notificationCount += 1;
          }

          if (studentEmail) {
            const templateVariables = {
              studentName,
              classCode,
              subjectName,
              grade: finalGrade,
              teacherName: requester.fullName || requester.role || 'Giang vien',
              scoreComponents: {
                gk,
                ck,
                pt: enrollment.ptScores && enrollment.ptScores.length > 0 ? enrollment.ptScores.length + ' lan' : null,
                bt,
                qt,
                ptAverage,
              },
            };

            const emailResult = await notificationEmailService.sendGradePublishedEmail({
              studentEmail,
              variables: templateVariables,
              fallback: () => ({
                subject: `[SSMS] Cong bo diem ${subjectName}`,
                text: `Diem chinh thuc cua ban cho ${subjectName} (${classCode}) la ${finalGrade}.`,
                html: this.buildGradePublishedEmail(templateVariables),
              }),
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
              PT: ptAverage,
              BT: bt,
              QT: qt
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

  /**
   * Tính điểm cuối cùng với công thức động từ ScoreComponent
   * @param {Object} enrollment - Enrollment document với tất cả scores
   * @param {Object} scoreComponent - ScoreComponent definition
   * @returns {Promise<number>} Điểm cuối cùng
   */
  async calculateGradeWithScoreComponent(enrollment, scoreComponent) {
    try {
      if (!enrollment || !scoreComponent) {
        console.warn('[GradesService] Missing enrollment or scoreComponent for calculation');
        return null;
      }

      const enrollmentScores = {
        ptScores: enrollment.ptScores || [],
        midtermScore: enrollment.midtermScore,
        finalScore: enrollment.finalScore,
        assignmentScore: enrollment.assignmentScore,
        continuousScore: enrollment.continuousScore
      };

      const finalScore = scoreComponentService.calculateFinalScore(enrollmentScores, scoreComponent);
      return finalScore;
    } catch (error) {
      console.error('[GradesService] Error calculating grade with score component:', error);
      return null;
    }
  }

  /**
   * Apply scores to enrollment với công thức động
   * @param {Object} enrollment - Enrollment document
   * @param {Object} scores - { midtermScore, finalScore, otherScore, continuousScore, ptScores }
   * @param {Object} scoreComponent - ScoreComponent definition
   */
  async applyScoresToEnrollmentWithComponent(enrollment, scores, scoreComponent) {
    try {
      // Apply individual scores first
      this.applyScoresToEnrollment(enrollment, scores, false);

      // Calculate grade using score component
      if (scoreComponent) {
        const finalGrade = await this.calculateGradeWithScoreComponent(enrollment, scoreComponent);
        if (finalGrade !== null) {
          enrollment.grade = finalGrade;
        }
      }
    } catch (error) {
      console.error('[GradesService] Error applying scores with component:', error);
      throw error;
    }
  }

  /**
   * Lấy ScoreComponent cho một ClassSection/Subject
   * @param {string} classSectionId - ID của class section
   * @returns {Promise<Object>} ScoreComponent hoặc null
   */
  async getScoreComponentForClassSection(classSectionId) {
    try {
      const classSection = await ClassSection.findById(classSectionId)
        .select('subject')
        .lean();

      if (!classSection) {
        return null;
      }

      const scoreComponent = await scoreComponentService.getScoreComponentBySubject(classSection.subject);
      return scoreComponent;
    } catch (error) {
      console.error('[GradesService] Error getting score component for class section:', error);
      return null;
    }
  }
}

// Export instance
module.exports = new GradesService();
