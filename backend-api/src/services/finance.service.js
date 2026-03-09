const User            = require('../models/user.model');
const Student         = require('../models/student.model');
const Semester        = require('../models/semester.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection    = require('../models/classSection.model');
const Subject         = require('../models/subject.model');
const TuitionFee      = require('../models/tuitionFee.model');
const Payment         = require('../models/payment.model');
const OtherFee        = require('../models/otherFee.model');
const Wallet          = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');

async function findStudentByUserId(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('Không tìm thấy tài khoản');
    err.statusCode = 401;
    throw err;
  }

  let student = await Student.findOne({ email: user.email }).lean();
  if (!student) {
    const numMatch = (user.email || '').match(/ce18(\d{4})/i);
    const studentCode = numMatch ? 'CE18' + numMatch[1] : 'CE18' + Math.floor(1000 + Math.random() * 8999);
    const created = await Student.create({
      userId: user._id,
      email: user.email,
      fullName: user.fullName || user.name || 'Sinh viên',
      studentCode,
      cohort: '18',
      majorCode: 'CE',
      curriculumCode: 'CEK18',
      status: 'active',
      enrollmentYear: 2023,
    });
    student = created.toObject();
  }

  return student;
}

async function getCurrentSemester() {
  return await Semester.findOne({ isCurrent: true }).lean();
}

async function findSemesterById(semesterId) {
  return await Semester.findOne({ code: semesterId }).lean();
}

async function resolveSemester(semesterId) {
  let semester = null;

  if (semesterId) {
    semester = await findSemesterById(semesterId);
  } else {
    semester = await getCurrentSemester();
  }

  if (!semester) {
    const err = new Error('Không tìm thấy học kỳ');
    err.statusCode = 404;
    throw err;
  }

  return semester;
}

async function sumRegisteredCredits(studentId, semester) {
  const enrollments = await ClassEnrollment.find({
    student: studentId,
    status: { $in: ['enrolled', 'completed'] },
  })
    .populate({
      path: 'classSection',
      match: {
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
      },
      populate: {
        path: 'subject',
        select: 'subjectCode subjectName credits',
      },
    })
    .lean();

  let totalCredits = 0;
  const subjects = [];

  for (const enrollment of enrollments) {
    const section = enrollment.classSection;
    if (section && section.subject) {
      const sub = section.subject;
      totalCredits += sub.credits || 0;
      subjects.push({
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits:     sub.credits,
        tuitionFee:  0,
      });
    }
  }

  return { total: totalCredits, subjects };
}

async function findPricePerCredit(cohort, semester) {
  const cohortVariants = [
    String(cohort),
    `K${cohort}`,
    `K${cohort}CT`,
  ];

  const rule = await TuitionFee.findOne({
    cohort: { $in: cohortVariants },
    academicYear: semester.academicYear,
    status: 'active',
  }).lean();

  if (!rule) return null;

  if (rule.totalCredits && rule.totalCredits > 0) {
    const price = Math.round(rule.baseTuitionFee / rule.totalCredits);
    return { price, fallbackCredits: rule.totalCredits };
  }

  return null;
}

async function sumOtherFees(studentId, semesterCode) {
  const fees = await OtherFee.find({
    student: studentId,
    semesterCode: semesterCode,
  }).lean();

  const total = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  return { total, items: fees };
}

async function sumPayments(studentId, semesterCode) {
  const payments = await Payment.find({
    student: studentId,
    semesterCode: semesterCode,
  })
    .sort({ paidAt: -1 })
    .lean();

  const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return { total, items: payments };
}

function calculateTotal(credits, pricePerCredit, otherFeesTotal) {
  return credits * pricePerCredit + otherFeesTotal;
}

function calculateRemaining(totalTuition, totalPaid) {
  return Math.max(0, totalTuition - totalPaid);
}

function buildTuitionSummaryDTO({
  semester,
  registeredCredits,
  pricePerCredit,
  enrolledSubjects,
  otherFeesTotal,
  otherFeesItems,
  totalPaid,
  paymentItems,
  totalTuition,
  remainingDebt,
}) {
  return {
    semesterId:        semester.code,
    semesterName:      semester.name,
    academicYear:      semester.academicYear,
    registeredCredits,
    pricePerCredit,
    enrolledSubjects:  enrolledSubjects || [],
    otherFeesTotal,
    otherFeesItems,
    totalTuition,
    totalPaid,
    remainingDebt,
    paymentItems,
  };
}

