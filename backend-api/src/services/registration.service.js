const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Semester = require('../models/semester.model');
const Wallet = require('../models/wallet.model');
const Student = require('../models/student.model');
const curriculumService = require('./curriculum.service');
const paymentValidationService = require('./paymentValidation.service');
const registrationPeriodService = require('./registrationPeriod.service');

async function resolveSemester(semesterId, classSection) {
  if (semesterId) {
    return Semester.findById(semesterId).lean();
  }

  if (classSection?.semester && classSection?.academicYear) {
    const matchedSemester = await Semester.findOne({
      semesterNum: classSection.semester,
      academicYear: classSection.academicYear,
    }).lean();
    if (matchedSemester) return matchedSemester;
  }

  return Semester.findOne({ isCurrent: true }).lean();
}

async function getSemesterEnrollments(studentId, semester) {
  if (!semester) {
    return [];
  }

  return ClassEnrollment.find({
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
}

async function getCurriculumSubjectIdSet(student, semester) {
  const curriculum = await curriculumService.getCurriculumForStudent({
    majorCode: student.majorCode,
    enrollmentYear: student.enrollmentYear,
    cohort: student.cohort,
  });

  if (!curriculum || !semester) {
    return {
      curriculum: null,
      subjectIdSet: new Set(),
      curriculumSemesterOrder: null,
    };
  }

  const curriculumSemesterOrder = await paymentValidationService.calculateStudentCurriculumSemester(
    student,
    semester,
  );

  const subjects = await curriculumService.getSubjectsBySemester(
    curriculum._id,
    curriculumSemesterOrder,
  );

  const subjectIdSet = new Set(
    (subjects || [])
      .map((item) => item?.subject?._id?.toString())
      .filter(Boolean),
  );

  return {
    curriculum,
    subjectIdSet,
    curriculumSemesterOrder,
  };
}

/**
 * UC43 - Validate Prerequisites
 */
const validatePrerequisites = async (studentId, classId) => {
  const classSection = await ClassSection.findById(classId)
    .populate('subject')
    .exec();

  if (!classSection) {
    return {
      eligible: false,
      message: 'Class not found',
    };
  }

  const subject = classSection.subject;

  if (!subject.prerequisites || subject.prerequisites.length === 0) {
    return {
      eligible: true,
      message: 'No prerequisites required',
    };
  }

  const completedEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: 'completed',
    grade: { $gte: 5.0 },
  })
    .populate({
      path: 'classSection',
      populate: { path: 'subject' },
    })
    .exec();

  const passedSubjectCodes = completedEnrollments
    .map((enrollment) => enrollment.classSection?.subject?.subjectCode)
    .filter(Boolean);

  const missingPrerequisites = [];
  for (const prereq of subject.prerequisites) {
    if (!passedSubjectCodes.includes(prereq.code)) {
      missingPrerequisites.push(prereq);
    }
  }

  if (missingPrerequisites.length > 0) {
    return {
      eligible: false,
      message: `Missing prerequisites: ${missingPrerequisites.map((p) => p.name).join(', ')}`,
      missingPrerequisites,
    };
  }

  return {
    eligible: true,
    message: 'All prerequisites passed',
  };
};

/**
 * UC40 - Validate Class Capacity
 */
const validateClassCapacity = async (classId) => {
  const classSection = await ClassSection.findById(classId).exec();

  if (!classSection) {
    return {
      isFull: true,
      message: 'Class not found',
    };
  }

  const isFull = classSection.currentEnrollment >= classSection.maxCapacity;

  return {
    isFull,
    message: isFull ? 'Class is full' : 'Class available',
    current: classSection.currentEnrollment,
    max: classSection.maxCapacity,
  };
};

/**
 * UC33 - Validate Wallet Balance
 */
const validateWallet = async (studentId, classId) => {
  const student = await Student.findById(studentId).exec();
  if (!student) {
    return {
      isSufficient: false,
      message: 'Student not found',
    };
  }

  const classSection = await ClassSection.findById(classId)
    .populate('subject')
    .exec();

  if (!classSection) {
    return {
      isSufficient: false,
      message: 'Class not found',
    };
  }

  const subject = classSection.subject;
  const totalFee = subject.credits * (subject.tuitionFee || 100);

  const wallet = await Wallet.findOne({ userId: student.userId }).exec();

  if (!wallet) {
    return {
      isSufficient: false,
      message: 'Wallet not found',
      totalFee,
    };
  }

  const isSufficient = wallet.balance >= totalFee;

  return {
    isSufficient,
    message: isSufficient ? 'Sufficient balance' : 'Insufficient balance',
    currentBalance: wallet.balance,
    totalFee,
    credits: subject.credits,
    pricePerCredit: subject.tuitionFee || 100,
  };
};

