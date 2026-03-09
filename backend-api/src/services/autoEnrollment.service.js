// autoEnrollment.service.js
// Service tự động đăng ký môn học sau khi thanh toán học phí
// Tác giả: Group02 - WDP391

const Student = require('../models/student.model');
const Semester = require('../models/semester.model');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Subject = require('../models/subject.model');
const curriculumService = require('./curriculum.service');
const paymentValidationService = require('./paymentValidation.service');

/**
 * Tìm lớp học phần cho một môn học trong học kỳ hiện tại
 * @param {String} subjectId - ObjectId của môn học
 * @param {Number} semesterNum - Số học kỳ trong năm (1, 2, 3)
 * @param {String} academicYear - Năm học (vd: "2025-2026")
 * @returns {Object|null} - ClassSection hoặc null
 */
async function findAvailableClassSection(subjectId, semesterNum, academicYear) {
  // Tìm các lớp đang mở cho môn học này trong học kỳ hiện tại
  const classSections = await ClassSection.find({
    subject: subjectId,
    semester: semesterNum,
    academicYear: academicYear,
    status: 'active'
  })
    .sort({ currentEnrollment: 1 }) // Ưu tiên lớp ít người
    .limit(1)
    .lean();
  
  return classSections[0] || null;
}

/**
 * Kiểm tra xem sinh viên đã đăng ký môn này chưa
 * @param {String} studentId 
 * @param {String} classSectionId 
 * @returns {Boolean}
 */
async function isAlreadyEnrolled(studentId, classSectionId) {
  const enrollment = await ClassEnrollment.findOne({
    student: studentId,
    classSection: classSectionId,
    status: { $in: ['enrolled', 'completed'] }
  }).lean();
  
  return !!enrollment;
}

/**
 * Đăng ký một sinh viên vào một lớp học phần
 * @param {String} studentId 
 * @param {String} classSectionId 
 * @param {String} semesterCode - Mã kỳ thanh toán (vd: K1_CEK18)
 * @returns {Object} - Kết quả đăng ký
 */
async function enrollStudentInSection(studentId, classSectionId, semesterCode) {
  try {
    // Kiểm tra đã đăng ký chưa
    const alreadyEnrolled = await isAlreadyEnrolled(studentId, classSectionId);
    if (alreadyEnrolled) {
      return {
        success: false,
        reason: 'already_enrolled',
        message: 'Sinh viên đã đăng ký lớp này'
      };
    }
    
    // Lấy thông tin lớp
    const classSection = await ClassSection.findById(classSectionId);
    if (!classSection) {
      return {
        success: false,
        reason: 'class_not_found',
        message: 'Không tìm thấy lớp học phần'
      };
    }
    
    // Kiểm tra sĩ số
    if (classSection.currentEnrollment >= classSection.maxCapacity) {
      return {
        success: false,
        reason: 'class_full',
        message: 'Lớp đã đầy'
      };
    }
    
    // Tạo enrollment
    const enrollment = new ClassEnrollment({
      student: studentId,
      classSection: classSectionId,
      enrolledAt: new Date(),
      status: 'enrolled',
      note: `Auto-enrolled sau thanh toán học phí kỳ ${semesterCode}`
    });
    
    await enrollment.save();
    
    // Cập nhật sĩ số
    classSection.currentEnrollment += 1;
    await classSection.save();
    
    return {
      success: true,
      enrollment: enrollment,
      classSection: classSection
    };
  } catch (error) {
    console.error('Error enrolling student in section:', error);
    return {
      success: false,
      reason: 'error',
      message: error.message
    };
  }
}

/**
 * Tự động đăng ký các môn học cho sinh viên sau khi thanh toán
 * @param {String} studentId 
 * @param {Number} curriculumSemesterOrder - Kỳ trong khung chương trình (1, 2, 3...)
 * @returns {Object} - Kết quả auto-enrollment
 */
