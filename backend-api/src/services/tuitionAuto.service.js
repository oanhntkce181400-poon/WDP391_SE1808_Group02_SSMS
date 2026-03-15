// tuitionAuto.service.js
// Service tính học phí tự động cho sinh viên theo kỳ
// Tác giả: Group02 - WDP391

const Student = require('../models/student.model');
const Semester = require('../models/semester.model');
const Curriculum = require('../models/curriculum.model');
const CurriculumSemester = require('../models/curriculumSemester.model');
const CurriculumCourse = require('../models/curriculumCourse.model');
const TuitionBill = require('../models/tuitionBill.model');
const TuitionFee = require('../models/tuitionFee.model');
const ClassRegistration = require('../models/classRegistration.model');

const CREDIT_FEE = 100000; // 100,000 VNĐ / tín chỉ mặc định
const NORMAL_CREDITS_THRESHOLD = 18; // Ngưỡng tín chỉ bình thường

/**
 * Lấy giá tín chỉ mặc định hoặc theo ngành
 * @param {String} majorCode 
 * @returns {Number}
 */
async function getCreditFee(majorCode) {
  // Ưu tiên lấy từ TuitionFee nếu có
  const tuitionFee = await TuitionFee.findOne({ majorCode, status: 'active' }).sort({ createdAt: -1 }).lean();
  if (tuitionFee && tuitionFee.finalTuitionFee > 0) {
    // Tính giá trung bình mỗi tín chỉ
    return tuitionFee.finalTuitionFee / (tuitionFee.totalCredits || 1);
  }
  return CREDIT_FEE;
}

/**
 * Lấy danh sách môn học lại của sinh viên (đã fail hoặc chưa pass)
 * @param {String} studentId 
 * @param {Number} curriculumSemester 
 * @returns {Array}
 */
async function getRepeatSubjects(studentId, curriculumSemester) {
  // Lấy tất cả đăng ký của sinh viên
  const registrations = await ClassRegistration.find({ student: studentId }).lean();
  
  // Lấy subjectCode của các môn đã đăng ký và chưa pass
  const failedSubjectCodes = registrations
    .filter(r => r.status === 'failed' || r.grade === null || r.grade < 5)
    .map(r => r.subjectCode);
  
  // Lấy thông tin môn học từ curriculum
  const curriculum = await Curriculum.findOne({ academicYear: { $regex: '2026' } }).lean();
  if (!curriculum) return [];
  
  // Tìm các môn trong curriculum thuộc các kỳ trước
  const repeatSubjects = [];
  for (let sem = 1; sem < curriculumSemester; sem++) {
    const semesterDoc = await CurriculumSemester.findOne({ curriculum: curriculum._id, semesterOrder: sem }).lean();
    if (semesterDoc) {
      const courses = await CurriculumCourse.find({ curriculumSemester: semesterDoc._id }).populate('subject').lean();
      for (const course of courses) {
        if (failedSubjectCodes.includes(course.subject?.subjectCode)) {
          repeatSubjects.push({
            subjectId: course.subject?._id,
            subjectCode: course.subject?.subjectCode,
            subjectName: course.subject?.subjectName,
            credits: course.subject?.credits || course.credits,
            fee: (course.subject?.credits || course.credits) * CREDIT_FEE
          });
        }
      }
    }
  }
  
  return repeatSubjects;
}

/**
 * Tính học phí theo curriculum cho một sinh viên
 * @param {String} studentId - ObjectId của sinh viên
 * @param {String} semesterId - ObjectId của kỳ học (Semester)
 * @returns {Object} TuitionBill
 */
