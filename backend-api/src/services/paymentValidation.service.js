// paymentValidation.service.js
// Service kiểm tra và xử lý logic thanh toán theo kỳ của khung chương trình
// Tác giả: Group02 - WDP391

const Student = require("../models/student.model");
const Semester = require("../models/semester.model");
const Payment = require("../models/payment.model");
const TuitionFee = require("../models/tuitionFee.model");
const ClassEnrollment = require("../models/classEnrollment.model");
const curriculumService = require("./curriculum.service");

/**
 * Tính kỳ trong khung theo năm học hệ thống + năm nhập học:
 * academicYearsElapsed * termsPerYear + semesterIndex (HK1/HK2).
 * Nếu năm bắt đầu của kỳ hệ thống < enrollmentYear (SV chưa vào năm học khóa) → trả về 1.
 *
 * @param {Object} student - student document
 * @param {Object} currentSemester - semester đang diễn ra
 * @returns {Number} semesterOrder (1, 2, 3...)
 */
function parseAcademicYearStart(academicYear) {
  if (!academicYear || typeof academicYear !== "string") return null;

  const [startYearRaw] = academicYear.split(/[-/]/);
  const startYear = parseInt(startYearRaw, 10);
  return Number.isNaN(startYear) ? null : startYear;
}

async function resolveTermsPerYear(currentSemester) {
  const configuredTermsPerYear = parseInt(
    process.env.CURRICULUM_TERMS_PER_YEAR || "",
    10,
  );
  if (!Number.isNaN(configuredTermsPerYear) && configuredTermsPerYear > 0) {
    return configuredTermsPerYear;
  }

  const semesterNumbers = await Semester.distinct("semesterNum", {
    isActive: { $ne: false },
  });
  const normalizedSemesterNumbers = semesterNumbers
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value) && value > 0);

  return Math.max(
    2,
    parseInt(currentSemester?.semesterNum, 10) || 1,
    normalizedSemesterNumbers.length > 0
      ? Math.max(...normalizedSemesterNumbers)
      : 0,
  );
}

async function calculateStudentCurriculumSemester(
  student,
  currentSemester,
  options = {},
) {
  if (!student || !currentSemester) return 1;

  const enrollmentYear = parseInt(student.enrollmentYear, 10);
  const academicYearStart = parseAcademicYearStart(
    currentSemester.academicYear,
  );
  const semesterIndex = Math.max(
    1,
    parseInt(currentSemester.semesterNum, 10) || 1,
  );

  if (Number.isNaN(enrollmentYear) || academicYearStart == null) return 1;

  // Kỳ hệ thống (vd 2025-2026) mà năm bắt đầu < năm nhập học (vd K26 = 2026):
  // SV chưa thuộc năm học chính thức của khóa → vẫn coi là kỳ 1 trong khung,
  // không được cộng HK2 của năm trước thành "kỳ 2" (bug K26 bị kỳ 2 dù chưa học HK1).
  if (academicYearStart < enrollmentYear) {
    return 1;
  }

  const termsPerYear =
    Number.isInteger(options.termsPerYear) && options.termsPerYear > 0
      ? options.termsPerYear
      : await resolveTermsPerYear(currentSemester);
  const academicYearsElapsed = Math.max(0, academicYearStart - enrollmentYear);

  return academicYearsElapsed * termsPerYear + semesterIndex;
}

/**
 * Kỳ trong khung để hiển thị / học phí:
 * - Tính từ kỳ hệ thống hiện tại + năm nhập học (calculateStudentCurriculumSemester).
 * - Nếu DB (currentCurriculumSemester) lớn hơn giá trị tính được → dùng giá trị tính (tránh nhảy HK2 khi mới HK1).
 * - Ngược lại giữ DB (admin / tiến độ thực tế).
 */
async function resolveDisplayedCurriculumSemester(student, options = {}) {
  if (!student) return 1;
  const currentSystemSemester =
    options.currentSystemSemester ??
    (await Semester.findOne({ isCurrent: true, isActive: true }).lean());
  const computed = currentSystemSemester
    ? await calculateStudentCurriculumSemester(student, currentSystemSemester, options)
    : 1;
  const stored = student.currentCurriculumSemester;
  if (stored == null || stored < 1 || stored > 9) return computed;

  // DB lưu kỳ trong khung cao hơn kỳ suy ra từ kỳ hệ thống (vd nhầm 2 khi đang HK1 năm đầu)
  // → đồng bộ với học phí / thực tế: tin theo lịch (calculateStudentCurriculumSemester).
  if (computed < stored) return computed;

  return stored;
}