async function getMyTuitionSummary(userId, semesterId) {
  const student = await findStudentByUserId(userId);
  const semester = await resolveSemester(semesterId);

  const creditResult = await sumRegisteredCredits(student._id, semester);
  let registeredCredits = creditResult.total;
  let enrolledSubjects  = creditResult.subjects;

  const tuitionRule = await findPricePerCredit(student.cohort, semester);

  // Luôn dùng 100 VNĐ / 1 tín chỉ (theo yêu cầu hệ thống)
  const pricePerCredit = 100;
  const fallbackCredits = tuitionRule ? tuitionRule.fallbackCredits : 22;

  if (registeredCredits === 0 && fallbackCredits > 0) {
    registeredCredits = fallbackCredits;
    enrolledSubjects  = [];
  }

  enrolledSubjects = enrolledSubjects.map(s => ({
    ...s,
    tuitionFee: s.credits * pricePerCredit,
  }));

  const { total: otherFeesTotal, items: otherFeesItems } =
    await sumOtherFees(student._id, semester.code);

  const { total: totalPaid, items: paymentItems } =
    await sumPayments(student._id, semester.code);

  const totalTuition   = calculateTotal(registeredCredits, pricePerCredit, otherFeesTotal);
  const remainingDebt  = calculateRemaining(totalTuition, totalPaid);

  return buildTuitionSummaryDTO({
    semester,
    registeredCredits,
    pricePerCredit,
    enrolledSubjects,
    otherFeesTotal,
    otherFeesItems,
    totalPaid,
    paymentItems,
    totalTuition,
    remainingDebt,
  });
}

// ─────────────────────────────────────────────────────────────
// confirmPayment: Xác nhận thanh toán PayOS và lưu vào DB
// Input: userId, orderCode, amount, status
// Output: Payment object vừa tạo
// ─────────────────────────────────────────────────────────────
async function confirmPayment({ userId, orderCode, amount, status }) {
  if (status !== 'PAID') {
    const err = new Error('Thanh toán chưa hoàn tất');
    err.statusCode = 400;
    throw err;
  }

  const student = await findStudentByUserId(userId);

  // Kiểm tra xem đã có payment với orderCode này chưa
  const existingPayment = await Payment.findOne({ orderCode }).lean();
  if (existingPayment) {
    return existingPayment; // Đã xử lý rồi
  }

  // Dùng mã kỳ curriculum để lịch sử thanh toán trả về đúng trên trang Học phí
  let semesterCode;
  try {
    const paymentValidation = require('./paymentValidation.service');
    const paymentStatus = await paymentValidation.checkSemesterPaymentRequirement(student._id);
    semesterCode = paymentStatus.semesterCode; // VD: K1_SE2026K1
  } catch (_) {
    const semester = await getCurrentSemester();
    semesterCode = semester?.code || `sem-${Date.now()}`;
  }

  // Tạo bản ghi thanh toán mới
  const payment = await Payment.create({
    student: student._id,
    semesterCode: semesterCode,
    amount: amount,
    paidAt: new Date(),
    method: 'online',
    note: `PayOS - OrderCode: ${orderCode}`,
    orderCode: orderCode,
    status: 'completed',
  });

  return payment;
}

// ─────────────────────────────────────────────────────────────
// getPaymentHistory: Lấy lịch sử thanh toán của sinh viên
// Input: userId, semesterId (optional)
// Output: Array các Payment
// ─────────────────────────────────────────────────────────────
async function getPaymentHistory(userId, semesterId) {
  const student = await findStudentByUserId(userId);
  
  const query = { student: student._id };
  
  if (semesterId) {
    const semester = await findSemesterById(semesterId);
    if (semester) {
      query.semesterCode = semester.code;
    }
  }

  const payments = await Payment.find(query)
    .sort({ paidAt: -1 })
    .lean();

  return payments;
}

