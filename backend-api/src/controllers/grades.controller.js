// grades.controller.js
// Controller xử lý HTTP requests cho Grade Management
// Tác giả: Group02 - WDP391

const gradesService = require('../services/grades.service');

class GradesController {
  /**
   * PATCH /api/grades/:enrollmentId
   * Sửa điểm theo enrollment, có kiểm tra quyền + lưu log thay đổi
   */
  async updateEnrollmentGrade(req, res) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          message: 'enrollmentId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await gradesService.updateEnrollmentGrade(enrollmentId, req.body, {
        userId,
        role
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] updateEnrollmentGrade error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update enrollment grade'
      });
    }
  }

  /**
   * GET /api/grades/:enrollmentId/change-logs
   * Lấy lịch sử thay đổi điểm của enrollment
   */
  async getGradeChangeLogs(req, res) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          message: 'enrollmentId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await gradesService.getEnrollmentGradeChangeLogs(enrollmentId, {
        userId,
        role
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] getGradeChangeLogs error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get grade change logs'
      });
    }
  }

  /**
   * POST /api/grades/:enrollmentId/calculate
   * Tính điểm cuối cùng dựa trên các thành phần điểm
   */
  async calculateFinalGrade(req, res) {
    try {
      const { enrollmentId } = req.params;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          message: 'enrollmentId is required'
        });
      }

      const result = await gradesService.calculateFinalGrade(enrollmentId);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error('[GradesController] calculateFinalGrade error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate final grade'
      });
    }
  }

  /**
   * PATCH /api/grades/:enrollmentId/component
   * Cập nhật một thành phần điểm (GK, CK, BT, Quá trình)
   * Body: { componentType: 'midtermScore|finalScore|assignmentScore|continuousScore', score: number }
   */
  async updateGradeComponent(req, res) {
    try {
      const { enrollmentId } = req.params;
      const scoreData = req.body;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          message: 'enrollmentId is required'
        });
      }

      if (!scoreData.componentType || scoreData.score === undefined) {
        return res.status(400).json({
          success: false,
          message: 'componentType and score are required'
        });
      }

      const result = await gradesService.updateGradeComponent(enrollmentId, scoreData);

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] updateGradeComponent error:', error);
      const statusCode = error.message.includes('Invalid') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update grade component'
      });
    }
  }

  /**
   * GET /api/grades/:enrollmentId/details
   * Lấy chi tiết các thành phần điểm của một enrollment
   */
  async getGradeDetails(req, res) {
    try {
      const { enrollmentId } = req.params;

      if (!enrollmentId) {
        return res.status(400).json({
          success: false,
          message: 'enrollmentId is required'
        });
      }

      const result = await gradesService.getGradeDetails(enrollmentId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] getGradeDetails error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get grade details'
      });
    }
  }

  /**
   * GET /api/grades/my-grades/details
   * Lấy chi tiết điểm của sinh viên hiện tại
   * Query params: status, semester, academicYear
   */
  async getMyGradeDetails(req, res) {
    try {
      const studentId = req.auth?.sub || req.auth?.id;
      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const filters = {
        status: req.query.status,
        semester: req.query.semester ? parseInt(req.query.semester) : null,
        academicYear: req.query.academicYear
      };

      const result = await gradesService.getStudentGradeDetails(studentId, filters);

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết điểm thành công',
        data: result
      });
    } catch (error) {
      console.error('[GradesController] getMyGradeDetails error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get grade details'
      });
    }
  }

  /**
   * GET /api/grades/:studentId/details
   * Lấy chi tiết điểm của một sinh viên (Admin/Staff)
   * Query params: status, semester, academicYear
   */
  async getStudentGradeDetails(req, res) {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'studentId is required'
        });
      }

      const filters = {
        status: req.query.status,
        semester: req.query.semester ? parseInt(req.query.semester) : null,
        academicYear: req.query.academicYear
      };

      const result = await gradesService.getStudentGradeDetails(studentId, filters);

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết điểm thành công',
        data: result
      });
    } catch (error) {
      console.error('[GradesController] getStudentGradeDetails error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get grade details'
      });
    }
  }

  /**
   * POST /api/grades/class/:classSectionId/calculate-all
   * Tính điểm cuối cùng cho tất cả enrollments của một lớp học
   */
  async calculateFinalGradesForClass(req, res) {
    try {
      const { classSectionId } = req.params;

      if (!classSectionId) {
        return res.status(400).json({
          success: false,
          message: 'classSectionId is required'
        });
      }

      const result = await gradesService.calculateFinalGradesForClass(classSectionId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] calculateFinalGradesForClass error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate grades for class'
      });
    }
  }

  /**
   * GET /api/grades/my-grades
   * Lấy tất cả enrollment có điểm của sinh viên, group by semester
   */
  async getMyGrades(req, res) {
    try {
      // Get userId from JWT token
      const userId = req.auth?.sub || req.auth?.id;
      
      console.log('📊 [Grades Controller] getMyGrades called');
      console.log('   userId from JWT:', userId);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Find Student record by userId
      const Student = require('../models/student.model');
      const student = await Student.findOne({ userId: userId }).lean();
      
      console.log('📊 [Grades Controller] Student lookup:');
      console.log('   Found:', !!student);
      if (student) {
        console.log('   studentId:', student._id);
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin sinh viên'
        });
      }

      const result = await gradesService.getMyGrades(student._id);
      
      console.log('📊 [Grades Controller] Result received:', {
        semesterGroups: result.semesterGroups?.length || 0,
        overallGPA: result.overallGPA
      });

      // Transform response to match frontend expectations
      const semesters = result.semesterGroups.map(
        (group) => `${group.semester}-${group.academicYear}`
      );

      const groupedBySemester = {};
      result.semesterGroups.forEach((group) => {
        const semesterKey = `${group.semester}-${group.academicYear}`;
        groupedBySemester[semesterKey] = {
          semester: group.semester,
          academicYear: group.academicYear,
          totalCredits: group.totalCredits,
          semesterGPA: group.semesterGPA,
          enrollments: group.enrollments
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          semesters,
          groupedBySemester,
          overallGPA: result.overallGPA,
          totalGrades: result.semesterGroups.length
        }
      });
    } catch (error) {
      console.error('[GradesController] getMyGrades error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get grades'
      });
    }
  }

  /**
   * POST /api/grades/submit
   * Nhập điểm cho các sinh viên theo thành phần
   * Body: { grades: [{ enrollmentId, midtermScore, finalScore, assignmentScore, continuousScore }], autoCalculate: boolean }
   */
  async submitGrades(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const isSinglePayload = req.body?.studentId && req.body?.classSectionId && req.body?.grade;
      const isBatchPayload = Array.isArray(req.body?.grades);

      if (!isSinglePayload && !isBatchPayload) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu điểm không hợp lệ. Cần gửi single payload hoặc grades[]'
        });
      }

      const autoCalculate = req.body?.autoCalculate !== false;

      const submitPayload = isSinglePayload ? req.body : req.body.grades;

      const result = await gradesService.submitGrades(submitPayload, {
        autoCalculate,
        requester: { userId, role }
      });

      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          updated: result.updated,
          total: result.total,
          errors: result.errors
        }
      });
    } catch (error) {
      console.error('[GradesController] submitGrades error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit grades'
      });
    }
  }

  /**
   * GET /api/grades/class/:classSectionId/enrollments
   * Lấy danh sách sinh viên của một lớp để nhập điểm
   */
  async getClassEnrollmentsForGrading(req, res) {
    try {
      const { classSectionId } = req.params;
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;

      if (!classSectionId) {
        return res.status(400).json({
          success: false,
          message: 'classSectionId is required'
        });
      }

      const result = await gradesService.getClassEnrollmentsForGrading(classSectionId, {
        userId,
        role
      });

      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.enrollments || []
      });
    } catch (error) {
      console.error('[GradesController] getClassEnrollmentsForGrading error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get class enrollments'
      });
    }
  }

  /**
   * POST /api/grades/final-submit
   * Nộp điểm chính thức cho tất cả sinh viên trong lớp
   */
  async submitFinalClassGrades(req, res) {
    try {
      const { classSectionId } = req.body;
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;
      const io = req.app?.get('io');

      if (!classSectionId) {
        return res.status(400).json({
          success: false,
          message: 'classSectionId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const result = await gradesService.submitFinalClassGrades(classSectionId, {
        requester: { userId, role },
        io
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[GradesController] submitFinalClassGrades error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit final grades'
      });
    }
  }
  /**
   * GET /api/grades/export
   * Xuất báo cáo điểm dưới dạng Excel
   * Query params: format=excel, semester, academicYear, classSection, major
   */
  async exportGrades(req, res) {
    try {
      const studentId = req.auth?.sub || req.auth?.id;
      const { format = 'excel', semester, academicYear, classSection, major } = req.query;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Only allow Excel format
      if (format.toLowerCase() !== 'excel') {
        return res.status(400).json({
          success: false,
          message: 'Hiện chỉ hỗ trợ xuất định dạng Excel'
        });
      }

      const exportService = require('../services/export.service');
      const Student = require('../models/student.model');

      // Get student info
      let student;
      try {
        student = await Student.findOne({ userId: studentId }).lean();
      } catch (err) {
        console.error('Error finding student:', err);
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin sinh viên'
        });
      }

      // Get export data
      const filters = {};
      if (semester) filters.semester = semester;
      if (academicYear) filters.academicYear = academicYear;
      if (classSection) filters.classSection = classSection;
      if (major) filters.major = major;

      console.log('[ExportGrades] Filters:', filters);

      const enrollments = await exportService.getExportData(studentId, filters);

      if (!enrollments || enrollments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không có dữ liệu điểm để xuất'
        });
      }

      console.log(`[ExportGrades] Found ${enrollments.length} enrollments for Excel format`);

      // Generate Excel file
      let buffer, filename, contentType;

      try {
        buffer = await exportService.generateExcel(enrollments, {
          fullName: student.fullName || 'Unknown',
          studentCode: student.studentCode || 'N/A'
        });
        filename = `BaoCaoDiem_${student.studentCode}_${new Date().getTime()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } catch (genErr) {
        console.error(`[ExportGrades] Error generating Excel:`, genErr);
        throw genErr;
      }

      // Send file
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

    } catch (error) {
      console.error('[GradesController] exportGrades error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to export grades'
      });
    }
  }
}

// Export instance
module.exports = new GradesController();