async function calculateStudentCurriculumSemesterLegacy(
  student,
  currentSemester,
) {
  if (!student || !currentSemester) return 1;

  const enrollmentYear = student.enrollmentYear;
  if (!enrollmentYear) return 1;

  // Lấy năm kết thúc từ academicYear (vd: "2025-2026" → 2026)
  const academicYearParts = currentSemester.academicYear.split(/[-/]/);
  const currentYear = parseInt(academicYearParts[academicYearParts.length - 1]);

  if (isNaN(currentYear) || isNaN(enrollmentYear)) return 1;

  // Công thức tính kỳ
  let curriculumSemester = currentYear - enrollmentYear + 1;

  // Đảm bảo không nhỏ hơn 1
  return Math.max(1, curriculumSemester);
}

/**
 * Tạo mã kỳ thanh toán theo format: K{semesterOrder}_{curriculumCode}
 * Ví dụ: K1_CEK18, K2_CEK19
 * @param {Number} semesterOrder
 * @param {String} curriculumCode
 * @returns {String}
 */
function generateSemesterPaymentCode(semesterOrder, curriculumCode) {
  return `K${semesterOrder}_${curriculumCode || "DEFAULT"}`;
}

/**
 * Lấy tổng số tín chỉ của kỳ từ khung chương trình
 * @param {String} curriculumId - ObjectId của Curriculum
 * @param {Number} semesterOrder - Kỳ trong khung chương trình (1, 2, 3...)
 * @returns {Object} - { totalCredits, subjects: [{ subjectCode, subjectName, credits }] }
 */
async function getCreditsFromCurriculum(curriculumId, semesterOrder) {
  const subjects = await curriculumService.getSubjectsBySemester(
    curriculumId,
    semesterOrder,
  );
  let totalCredits = 0;
  const list = [];
  for (const item of subjects) {
    const credits = item.credits ?? item.subject?.credits ?? 0;
    totalCredits += credits;
    list.push({
      subjectCode: item.subject?.subjectCode,
      subjectName: item.subject?.subjectName,
      credits,
    });
  }
  return { totalCredits, subjects: list };
}

/**
 * Tìm học phí theo kỳ curriculum (TuitionFee dùng semester là String: "Kỳ 1", "Học kỳ 1")
 * @param {String|Number} cohort - Khóa sinh viên (18, K18, CE18...)
 * @param {Number} semesterOrder - Kỳ trong khung chương trình (1, 2, 3...)
 * @param {String} majorCode - Mã ngành
 * @returns {Object|null}
 */
async function findTuitionByCurriculumSemester(
  cohort,
  semesterOrder,
  majorCode,
) {
  const cohortStr = String(cohort).replace(/^K/i, "");
  // TuitionFee.semester lưu dạng String: "Kỳ 1", "Học kỳ 1"
  const semesterVariants = [
    `Kỳ ${semesterOrder}`,
    `Học kỳ ${semesterOrder}`,
    `Semester ${semesterOrder}`,
    String(semesterOrder),
  ];

  let tuitionFee = await TuitionFee.findOne({
    cohort: { $in: [`K${cohortStr}`, cohortStr, Number(cohortStr)] },
    semester: { $in: semesterVariants },
    status: "active",
  }).lean();

  if (!tuitionFee) {
    tuitionFee = await TuitionFee.findOne({
      majorCode: majorCode,
      semester: { $in: semesterVariants },
      status: "active",
    }).lean();
  }

  return tuitionFee;
}

/**
 * Tổng tín chỉ đã đăng ký trong năm học + học kỳ hệ thống (theo lớp học phần),
 * gom theo môn (một môn nhiều ca chỉ tính một lần) — khớp logic cần thu học phí thực tế.
 */
async function sumEnrolledCreditsForTeachingPeriod(studentId, semesterNum, academicYear) {
  if (!academicYear || semesterNum == null || semesterNum === "") {
    return { totalCredits: 0, subjects: [] };
  }

  const enrollments = await ClassEnrollment.find({
    student: studentId,
    status: { $in: ["enrolled", "completed"] },
  })
    .populate({
      path: "classSection",
      match: {
        semester: Number(semesterNum),
        academicYear: String(academicYear),
      },
      populate: {
        path: "subject",
        select: "subjectCode subjectName credits",
      },
    })
    .lean();

  const bySubjectId = new Map();
  for (const e of enrollments) {
    const sec = e.classSection;
    if (!sec || !sec.subject) continue;
    const sub = sec.subject;
    const id = sub._id.toString();
    if (!bySubjectId.has(id)) {
      bySubjectId.set(id, {
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits || 0,
      });
    }
  }

  const subjects = Array.from(bySubjectId.values());
  const totalCredits = subjects.reduce((s, x) => s + (x.credits || 0), 0);
  return { totalCredits, subjects };
}