// ─────────────────────────────────────────────────────────────
// getAllStudentsPaymentSummary: Tổng hợp thanh toán của tất cả sinh viên (admin)
// Input: semesterId, majorCode, graduationYear
// Output: { summary: {...}, students: [...] }
// ─────────────────────────────────────────────────────────────
async function getAllStudentsPaymentSummary(semesterId, majorCode, graduationYear) {
  const semester = await resolveSemester(semesterId);
  
  // Build student query - lấy tất cả sinh viên
  const studentQuery = {};
  if (majorCode) {
    studentQuery.majorCode = majorCode;
  }
  if (graduationYear) {
    studentQuery.graduationYear = graduationYear;
  }
  
  const students = await Student.find(studentQuery).lean();
  
  // Get all payments for this semester
  const payments = await Payment.find({ semesterCode: semester.code })
    .lean();
  
  // Group payments by student
  const paymentsByStudent = {};
  for (const payment of payments) {
    const studentId = payment.student.toString();
    if (!paymentsByStudent[studentId]) {
      paymentsByStudent[studentId] = 0;
    }
    paymentsByStudent[studentId] += payment.amount || 0;
  }
  
  // Get tuition fee rule for the semester
  const tuitionRule = await TuitionFee.findOne({
    cohort: { $in: students.map(s => s.cohort) },
    academicYear: semester.academicYear,
    status: 'active',
  }).lean();
  
  const pricePerCredit = tuitionRule ? Math.round(tuitionRule.baseTuitionFee / tuitionRule.totalCredits) : 100;
  const fallbackCredits = tuitionRule ? tuitionRule.totalCredits : 22;
  
  // Get all enrollments for this semester
  const enrollments = await ClassEnrollment.find({
    status: { $in: ['enrolled', 'completed'] },
  })
    .populate({
      path: 'classSection',
      match: {
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
      },
      populate: {
        path: 'subject',
        select: 'credits',
      },
    })
    .lean();
  
  // Group enrollments by student and calculate tuition
  const enrollmentsByStudent = {};
  for (const enrollment of enrollments) {
    const studentId = enrollment.student.toString();
    const section = enrollment.classSection;
    if (section && section.subject) {
      if (!enrollmentsByStudent[studentId]) {
        enrollmentsByStudent[studentId] = { credits: 0, tuition: 0 };
      }
      const credits = section.subject.credits || 0;
      enrollmentsByStudent[studentId].credits += credits;
      enrollmentsByStudent[studentId].tuition += credits * pricePerCredit;
    }
  }
  
  // Get other fees
  const otherFees = await OtherFee.find({ semesterCode: semester.code }).lean();
  const otherFeesByStudent = {};
  for (const fee of otherFees) {
    const studentId = fee.student.toString();
    if (!otherFeesByStudent[studentId]) {
      otherFeesByStudent[studentId] = 0;
    }
    otherFeesByStudent[studentId] += fee.amount || 0;
  }
  
  // Build student payment summary
  const studentSummaries = [];
  let totalStudents = 0;
  let totalTuition = 0;
  let totalPaid = 0;
  let totalDebt = 0;
  let totalPaidStudents = 0;
  
  for (const student of students) {
    const studentId = student._id.toString();
    const enrolled = enrollmentsByStudent[studentId] || { credits: 0, tuition: 0 };
    
    // Use fallback credits if no enrollment
    const credits = enrolled.credits > 0 ? enrolled.credits : fallbackCredits;
    const tuition = enrolled.tuition > 0 ? enrolled.tuition : (credits * pricePerCredit);
    const otherFeesTotal = otherFeesByStudent[studentId] || 0;
    const totalAmount = tuition + otherFeesTotal;
    const paidAmount = paymentsByStudent[studentId] || 0;
    const remainingDebt = Math.max(0, totalAmount - paidAmount);
    const isPaid = remainingDebt === 0;
    
    totalStudents++;
    totalTuition += totalAmount;
    totalPaid += paidAmount;
    totalDebt += remainingDebt;
    if (isPaid) totalPaidStudents++;
    
    studentSummaries.push({
      studentId: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      majorCode: student.majorCode,
      cohort: student.cohort,
      graduationYear: student.graduationYear,
      credits: credits,
      tuitionFee: tuition,
      otherFees: otherFeesTotal,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      remainingDebt: remainingDebt,
      isPaid: isPaid,
    });
  }
  
  const summary = {
    semesterCode: semester.code,
    semesterName: semester.name,
    academicYear: semester.academicYear,
    totalStudents: totalStudents,
    totalPaidStudents: totalPaidStudents,
    totalUnpaidStudents: totalStudents - totalPaidStudents,
    totalTuition: totalTuition,
    totalPaid: totalPaid,
    totalDebt: totalDebt,
    pricePerCredit: pricePerCredit,
  };
  
  return { summary, students: studentSummaries };
}

// ─────────────────────────────────────────────────────────────
// getMyCurriculumPaymentStatus: Lấy trạng thái thanh toán theo kỳ curriculum
// Input: userId
// Output: { mustPay, currentCurriculumSemester, hasPaid, ... }
// ─────────────────────────────────────────────────────────────
async function getMyCurriculumPaymentStatus(userId) {
  const paymentValidation = require('./paymentValidation.service');
  const student = await findStudentByUserId(userId);
  return await paymentValidation.checkSemesterPaymentRequirement(student._id);
}