async function calculateTuitionByCurriculum(studentId, semesterId) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Sinh viên không tìm thấy');
  }

  const semester = await Semester.findById(semesterId);
  if (!semester) {
    throw new Error('Kỳ học không tìm thấy');
  }

  // Xác định kỳ trong curriculum (dùng student.currentCurriculumSemester hoặc tính)
  const curriculumSemester = student.currentCurriculumSemester || 1;

  // Lấy curriculum
  let curriculum = null;
  if (student.curriculumId) {
    curriculum = await Curriculum.findById(student.curriculumId).lean();
  }
  if (!curriculum) {
    curriculum = await Curriculum.findOne({ 
      major: student.majorCode,
      academicYear: { $regex: String(student.enrollmentYear) }
    }).lean();
  }
  if (!curriculum) {
    throw new Error('Không tìm thấy khung chương trình phù hợp');
  }

  // Lấy danh sách môn học kỳ này trong curriculum
  const semesterDoc = await CurriculumSemester.findOne({ 
    curriculum: curriculum._id, 
    semesterOrder: curriculumSemester 
  }).lean();

  let baseSubjects = [];
  let baseCredits = 0;
  let baseAmount = 0;

  if (semesterDoc) {
    const courses = await CurriculumCourse.find({ curriculumSemester: semesterDoc._id })
      .populate('subject')
      .lean();
    
    const creditFee = await getCreditFee(student.majorCode);
    
    baseSubjects = courses.map(c => ({
      subjectId: c.subject?._id,
      subjectCode: c.subject?.subjectCode,
      subjectName: c.subject?.subjectName,
      credits: c.subject?.credits || c.credits,
      fee: (c.subject?.credits || c.credits) * creditFee
    }));
    
    baseCredits = baseSubjects.reduce((sum, s) => sum + s.credits, 0);
    baseAmount = baseCredits * creditFee;
  }

  // Lấy danh sách môn học lại
  const repeatSubjects = await getRepeatSubjects(studentId, curriculumSemester);
  const repeatCredits = repeatSubjects.reduce((sum, s) => sum + s.credits, 0);
  const repeatAmount = repeatCredits * CREDIT_FEE;

  // Kiểm tra học vượt (đăng ký > 18 tín chỉ)
  const currentRegistrations = await ClassRegistration.find({
    student: studentId,
    semester: semesterId,
    status: { $in: ['registered', 'completed'] }
  }).lean();
  
  const registeredCredits = currentRegistrations.reduce((sum, r) => sum + (r.credits || 0), 0);
  const overloadCredits = Math.max(0, registeredCredits - NORMAL_CREDITS_THRESHOLD);
  const overloadAmount = overloadCredits * CREDIT_FEE;

  // Tạo hoặc cập nhật TuitionBill
  let tuitionBill = await TuitionBill.findOne({ student: studentId, semester: semesterId });
  
  const billData = {
    student: studentId,
    semester: semesterId,
    semesterCode: semester.code,
    semesterName: semester.name,
    academicYear: semester.academicYear,
    baseAmount,
    baseCredits,
    baseSubjects,
    repeatAmount,
    repeatCredits,
    repeatSubjects,
    overloadAmount,
    overloadCredits,
    curriculumId: curriculum._id,
    curriculumSemester,
    billType: 'auto',
    dueDate: semester.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    status: 'pending'
  };

  if (tuitionBill) {
    // Cập nhật bill hiện có
    Object.assign(tuitionBill, billData);
    await tuitionBill.save();
  } else {
    // Tạo bill mới
    tuitionBill = await TuitionBill.create(billData);
  }

  return tuitionBill;
}

/**
 * Tính học phí từ danh sách môn đã đăng ký (thay vì từ curriculum)
 * Dùng cho trường hợp sinh viên đăng ký môn ngoài curriculum
 * @param {String} studentId 
 * @param {String} semesterId 
 * @param {Array} registeredSubjects - Danh sách môn đã đăng ký
 * @returns {Object}
 */