async function autoEnrollAfterPayment(studentId, curriculumSemesterOrder) {
  const student = await Student.findById(studentId);
  if (!student) {
    const err = new Error('Không tìm thấy sinh viên');
    err.statusCode = 404;
    throw err;
  }
  
  // Lấy học kỳ hiện tại của trường
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    const err = new Error('Không tìm thấy học kỳ hiện tại');
    err.statusCode = 404;
    throw err;
  }
  
  // Lấy khung chương trình
  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort
  });
  
  if (!curriculum) {
    return {
      success: false,
      message: 'Không tìm thấy khung chương trình cho sinh viên',
      totalSubjects: 0,
      enrolledSubjects: [],
      failedSubjects: []
    };
  }
  
  // Lấy các môn học trong kỳ của khung chương trình
  const semesterSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder
  );
  
  if (!semesterSubjects || semesterSubjects.length === 0) {
    return {
      success: true,
      message: 'Kỳ này không có môn học trong khung chương trình',
      totalSubjects: 0,
      enrolledSubjects: [],
      failedSubjects: []
    };
  }
  
  const enrolledSubjects = [];
  const failedSubjects = [];
  
  for (const subjectData of semesterSubjects) {
    const subject = subjectData.subject;
    if (!subject) continue;
    
    try {
      // Tìm lớp học phần mở
      const classSection = await findAvailableClassSection(
        subject._id,
        currentSemester.semesterNum,
        currentSemester.academicYear
      );
      
      if (!classSection) {
        failedSubjects.push({
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          reason: 'no_class_section',
          message: 'Không tìm thấy lớp học phần mở'
        });
        continue;
      }
      
      // Đăng ký vào lớp
      const semesterPaymentCode = paymentValidationService.generateSemesterPaymentCode(
        curriculumSemesterOrder,
        curriculum.code
      );
      
      const enrollmentResult = await enrollStudentInSection(
        studentId,
        classSection._id,
        semesterPaymentCode
      );
      
      if (enrollmentResult.success) {
        enrolledSubjects.push({
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          classSectionId: classSection._id,
          classSectionName: classSection.className || classSection.classCode
        });
      } else {
        failedSubjects.push({
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          reason: enrollmentResult.reason,
          message: enrollmentResult.message
        });
      }
    } catch (error) {
      failedSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        reason: 'error',
        message: error.message
      });
    }
  }
  
  const totalSubjects = semesterSubjects.length;
  const successCount = enrolledSubjects.length;
  const failCount = failedSubjects.length;
  
  return {
    success: failCount === 0,
    message: `Đã đăng ký ${successCount}/${totalSubjects} môn học`,
    totalSubjects,
    enrolledSubjects,
    failedSubjects,
    curriculumSemesterOrder,
    curriculumCode: curriculum.code,
    curriculumName: curriculum.name,
    semesterName: currentSemester.name,
    academicYear: currentSemester.academicYear
  };
}

/**
 * Lấy danh sách môn học sẽ được đăng ký tự động (preview)
 * @param {String} studentId 
 * @returns {Object} - Danh sách môn học sẽ đăng ký
 */
async function previewAutoEnrollment(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    const err = new Error('Không tìm thấy sinh viên');
    err.statusCode = 404;
    throw err;
  }
  
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    const err = new Error('Không tìm thấy học kỳ hiện tại');
    err.statusCode = 404;
    throw err;
  }
  
  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort
  });
  
  if (!curriculum) {
    return {
      hasCurriculum: false,
      subjects: [],
      message: 'Không tìm thấy khung chương trình'
    };
  }
  
  const curriculumSemesterOrder = await paymentValidationService.calculateStudentCurriculumSemester(
    student,
    currentSemester
  );
  
  const semesterSubjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder
  );
  
  // Lọc bỏ các môn đã đăng ký
  const availableSubjects = [];
  for (const subjectData of semesterSubjects) {
    const subject = subjectData.subject;
    if (!subject) continue;
    
    // Kiểm tra đã đăng ký chưa
    const existingEnrollment = await ClassEnrollment.findOne({
      student: studentId,
      status: { $in: ['enrolled', 'completed'] }
    }).populate({
      path: 'classSection',
      populate: { path: 'subject' }
    }).lean();
    
    const isAlreadyEnrolled = existingEnrollment?.some(
      e => e.classSection?.subject?.subjectCode === subject.subjectCode
    );
    
    if (!isAlreadyEnrolled) {
      // Tìm lớp mở
      const classSection = await findAvailableClassSection(
        subject._id,
        currentSemester.semesterNum,
        currentSemester.academicYear
      );
      
      availableSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits,
        hasAvailableClass: !!classSection,
        classSectionId: classSection?._id,
        classSectionName: classSection?.className || classSection?.classCode,
        classSectionCode: classSection?.classCode,
        currentEnrollment: classSection?.currentEnrollment || 0,
        maxCapacity: classSection?.maxCapacity || 0
      });
    }
  }
  
  return {
    hasCurriculum: true,
    curriculumSemesterOrder,
    curriculumCode: curriculum.code,
    curriculumName: curriculum.name,
    currentSemesterName: currentSemester.name,
    academicYear: currentSemester.academicYear,
    totalSubjects: availableSubjects.length,
    subjects: availableSubjects
  };
}

module.exports = {
  autoEnrollAfterPayment,
  previewAutoEnrollment,
  findAvailableClassSection,
  enrollStudentInSection
};