// getTuitionExcess: Số tiền nộp thừa so với học phí kỳ hiện tại (để chuyển vào ví)
// Input: userId
// Output: { excess, semesterCode, totalTuition, totalPaid, curriculumSemesterName }
// ─────────────────────────────────────────────────────────────
async function getTuitionExcess(userId) {
  const student = await findStudentByUserId(userId);
  const status = await getMyCurriculumPaymentStatus(userId);
  const semesterCode = status.semesterCode;
  const totalTuition = status.tuitionFee?.finalTuitionFee ?? 0;

  if (!semesterCode) {
    return { excess: 0, semesterCode: null, totalTuition: 0, totalPaid: 0, curriculumSemesterName: '' };
  }
  const payments = await Payment.find({
    student: student._id,
    semesterCode,
    status: 'completed',
  }).lean();
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const excess = Math.max(0, totalPaid - totalTuition);

  let alreadyRefunded = 0;
  if (excess > 0 && semesterCode) {
    const wallet = await Wallet.findOne({ userId }).lean();
    if (wallet) {
      const refundTxs = await WalletTransaction.find({
        wallet: wallet._id,
        type: 'refund',
        semesterCode,
      }).lean();
      alreadyRefunded = refundTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
    }
  }
  const refundable = Math.max(0, excess - alreadyRefunded);

  return {
    excess,
    alreadyRefunded,
    refundable,
    semesterCode: semesterCode || null,
    totalTuition,
    totalPaid,
    curriculumSemesterName: status.curriculumSemesterName || 'Học kỳ',
  };
}

// ─────────────────────────────────────────────────────────────
// createCurriculumPayment: Tạo yêu cầu thanh toán theo kỳ curriculum
// Input: userId
// Output: { checkoutUrl, orderCode, amount, ... }
// ─────────────────────────────────────────────────────────────
async function createCurriculumPayment(userId) {
  const paymentValidation = require('./paymentValidation.service');
  const autoEnrollment = require('./autoEnrollment.service');
  const payosService = require('./payos.service');
  
  const student = await findStudentByUserId(userId);
  
  // Lấy trạng thái thanh toán
  const paymentStatus = await paymentValidation.checkSemesterPaymentRequirement(student._id);
  
  // Nếu đã thanh toán rồi
  if (paymentStatus.hasPaid) {
    return {
      success: false,
      message: 'Bạn đã thanh toán học phí kỳ này rồi',
      paymentStatus
    };
  }
  
  // Lấy số tiền cần thanh toán
  let amount = 0;
  if (paymentStatus.tuitionFee && paymentStatus.tuitionFee.finalTuitionFee) {
    amount = paymentStatus.tuitionFee.finalTuitionFee;
  }
  
  // Nếu chưa có học phí, lấy preview để tính
  if (amount === 0) {
    const preview = await autoEnrollment.previewAutoEnrollment(student._id);
    if (preview.subjects && preview.subjects.length > 0) {
      // Tính học phí dựa trên số tín chỉ
      const tuitionFeeService = require('./tuitionFee.service');
      const totalCredits = preview.subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
      
      // Lấy giá tiền tín chỉ
      const tuitionRule = await TuitionFee.findOne({
        cohort: { $in: [String(student.cohort), `K${student.cohort}`, student.cohort] },
        academicYear: paymentStatus.currentAcademicYear,
        status: 'active'
      }).lean();
      
      const pricePerCredit = tuitionRule && tuitionRule.totalCredits > 0
        ? Math.round(tuitionRule.baseTuitionFee / tuitionRule.totalCredits)
        : 100; // 100 VNĐ / 1 tín chỉ
      
      amount = totalCredits * pricePerCredit;
    }
  }
  
  if (amount === 0) {
    return {
      success: false,
      message: 'Không có học phí cần thanh toán',
      paymentStatus
    };
  }
  
  // Tạo mô tả thanh toán
  const description = `HP ${paymentStatus.curriculumSemesterName} - ${student.studentCode}`;
  const productName = `Học phí ${paymentStatus.curriculumSemesterName}`;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Gọi PayOS tạo link thanh toán (đúng format: price, returnUrl, cancelUrl, productName)
  const payosPayload = {
    price: amount,
    description: description,
    productName: productName,
    returnUrl: `${baseUrl}/student/payment/result`,
    cancelUrl: `${baseUrl}/student/finance`,
    buyerName: student.fullName,
    buyerEmail: student.email,
  };
  
  const payosResult = await payosService.createPaymentLink(payosPayload);
  
  // PayOS có thể trả về checkoutUrl, qrCode, accountNumber, accountName (tùy API)
  return {
    success: true,
    checkoutUrl: payosResult.checkoutUrl || payosResult.data?.checkoutUrl,
    orderCode: payosResult.orderCode ?? payosResult.data?.orderCode,
    amount: amount,
    description: description,
    qrCode: payosResult.qrCode ?? payosResult.data?.qrCode,
    accountNumber: payosResult.accountNumber ?? payosResult.data?.accountNumber,
    accountName: payosResult.accountName ?? payosResult.data?.accountName ?? student.fullName,
    bin: payosResult.bin ?? payosResult.data?.bin,
    paymentStatus: paymentStatus,
    message: 'Tạo thanh toán thành công'
  };
}

module.exports = {
  getMyTuitionSummary,
  resolveSemester,
  findStudentByUserId,
  confirmPayment,
  getPaymentHistory,
  getAllStudentsPaymentSummary,
  getMyCurriculumPaymentStatus,
  createCurriculumPayment,
  getTuitionExcess,
};