/**
 * Kiểm tra sinh viên có phải thanh toán học kỳ hiện tại không
 * @param {String} studentId - ObjectId của sinh viên
 * @returns {Object} - { mustPay, currentCurriculumSemester, hasPaid, ... }
 */
async function checkSemesterPaymentRequirement(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    const err = new Error("Không tìm thấy sinh viên");
    err.statusCode = 404;
    throw err;
  }

  // Lấy học kỳ hiện tại của trường
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    const err = new Error("Không tìm thấy học kỳ hiện tại");
    err.statusCode = 404;
    throw err;
  }

  const curriculumSemesterOrder = await resolveDisplayedCurriculumSemester(student, {
    currentSystemSemester: currentSemester,
  });

  // Khung chương trình: ưu tiên khớp curriculumId + năm nhập học (cùng logic lịch học / xếp lớp)
  const { curriculum } = await curriculumService.resolveCurriculumForStudentRecord(
    student.toObject ? student.toObject() : student,
  );

  const curriculumCode =
    curriculum?.code || `${student.majorCode}K${student.cohort}`;
  const semesterPaymentCode = generateSemesterPaymentCode(
    curriculumSemesterOrder,
    curriculumCode,
  );

  // Kiểm tra đã thanh toán kỳ này chưa
  const payment = await Payment.findOne({
    student: studentId,
    semesterCode: semesterPaymentCode,
    status: "completed",
  }).lean();

  const hasPaid = !!payment;

  // Lấy đúng số tín chỉ từ khung chương trình cho kỳ này (dự kiến)
  let totalCreditsFromCurriculum = 0;
  let curriculumSubjects = [];
  if (curriculum && curriculum._id) {
    const creditsInfo = await getCreditsFromCurriculum(
      curriculum._id,
      curriculumSemesterOrder,
    );
    totalCreditsFromCurriculum = creditsInfo.totalCredits;
    curriculumSubjects = creditsInfo.subjects || [];
  }

  // Năm học / học kỳ hệ thống gắn với khóa (để khớp lớp học phần đã đăng ký)
  const teachingCtx = await resolveTeachingContextForClassSections(
    student.toObject ? student.toObject() : student,
    curriculumSemesterOrder,
  );

  const enrolledInfo = await sumEnrolledCreditsForTeachingPeriod(
    studentId,
    teachingCtx.semesterNum,
    teachingCtx.academicYear,
  );

  // Ưu tiên học phí theo tín chỉ đã đăng ký thực tế; nếu chưa có lớp thì dùng khung CT (trước kỳ đăng ký)
  const billingCredits =
    enrolledInfo.totalCredits > 0
      ? enrolledInfo.totalCredits
      : totalCreditsFromCurriculum;
  const billingSubjects =
    enrolledInfo.totalCredits > 0 ? enrolledInfo.subjects : curriculumSubjects;
  const tuitionCreditSource =
    enrolledInfo.totalCredits > 0 ? "enrollment" : "curriculum";

  // Lấy quy định học phí (để có giá/tín chỉ) - TuitionFee.semester là String
  const tuitionFeeRule = await findTuitionByCurriculumSemester(
    student.cohort,
    curriculumSemesterOrder,
    student.majorCode,
  );

  // Luôn dùng 100 VNĐ / 1 tín chỉ (theo yêu cầu hệ thống)
  const PRICE_PER_CREDIT = 100;
  const pricePerCredit = PRICE_PER_CREDIT;

  const baseTuitionFee = billingCredits * pricePerCredit;
  const finalTuitionFee = baseTuitionFee;

  const tuitionFeePayload =
    billingCredits > 0 || tuitionFeeRule
      ? {
          totalCredits: billingCredits,
          pricePerCredit,
          baseTuitionFee,
          finalTuitionFee,
          curriculumSubjects: billingSubjects,
          plannedCurriculumCredits: totalCreditsFromCurriculum,
          tuitionCreditSource,
        }
      : null;

  // Xác định có phải thanh toán bắt buộc không
  const isNewStudent = curriculumSemesterOrder === 1;
  const mustPay = !hasPaid;

  const cohortSemester = teachingCtx.matchedSemester;
  const paymentAcademicYear = teachingCtx.academicYear;
  const paymentSemesterDisplayName =
    cohortSemester?.name ||
    `Học kỳ ${teachingCtx.semesterNum} năm học ${teachingCtx.academicYear}`;
  const deadline =
    cohortSemester?.startDate ||
    teachingCtx.startDate ||
    currentSemester.startDate;

  // Kiểm tra deadline đã qua chưa
  const now = new Date();
  const isOverdue = deadline && now > new Date(deadline);

  return {
    mustPay: mustPay,
    isNewStudent: isNewStudent,
    currentCurriculumSemester: curriculumSemesterOrder,
    curriculumSemesterName: `Học kỳ ${curriculumSemesterOrder}`,
    semesterCode: semesterPaymentCode,
    semesterCodeSchool: cohortSemester?.code || currentSemester.code,
    hasPaid: hasPaid,
    payment: payment || null,
    curriculumCode: curriculumCode,
    curriculumName: curriculum?.name || "Chưa xác định",
    deadline: deadline,
    isOverdue: isOverdue,
    currentSemesterName: paymentSemesterDisplayName,
    currentAcademicYear: paymentAcademicYear,
    // Kỳ toàn trường (isCurrent) — tham chiếu khi cần
    schoolWideSemester: {
      code: currentSemester.code,
      name: currentSemester.name,
      academicYear: currentSemester.academicYear,
    },
    teachingContextSource: teachingCtx.source,
    tuitionFee: tuitionFeePayload,
    studentInfo: {
      studentCode: student.studentCode,
      fullName: student.fullName,
      majorCode: student.majorCode,
      cohort: student.cohort,
      enrollmentYear: student.enrollmentYear,
    },
  };
}

