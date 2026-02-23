const User            = require('../models/user.model');
const Student         = require('../models/student.model');
const Semester        = require('../models/semester.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const ClassSection    = require('../models/classSection.model');
const Subject         = require('../models/subject.model');
const TuitionFee      = require('../models/tuitionFee.model');
const Payment         = require('../models/payment.model');
const OtherFee        = require('../models/otherFee.model');

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

  const pricePerCredit = tuitionRule ? tuitionRule.price : 630_000;
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

module.exports = {
  getMyTuitionSummary,
  resolveSemester,
  findStudentByUserId,
};