async function calculateTuitionFromRegistrations(studentId, semesterId, registeredSubjects) {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Sinh viên không tìm thấy');
  }

  const semester = await Semester.findById(semesterId);
  if (!semester) {
    throw new Error('Kỳ học không tìm thấy');
  }

  const creditFee = await getCreditFee(student.majorCode);
  const totalCredits = registeredSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  
  // Tách môn học lại và môn bình thường
  const repeatSubjects = registeredSubjects.filter(s => s.isRepeat);
  const baseSubjects = registeredSubjects.filter(s => !s.isRepeat);

  const baseCredits = baseSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  const repeatCredits = repeatSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);

  const overloadCredits = Math.max(0, totalCredits - NORMAL_CREDITS_THRESHOLD);

  const billData = {
    student: studentId,
    semester: semesterId,
    semesterCode: semester.code,
    semesterName: semester.name,
    academicYear: semester.academicYear,
    baseAmount: baseCredits * creditFee,
    baseCredits,
    baseSubjects,
    repeatAmount: repeatCredits * creditFee,
    repeatCredits,
    repeatSubjects,
    overloadAmount: overloadCredits * creditFee,
    overloadCredits,
    curriculumSemester: student.currentCurriculumSemester || 1,
    billType: 'auto',
    dueDate: semester.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'pending'
  };

  let tuitionBill = await TuitionBill.findOne({ student: studentId, semester: semesterId });
  
  if (tuitionBill) {
    Object.assign(tuitionBill, billData);
    await tuitionBill.save();
  } else {
    tuitionBill = await TuitionBill.create(billData);
  }

  return tuitionBill;
}

/**
 * Tạo học phí cho tất cả sinh viên trong một kỳ
 * @param {String} semesterId - ObjectId của kỳ học
 * @returns {Object} - { total, success, failed }
 */
async function generateAllTuitionForSemester(semesterId) {
  const semester = await Semester.findById(semesterId);
  if (!semester) {
    throw new Error('Kỳ học không tìm thấy');
  }

  // Lấy tất cả sinh viên đang học
  const students = await Student.find({ 
    isActive: true,
    academicStatus: { $ne: 'graduated' }
  }).lean();

  const result = { total: students.length, success: 0, failed: 0, errors: [] };

  for (const student of students) {
    try {
      await calculateTuitionByCurriculum(student._id, semesterId);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({ studentId: student._id, error: error.message });
    }
  }

  return result;
}

/**
 * Cập nhật trạng thái overdue cho các bill quá hạn
 * @returns {Number} - Số bill được cập nhật
 */
async function updateOverdueStatus() {
  const now = new Date();
  const result = await TuitionBill.updateMany(
    { status: 'pending', dueDate: { $lt: now } },
    { status: 'overdue' }
  );
  return result.modifiedCount;
}

/**
 * Lấy học phí của sinh viên theo kỳ
 * @param {String} studentId 
 * @param {String} semesterId 
 * @returns {Object|null}
 */
async function getTuitionBill(studentId, semesterId) {
  return TuitionBill.findOne({ student: studentId, semester: semesterId }).lean();
}

/**
 * Lấy tất cả học phí của sinh viên
 * @param {String} studentId 
 * @param {Object} options - { status, limit, skip }
 * @returns {Array}
 */
async function getStudentTuitionBills(studentId, options = {}) {
  const query = { student: studentId };
  if (options.status) {
    query.status = options.status;
  }

  return TuitionBill.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0)
    .lean();
}

/**
 * Cập nhật trạng thái thanh toán
 * @param {String} billId 
 * @param {Object} paymentInfo 
 * @returns {Object}
 */
async function markAsPaid(billId, paymentInfo) {
  const bill = await TuitionBill.findById(billId);
  if (!bill) {
    throw new Error('Bill không tìm thấy');
  }

  bill.status = 'paid';
  bill.paidAmount = bill.totalAmount;
  bill.paymentDate = new Date();
  bill.paymentMethod = paymentInfo.paymentMethod;
  bill.transactionId = paymentInfo.transactionId;

  await bill.save();
  return bill;
}

module.exports = {
  calculateTuitionByCurriculum,
  calculateTuitionFromRegistrations,
  generateAllTuitionForSemester,
  updateOverdueStatus,
  getTuitionBill,
  getStudentTuitionBills,
  markAsPaid,
  CREDIT_FEE,
  NORMAL_CREDITS_THRESHOLD
};