/**
 * Lấy danh sách các kỳ cần thanh toán (bao gồm các kỳ đã bỏ lỡ)
 * @param {String} studentId
 * @returns {Array}
 */
async function getAllUnpaidSemesters(studentId) {
  const student = await Student.findById(studentId);
  if (!student) {
    const err = new Error("Không tìm thấy sinh viên");
    err.statusCode = 404;
    throw err;
  }

  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) return [];

  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort,
  });

  const curriculumCode =
    curriculum?.code || `${student.majorCode}K${student.cohort}`;

  const currentCurriculumSemester = await resolveDisplayedCurriculumSemester(student, {
    currentSystemSemester: currentSemester,
  });

  // Lấy tất cả các kỳ đã thanh toán
  const payments = await Payment.find({
    student: studentId,
    status: "completed",
    semesterCode: new RegExp(`^K\\d+_${curriculumCode}`),
  }).lean();

  const paidSemesters = new Set(
    payments
      .map((p) => {
        const match = p.semesterCode.match(/^K(\d+)_/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(Boolean),
  );

  // Tìm các kỳ chưa thanh toán
  const unpaidSemesters = [];
  for (let i = 1; i <= currentCurriculumSemester; i++) {
    if (!paidSemesters.has(i)) {
      const tuitionFee = await findTuitionByCurriculumSemester(
        student.cohort,
        i,
        student.majorCode,
      );
      unpaidSemesters.push({
        semesterOrder: i,
        semesterCode: generateSemesterPaymentCode(i, curriculumCode),
        semesterName: `Học kỳ ${i}`,
        tuitionFee: tuitionFee ? tuitionFee.finalTuitionFee : 0,
        isOverdue: i < currentCurriculumSemester,
      });
    }
  }

  return unpaidSemesters;
}

/**
 * Kiểm tra sinh viên có được phép đăng ký môn học không
 * @param {String} studentId
 * @returns {Object} - { canEnroll, reason, paymentStatus }
 */
async function checkEnrollmentPermission(studentId) {
  const paymentStatus = await checkSemesterPaymentRequirement(studentId);

  // Nếu là sinh viên mới và chưa thanh toán kỳ 1 → không được đăng ký
  if (paymentStatus.isNewStudent && !paymentStatus.hasPaid) {
    return {
      canEnroll: false,
      reason: "new_student_unpaid",
      message:
        "Sinh viên mới phải thanh toán học phí kỳ 1 trước khi đăng ký môn học",
      paymentStatus,
    };
  }

  // Nếu đã thanh toán → được đăng ký
  if (paymentStatus.hasPaid) {
    return {
      canEnroll: true,
      reason: "paid",
      message: "Đã thanh toán học phí kỳ hiện tại",
      paymentStatus,
    };
  }

  // Trường hợp khác: có thể đăng ký nhưng sẽ bị cảnh báo
  return {
    canEnroll: true,
    reason: "enrolled_before_payment",
    message: "Cảnh báo: Chưa thanh toán học phí kỳ hiện tại",
    paymentStatus,
  };
}

/**
 * Kiểm tra sinh viên có nợ học phí các kỳ trước không
 * @param {String} studentId - ObjectId của sinh viên
 * @param {String} currentSemesterId - Kỳ hiện tại đang đăng ký
 * @returns {Object} - { hasDebt, unpaidBills, canEnroll, message }
 */
async function checkPendingTuition(studentId, currentSemesterId) {
  const TuitionBill = require("../models/tuitionBill.model");
  const Semester = require("../models/semester.model");

  // Lấy thông tin kỳ hiện tại
  const currentSemester = await Semester.findById(currentSemesterId).lean();
  if (!currentSemester) {
    return {
      hasDebt: false,
      unpaidBills: [],
      canEnroll: true,
      message: "Kỳ học không xác định",
    };
  }

  // Tìm tất cả các kỳ trước kỳ hiện tại (dùng semesterNum và academicYear)
  const previousSemesters = await Semester.find({
    $or: [
      {
        academicYear: currentSemester.academicYear,
        semesterNum: { $lt: currentSemester.semesterNum },
      },
      { academicYear: { $lt: currentSemester.academicYear } },
    ],
  }).lean();

  const previousSemesterIds = previousSemesters.map((s) => s._id);

  // Tìm tất cả bill của SV trong các kỳ trước
  const unpaidBills = await TuitionBill.find({
    student: studentId,
    semester: { $in: previousSemesterIds },
    status: { $in: ["pending", "overdue"] },
  }).lean();

  if (unpaidBills.length > 0) {
    const totalDebt = unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0);
    return {
      hasDebt: true,
      unpaidBills: unpaidBills.map((b) => ({
        semesterName: b.semesterName,
        academicYear: b.academicYear,
        amount: b.totalAmount,
        status: b.status,
        dueDate: b.dueDate,
      })),
      totalDebt,
      canEnroll: false,
      message: `Còn nợ ${unpaidBills.length} kỳ học phí. Tổng nợ: ${totalDebt.toLocaleString()} VNĐ`,
    };
  }

  return {
    hasDebt: false,
    unpaidBills: [],
    canEnroll: true,
    message: "Không có nợ học phí",
  };
}

/**
 * Xác định học kỳ hệ thống (semesterNum) + năm học (academicYear) để tìm ClassSection / xếp lịch,
 * dựa trên năm nhập học và thứ tự kỳ trong khung chương trình — tránh gán SV nhập 2026 vào lớp 2025-2026.
 *
 * @param {Object} student - có enrollmentYear
 * @param {Number} curriculumSemesterOrder - kỳ trong khung (1..9)
 */
async function resolveTeachingContextForClassSections(student, curriculumSemesterOrder) {
  const currentSemester = await Semester.findOne({ isCurrent: true, isActive: true }).lean();
  const termsPerYear = await resolveTermsPerYear(currentSemester);
  const order = Math.max(1, parseInt(String(curriculumSemesterOrder), 10) || 1);
  const enrollmentYear = parseInt(student?.enrollmentYear, 10);

  if (Number.isNaN(enrollmentYear)) {
    if (currentSemester) {
      return {
        semesterNum: currentSemester.semesterNum,
        academicYear: currentSemester.academicYear,
        startDate: currentSemester.startDate || null,
        endDate: currentSemester.endDate || null,
        source: "system_current_semester",
        matchedSemesterCode: currentSemester.code || null,
        matchedSemester: currentSemester,
      };
    }
    const y = new Date().getFullYear();
    return {
      semesterNum: 1,
      academicYear: `${y}-${y + 1}`,
      startDate: null,
      endDate: null,
      source: "fallback_date",
      matchedSemesterCode: null,
      matchedSemester: null,
    };
  }

  const yearInProgram = Math.floor((order - 1) / termsPerYear);
  const startYear = enrollmentYear + yearInProgram;
  const academicYear = `${startYear}-${startYear + 1}`;
  const semesterNum = ((order - 1) % termsPerYear) + 1;

  const matchedSemester = await Semester.findOne({
    academicYear,
    semesterNum,
    isActive: { $ne: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    semesterNum,
    academicYear,
    startDate: matchedSemester?.startDate || null,
    endDate: matchedSemester?.endDate || null,
    source: "from_enrollment_year",
    matchedSemesterCode: matchedSemester?.code || null,
    matchedSemester: matchedSemester || null,
  };
}

module.exports = {
  parseAcademicYearStart,
  resolveTermsPerYear,
  calculateStudentCurriculumSemester,
  resolveDisplayedCurriculumSemester,
  resolveTeachingContextForClassSections,
  generateSemesterPaymentCode,
  getCreditsFromCurriculum,
  findTuitionByCurriculumSemester,
  checkSemesterPaymentRequirement,
  getAllUnpaidSemesters,
  checkEnrollmentPermission,
  checkPendingTuition,
};
