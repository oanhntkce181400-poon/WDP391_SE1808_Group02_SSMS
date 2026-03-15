// student.controller.js
// Controller xử lý HTTP requests cho Student Management
// Tác giả: Group02 - WDP391

const studentService = require('../services/student.service');
const curriculumService = require('../services/curriculum.service');
const gpaService = require('../services/gpa.service');

// ─────────────────────────────────────────────────────────────
// POST /api/students - Tạo sinh viên mới
// ─────────────────────────────────────────────────────────────
const createStudent = async (req, res) => {
  try {
    const createdById = req.auth.sub || req.auth.id;
    const payload = req.body;

    const newStudent = await studentService.createStudent(payload, createdById);

    return res.status(201).json({
      success: true,
      message: 'Tạo sinh viên thành công. Mật khẩu mặc định đã được tạo.',
      data: newStudent,
    });
  } catch (error) {
    console.error('[StudentController] createStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students - Lấy danh sách sinh viên (có filter & search)
// Query params: search, majorCode, cohort, academicStatus, page, limit, sortBy, sortOrder
// ─────────────────────────────────────────────────────────────
const getStudents = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      majorCode: req.query.majorCode,
      cohort: req.query.cohort,
      academicStatus: req.query.academicStatus,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sortBy: req.query.sortBy || 'studentCode',
      sortOrder: req.query.sortOrder || 'asc',
    };

    const result = await studentService.getStudents(filters);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sinh viên thành công',
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[StudentController] getStudents error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id - Lấy chi tiết sinh viên
// ─────────────────────────────────────────────────────────────
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin sinh viên thành công',
      data: student,
    });
  } catch (error) {
    console.error('[StudentController] getStudentById error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/students/:id - Cập nhật thông tin sinh viên
// ─────────────────────────────────────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedById = req.auth.sub || req.auth.id;
    const payload = req.body;

    const updatedStudent = await studentService.updateStudent(id, payload, updatedById);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sinh viên thành công',
      data: updatedStudent,
    });
  } catch (error) {
    console.error('[StudentController] updateStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/students/:id - Xóa sinh viên (soft delete)
// ─────────────────────────────────────────────────────────────
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedById = req.auth.sub || req.auth.id;

    const result = await studentService.deleteStudent(id, deletedById);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[StudentController] deleteStudent error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/filters/majors - Lấy danh sách ngành học (cho dropdown)
// ─────────────────────────────────────────────────────────────
const getMajorsForFilter = async (req, res) => {
  try {
    const majors = await studentService.getMajorsForFilter();

    return res.status(200).json({
      success: true,
      data: majors,
    });
  } catch (error) {
    console.error('[StudentController] getMajorsForFilter error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/filters/cohorts - Lấy danh sách khóa (cho dropdown)
// ─────────────────────────────────────────────────────────────
const getCohortsForFilter = async (req, res) => {
  try {
    const cohorts = await studentService.getCohortsForFilter();

    return res.status(200).json({
      success: true,
      data: cohorts,
    });
  } catch (error) {
    console.error('[StudentController] getCohortsForFilter error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/suggest-class - Gợi ý lớp sinh hoạt
// Query: majorCode, cohort
// ─────────────────────────────────────────────────────────────
const getSuggestedClassSection = async (req, res) => {
  try {
    const { majorCode, cohort } = req.query;

    if (!majorCode || !cohort) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số majorCode hoặc cohort',
      });
    }

    const suggestion = await studentService.getSuggestedClassSection(
      majorCode,
      parseInt(cohort)
    );

    return res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    console.error('[StudentController] getSuggestedClassSection error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// GET /api/students/:id/curriculum - Lấy khung chương trình của sinh viên (admin/staff)
const getStudentCurriculum = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const intakeYear = student.enrollmentYear || (student.cohort ? 2000 + student.cohort : null);

    let curriculum = null;
    if (student.curriculumId) {
      const Curriculum = require('../models/curriculum.model');
      curriculum = await Curriculum.findById(student.curriculumId).lean();
    }
    if (!curriculum) {
      curriculum = await curriculumService.getCurriculumForStudent({
        majorCode: student.majorCode,
        enrollmentYear: student.enrollmentYear,
        cohort: student.cohort,
      });
    }

    const currentSemester = student.currentCurriculumSemester ?? 1;

    let currentCurriculumSemester = null;
    if (intakeYear) {
      const semesterInYear = currentSemester % 2 === 0 ? 2 : 1;
      const studyYear = Math.ceil(currentSemester / 2);
      const academicYearStart = intakeYear + (studyYear - 1);
      const academicYearEnd = academicYearStart + 1;

      currentCurriculumSemester = {
        semesterNumber: currentSemester,
        semesterLabel: `Học kỳ ${semesterInYear} — Năm ${studyYear}`,
        academicYear: `${academicYearStart}-${academicYearEnd}`,
        progress: `${currentSemester}/9`,
      };
    }

    const Semester = require('../models/semester.model');
    const activeSystemSemester = await Semester.findOne({ isCurrent: true, isActive: true }).lean();

    return res.status(200).json({
      success: true,
      data: {
        studentInfo: {
          _id: student._id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          majorCode: student.majorCode,
          enrollmentYear: intakeYear,
          cohort: student.cohort,
          currentCurriculumSemester: currentSemester,
        },
        curriculum: curriculum ? {
          _id: curriculum._id,
          code: curriculum.code,
          name: curriculum.name,
          academicYear: curriculum.academicYear,
          major: curriculum.major,
        } : null,
        currentCurriculumSemester,
        activeSystemSemester: activeSystemSemester ? {
          _id: activeSystemSemester._id,
          code: activeSystemSemester.code,
          name: activeSystemSemester.name,
          academicYear: activeSystemSemester.academicYear,
          semesterNum: activeSystemSemester.semesterNum,
        } : null,
      },
    });
  } catch (error) {
    console.error('[StudentController] getStudentCurriculum error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// GET /api/students/me/curriculum - Lấy khung chương trình của sinh viên hiện tại (qua token)
const getMyCurriculum = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;

    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const intakeYear = student.enrollmentYear || (student.cohort ? 2000 + student.cohort : null);

    // Lấy curriculum: ưu tiên curriculumId, fallback getCurriculumForStudent
    let curriculum = null;
    if (student.curriculumId) {
      const Curriculum = require('../models/curriculum.model');
      curriculum = await Curriculum.findById(student.curriculumId).lean();
    }
    if (!curriculum) {
      curriculum = await curriculumService.getCurriculumForStudent({
        majorCode: student.majorCode,
        enrollmentYear: student.enrollmentYear,
        cohort: student.cohort,
      });
    }

    // Kỳ hiện tại trong khung chương trình - lấy từ student.currentCurriculumSemester
    const currentSemester = student.currentCurriculumSemester ?? 1;

    // Tính hiển thị đúng: semesterLabel, academicYear từ intakeYear + currentSemester
    let currentCurriculumSemester = null;
    if (intakeYear) {
      const semesterInYear = currentSemester % 2 === 0 ? 2 : 1;
      const studyYear = Math.ceil(currentSemester / 2);
      const academicYearStart = intakeYear + (studyYear - 1);
      const academicYearEnd = academicYearStart + 1;

      currentCurriculumSemester = {
        semesterNumber: currentSemester,
        semesterLabel: `Học kỳ ${semesterInYear} — Năm ${studyYear}`,
        academicYear: `${academicYearStart}-${academicYearEnd}`,
        progress: `${currentSemester}/9`,
      };
    }

    // Kỳ hệ thống đang mở đăng ký (tách biệt)
    const Semester = require('../models/semester.model');
    const activeSystemSemester = await Semester.findOne({ isCurrent: true, isActive: true }).lean();

    return res.status(200).json({
      success: true,
      data: {
        studentInfo: {
          _id: student._id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          majorCode: student.majorCode,
          enrollmentYear: intakeYear,
          cohort: student.cohort,
          currentCurriculumSemester: currentSemester,
        },
        curriculum: curriculum ? {
          _id: curriculum._id,
          code: curriculum.code,
          name: curriculum.name,
          academicYear: curriculum.academicYear,
          major: curriculum.major,
        } : null,
        currentCurriculumSemester,
        activeSystemSemester: activeSystemSemester ? {
          _id: activeSystemSemester._id,
          code: activeSystemSemester.code,
          name: activeSystemSemester.name,
          academicYear: activeSystemSemester.academicYear,
          semesterNum: activeSystemSemester.semesterNum,
          startDate: activeSystemSemester.startDate,
          endDate: activeSystemSemester.endDate,
        } : null,
      },
    });
  } catch (error) {
    console.error('[StudentController] getMyCurriculum error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/me/current-semester-courses - Lấy môn học kỳ hiện tại của SV đang đăng nhập
// ─────────────────────────────────────────────────────────────
const getMyCurrentSemesterCourses = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;

    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const result = await curriculumService.getStudentCurrentCurriculumSemester(student);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        curriculumSemester: result.curriculumSemester,
        semesterDoc: result.semesterDoc,
        subjects: result.subjects,
        curriculum: result.curriculum ? {
          _id: result.curriculum._id,
          code: result.curriculum.code,
          name: result.curriculum.name,
          academicYear: result.curriculum.academicYear,
        } : null,
      },
    });
  } catch (error) {
    console.error('[StudentController] getMyCurrentSemesterCourses error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/current-semester-courses - Lấy môn học kỳ hiện tại của SV (staff/admin)
// ─────────────────────────────────────────────────────────────
const getStudentCurrentSemesterCourses = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const result = await curriculumService.getStudentCurrentCurriculumSemester(student);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        student: {
          _id: student._id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          majorCode: student.majorCode,
          currentCurriculumSemester: student.currentCurriculumSemester,
          curriculumId: student.curriculumId,
        },
        curriculumSemester: result.curriculumSemester,
        semesterDoc: result.semesterDoc,
        subjects: result.subjects,
        curriculum: result.curriculum ? {
          _id: result.curriculum._id,
          code: result.curriculum.code,
          name: result.curriculum.name,
          academicYear: result.curriculum.academicYear,
        } : null,
      },
    });
  } catch (error) {
    console.error('[StudentController] getStudentCurrentSemesterCourses error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/students/:id/curriculum-semester - Cập nhật kỳ trong CT cho SV (staff/admin)
// ─────────────────────────────────────────────────────────────
const updateStudentCurriculumSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentCurriculumSemester: newSemester } = req.body;

    if (!newSemester || newSemester < 1 || newSemester > 9) {
      return res.status(400).json({
        success: false,
        message: 'Kỳ phải nằm trong khoảng 1-9',
      });
    }

    const updatedStudent = await curriculumService.updateStudentCurriculumSemester(id, newSemester);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật kỳ khung chương trình thành công',
      data: {
        _id: updatedStudent._id,
        studentCode: updatedStudent.studentCode,
        fullName: updatedStudent.fullName,
        currentCurriculumSemester: updatedStudent.currentCurriculumSemester,
      },
    });
  } catch (error) {
    console.error('[StudentController] updateStudentCurriculumSemester error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/next-curriculum-semester - Lấy kỳ tiếp theo trong CT
// ─────────────────────────────────────────────────────────────
const getStudentNextCurriculumSemester = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const result = await curriculumService.getNextCurriculumSemester(student);

    return res.status(200).json({
      success: true,
      data: {
        currentCurriculumSemester: student.currentCurriculumSemester,
        nextCurriculumSemester: result.nextCurriculumSemester,
      },
    });
  } catch (error) {
    console.error('[StudentController] getStudentNextCurriculumSemester error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/me/next-curriculum-semester - Lấy kỳ tiếp theo của SV đang đăng nhập
// ─────────────────────────────────────────────────────────────
const getMyNextCurriculumSemester = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;

    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    const result = await curriculumService.getNextCurriculumSemester(student);

    return res.status(200).json({
      success: true,
      data: {
        currentCurriculumSemester: student.currentCurriculumSemester,
        nextCurriculumSemester: result.nextCurriculumSemester,
      },
    });
  } catch (error) {
    console.error('[StudentController] getMyNextCurriculumSemester error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/me/gpa - Lấy GPA của sinh viên hiện tại
// ─────────────────────────────────────────────────────────────
const getMyGPA = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;

    // Tìm sinh viên qua userId
    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Tính GPA
    const gpaResult = await gpaService.calculateStudentGPA(student._id);
    const warnings = await gpaService.checkGPAWarning(student._id);

    return res.status(200).json({
      success: true,
      message: 'Lấy GPA thành công',
      data: {
        studentId: student._id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        gpa: gpaResult.gpa,
        totalCredits: gpaResult.totalCredits,
        courses: gpaResult.courses,
        warning: warnings.isLow,
        warningStatus: warnings.status,
      },
    });
  } catch (error) {
    console.error('[StudentController] getMyGPA error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/gpa - Lấy GPA của sinh viên (Admin)
// ─────────────────────────────────────────────────────────────
const getStudentGPA = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm sinh viên
    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Tính GPA
    const gpaResult = await gpaService.calculateStudentGPA(id);
    const warnings = await gpaService.checkGPAWarning(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy GPA thành công',
      data: {
        studentId: student._id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        gpa: gpaResult.gpa,
        totalCredits: gpaResult.totalCredits,
        courses: gpaResult.courses,
        warning: warnings.isLow,
        warningStatus: warnings.status,
      },
    });
  } catch (error) {
    console.error('[StudentController] getStudentGPA error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/me/gpa/semester/:semesterNumber/:academicYear
// Lấy GPA kỳ học của sinh viên hiện tại
// ─────────────────────────────────────────────────────────────
const getMyGPABySemester = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;
    const { semesterNumber, academicYear } = req.params;

    // Validate params
    if (!semesterNumber || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số semesterNumber hoặc academicYear',
      });
    }

    // Tìm sinh viên qua userId
    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Tính GPA kỳ học
    const gpaResult = await gpaService.calculateSemesterGPA(
      student._id,
      parseInt(semesterNumber),
      academicYear
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy GPA kỳ học thành công',
      data: {
        studentId: student._id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        ...gpaResult,
      },
    });
  } catch (error) {
    console.error('[StudentController] getMyGPABySemester error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/gpa/semester/:semesterNumber/:academicYear
// Lấy GPA kỳ học của sinh viên (Admin)
// ─────────────────────────────────────────────────────────────
const getStudentGPABySemester = async (req, res) => {
  try {
    const { id, semesterNumber, academicYear } = req.params;

    // Validate params
    if (!semesterNumber || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số semesterNumber hoặc academicYear',
      });
    }

    // Tìm sinh viên
    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Tính GPA kỳ học
    const gpaResult = await gpaService.calculateSemesterGPA(
      id,
      parseInt(semesterNumber),
      academicYear
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy GPA kỳ học thành công',
      data: {
        studentId: student._id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        ...gpaResult,
      },
    });
  } catch (error) {
    console.error('[StudentController] getStudentGPABySemester error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/me/semesters - Lấy danh sách kỳ học của sinh viên hiện tại
// ─────────────────────────────────────────────────────────────
const getMySemesterList = async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.id;

    // Tìm sinh viên qua userId
    const student = await studentService.getStudentByUserId(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Lấy danh sách kỳ học
    const semesters = await gpaService.getSemesterListForStudent(student._id);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách kỳ học thành công',
      data: semesters,
    });
  } catch (error) {
    console.error('[StudentController] getMySemesterList error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/semesters - Lấy danh sách kỳ học của sinh viên (Admin)
// ─────────────────────────────────────────────────────────────
const getStudentSemesterList = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm sinh viên
    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên không tìm thấy',
      });
    }

    // Lấy danh sách kỳ học
    const semesters = await gpaService.getSemesterListForStudent(id);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách kỳ học thành công',
      data: semesters,
    });
  } catch (error) {
    console.error('[StudentController] getStudentSemesterList error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ, thử lại sau',
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getMajorsForFilter,
  getCohortsForFilter,
  getSuggestedClassSection,
  getStudentCurriculum,
  getMyCurriculum,
  getMyCurrentSemesterCourses,
  getStudentCurrentSemesterCourses,
  updateStudentCurriculumSemester,
  getStudentNextCurriculumSemester,
  getMyNextCurriculumSemester,
  getMyGPA,
  getStudentGPA,
  getMyGPABySemester,
  getStudentGPABySemester,
  getMySemesterList,
  getStudentSemesterList,
};