async function checkOverloadLimit(studentId, semesterId, classId = null) {
  const student = await Student.findById(studentId).lean();
  if (!student) {
    return {
      allowed: false,
      message: 'Student not found',
      currentOverloadCount: 0,
      projectedOverloadCount: 0,
      maxOverloadCourses: 2,
    };
  }

  const classSection = classId
    ? await ClassSection.findById(classId).populate('subject', 'subjectCode subjectName').lean()
    : null;

  const semester = await resolveSemester(semesterId, classSection);
  const semesterEnrollments = await getSemesterEnrollments(studentId, semester);
  const normalizedEnrollments = semesterEnrollments
    .filter((item) => item.classSection)
    .map((item) => ({
      ...item,
      subjectId: item.classSection?.subject?._id?.toString(),
    }));

  const { subjectIdSet } = await getCurriculumSubjectIdSet(student, semester);

  const currentOverloadCount = normalizedEnrollments.filter((enrollment) => {
    if (enrollment.isOverload === true) return true;
    if (!subjectIdSet.size) return enrollment.isOverload === true;
    return enrollment.subjectId && !subjectIdSet.has(enrollment.subjectId);
  }).length;

  let projectedOverloadCount = currentOverloadCount;
  let enrollingCourseIsOverload = false;

  if (classSection?.subject?._id) {
    const subjectId = classSection.subject._id.toString();
    const alreadyEnrolled = normalizedEnrollments.some((e) => e.subjectId === subjectId);
    if (!alreadyEnrolled) {
      if (!subjectIdSet.size) {
        enrollingCourseIsOverload = false;
      } else {
        enrollingCourseIsOverload = !subjectIdSet.has(subjectId);
      }
      if (enrollingCourseIsOverload) {
        projectedOverloadCount += 1;
      }
    }
  }

  return {
    allowed: projectedOverloadCount <= 2,
    message:
      projectedOverloadCount > 2
        ? 'You have exceeded the overload limit (maximum 2 courses)'
        : 'Overload limit check passed',
    maxOverloadCourses: 2,
    currentOverloadCount,
    projectedOverloadCount,
    enrollingCourseIsOverload,
  };
}

async function checkCreditLimit(studentId, semesterId, newCredits = 0, maxCredits = 20) {
  const normalizedMaxCredits = Number(maxCredits) > 0 ? Number(maxCredits) : 20;
  const normalizedNewCredits = Number(newCredits) > 0 ? Number(newCredits) : 0;

  const semester = await resolveSemester(semesterId, null);
  const semesterEnrollments = await getSemesterEnrollments(studentId, semester);

  const currentCredits = semesterEnrollments
    .filter((item) => item.classSection)
    .reduce((sum, enrollment) => sum + Number(enrollment.classSection?.subject?.credits || 0), 0);

  const projectedCredits = currentCredits + normalizedNewCredits;
  const allowed = projectedCredits <= normalizedMaxCredits;

  return {
    allowed,
    message: allowed
      ? 'Credit limit check passed'
      : `Credit limit exceeded (${projectedCredits}/${normalizedMaxCredits})`,
    currentCredits,
    newCredits: normalizedNewCredits,
    projectedCredits,
    maxCredits: normalizedMaxCredits,
  };
}

async function getStudentEligibilitySummary(studentId, classId = null) {
  const student = await Student.findById(studentId).lean();
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const classSection = classId
    ? await ClassSection.findById(classId).populate('subject', 'credits').lean()
    : null;

  const semester = await resolveSemester(null, classSection);
  const overload = await checkOverloadLimit(studentId, semester?._id, classId);
  const credit = await checkCreditLimit(
    studentId,
    semester?._id,
    classSection?.subject?.credits || 0,
    20,
  );
  const cohortAccess = await registrationPeriodService.validateCurrentPeriodCohort(student.cohort);

  return {
    student: {
      id: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      cohort: student.cohort,
      majorCode: student.majorCode,
    },
    semester: semester
      ? {
          id: semester._id,
          code: semester.code,
          name: semester.name,
          semesterNum: semester.semesterNum,
          academicYear: semester.academicYear,
        }
      : null,
    limits: {
      overload,
      credit,
      cohortAccess,
    },
    canRegister: overload.allowed && credit.allowed && cohortAccess.allowed,
  };
}

/**
 * Helper: Verify prerequisite subjects passed
 */
const verifyPrerequisiteSubjects = async (studentId, prerequisites) => {
  const completedEnrollments = await ClassEnrollment.find({
    student: studentId,
    status: 'completed',
    grade: { $gte: 5.0 },
  })
    .populate({
      path: 'classSection',
      populate: { path: 'subject' },
    })
    .lean();

  const passedSubjectCodes = new Set(
    completedEnrollments
      .map((enrollment) => enrollment.classSection?.subject?.subjectCode)
      .filter(Boolean),
  );

  return prerequisites.map((prereq) => ({
    code: prereq.code,
    name: prereq.name,
    passed: passedSubjectCodes.has(prereq.code),
  }));
};

module.exports = {
  validatePrerequisites,
  validateClassCapacity,
  validateWallet,
  verifyPrerequisiteSubjects,
  checkOverloadLimit,
  checkCreditLimit,
  getStudentEligibilitySummary,
};
