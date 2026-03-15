const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const Semester = require('../src/models/semester.model');
const Student = require('../src/models/student.model');
const Teacher = require('../src/models/teacher.model');
const Subject = require('../src/models/subject.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const Waitlist = require('../src/models/waitlist.model');
const autoEnrollmentService = require('../src/modules/autoEnrollment/autoEnrollment.service');
const classSectionService = require('../src/modules/classSection/classSection.service');
const registrationService = require('../src/services/registration.service');
const registrationPeriodService = require('../src/services/registrationPeriod.service');
const teachingScheduleService = require('../src/modules/lecturer/teachingSchedule.service');
const semesterService = require('../src/modules/semester/semester.service');
const semesterRepo = require('../src/modules/semester/semester.repository');

const AUTO_FIXTURE_CODES = [
  'FXTAESE2501',
  'FXTAESE2502',
  'FXTAESE2503',
  'FXTAECE2501',
  'FXTAECE2502',
  'FXTAECA2501',
  'FXTAECA2502',
  'FXTAEBA2501',
  'FXTAEBA2502',
  'FXTAEAI2601',
  'FXTAEAI2602',
  'FXTAEDS2601',
  'FXTAEDS2602',
  'FXTAEDS2603',
  'FXTAEDS2604',
];

const OTHER_FIXTURE_CODES = {
  overload: 'FXTOLSE2501',
  prereqFail: 'FXTPRSE2501',
  prereqPass: 'FXTPPSE2501',
  credit: 'FXTCRSE2401',
  cohortBlocked: 'FXTCBSE2101',
};

function ensureConnectionUri() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in backend-api/.env');
  }
  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'verify-feature-flows',
  };
}

function toObjectId(value) {
  return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(String(value));
}

function groupByStudentCode(rows) {
  return rows.reduce((acc, row) => {
    const studentCode = row.student?.studentCode || 'UNKNOWN';
    if (!acc[studentCode]) acc[studentCode] = [];
    acc[studentCode].push({
      subjectCode: row.classSection?.subject?.subjectCode || null,
      classCode: row.classSection?.classCode || null,
      status: row.status,
      isOverload: row.isOverload === true,
    });
    return acc;
  }, {});
}

function groupWaitlistsByStudentCode(rows) {
  return rows.reduce((acc, row) => {
    const studentCode = row.student?.studentCode || 'UNKNOWN';
    if (!acc[studentCode]) acc[studentCode] = [];
    acc[studentCode].push({
      subjectCode: row.subject?.subjectCode || null,
      status: row.status,
      semester: row.targetSemester,
      academicYear: row.targetAcademicYear,
    });
    return acc;
  }, {});
}

async function getCurrentSemester() {
  const semester = await Semester.findOne({ isCurrent: true }).lean();
  if (!semester) {
    throw new Error('No current semester found');
  }
  return semester;
}

async function getCurrentSemesterClassSectionIds(semester) {
  const classes = await ClassSection.find({
    semester: semester.semesterNum,
    academicYear: semester.academicYear,
  })
    .select('_id')
    .lean();
  return classes.map((item) => item._id);
}

async function cleanupFixtureAutoState(currentSemester, students) {
  const studentIds = students.map((student) => student._id);
  const currentSemesterClassSectionIds = await getCurrentSemesterClassSectionIds(currentSemester);

  if (studentIds.length === 0 || currentSemesterClassSectionIds.length === 0) {
    return {
      removedEnrollments: 0,
      removedWaitlists: 0,
      touchedClasses: 0,
    };
  }

  const existingEnrollments = await ClassEnrollment.find({
    student: { $in: studentIds },
    classSection: { $in: currentSemesterClassSectionIds },
  })
    .select('_id classSection')
    .lean();

  const classSectionDecrements = new Map();
  existingEnrollments.forEach((enrollment) => {
    const key = String(enrollment.classSection);
    classSectionDecrements.set(key, (classSectionDecrements.get(key) || 0) + 1);
  });

  if (existingEnrollments.length > 0) {
    await ClassEnrollment.deleteMany({
      _id: { $in: existingEnrollments.map((item) => item._id) },
    });
  }

  if (classSectionDecrements.size > 0) {
    await ClassSection.bulkWrite(
      Array.from(classSectionDecrements.entries()).map(([classSectionId, count]) => ({
        updateOne: {
          filter: { _id: toObjectId(classSectionId) },
          update: { $inc: { currentEnrollment: -count } },
        },
      })),
      { ordered: false },
    );
  }

  const waitlistDeletion = await Waitlist.deleteMany({
    student: { $in: studentIds },
    targetSemester: currentSemester.semesterNum,
    targetAcademicYear: currentSemester.academicYear,
  });

  return {
    removedEnrollments: existingEnrollments.length,
    removedWaitlists: waitlistDeletion.deletedCount || 0,
    touchedClasses: classSectionDecrements.size,
  };
}

async function findFixtureClass(currentSemester, subjectCode) {
  const subject = await Subject.findOne({ subjectCode }).lean();
  if (!subject) {
    throw new Error(`Subject ${subjectCode} not found`);
  }

  const classSection = await ClassSection.findOne({
    subject: subject._id,
    semester: currentSemester.semesterNum,
    academicYear: currentSemester.academicYear,
  }).lean();

  if (!classSection) {
    throw new Error(`Current-semester class for subject ${subjectCode} not found`);
  }

  return classSection;
}

async function runAutoEnrollmentTest(currentSemester) {
  const students = await Student.find({
    studentCode: { $in: AUTO_FIXTURE_CODES },
  })
    .select('_id studentCode fullName majorCode')
    .sort({ studentCode: 1 })
    .lean();

  const cleanup = await cleanupFixtureAutoState(currentSemester, students);
  const triggerResult = await autoEnrollmentService.triggerAutoEnrollment(String(currentSemester._id), {
    studentCodes: AUTO_FIXTURE_CODES,
    dryRun: false,
  });

  const enrollments = await ClassEnrollment.find({
    student: { $in: students.map((student) => student._id) },
  })
    .populate('student', 'studentCode fullName')
    .populate({
      path: 'classSection',
      populate: { path: 'subject', select: 'subjectCode subjectName credits' },
    })
    .lean();

  const currentSemesterEnrollments = enrollments.filter((row) => {
    const classSection = row.classSection;
    return (
      classSection &&
      classSection.semester === currentSemester.semesterNum &&
      classSection.academicYear === currentSemester.academicYear
    );
  });

  const waitlists = await Waitlist.find({
    student: { $in: students.map((student) => student._id) },
    targetSemester: currentSemester.semesterNum,
    targetAcademicYear: currentSemester.academicYear,
    status: 'WAITING',
  })
    .populate('student', 'studentCode fullName')
    .populate('subject', 'subjectCode subjectName')
    .lean();

  return {
    cleanup,
    trigger: {
      success: triggerResult.success,
      totalStudents: triggerResult.summary?.totalStudents,
      processedStudents: triggerResult.summary?.processedStudents,
      candidateStudents: triggerResult.summary?.candidateStudents,
      studentsWithEnrollments: triggerResult.summary?.studentsWithEnrollments,
      studentsWithErrors: triggerResult.summary?.studentsWithErrors,
      totalEnrollments: triggerResult.summary?.totalEnrollments,
      waitlisted: triggerResult.summary?.waitlisted,
      duplicates: triggerResult.summary?.duplicates,
      failed: triggerResult.summary?.failed,
      durationMs: triggerResult.durationMs,
    },
    db: {
      enrollmentCount: currentSemesterEnrollments.length,
      waitlistCount: waitlists.length,
      enrollmentsByStudent: groupByStudentCode(currentSemesterEnrollments),
      waitlistsByStudent: groupWaitlistsByStudentCode(waitlists),
    },
  };
}

async function runPrerequisiteTests(currentSemester, studentsByCode) {
  const targetClass = await findFixtureClass(currentSemester, 'FXSEP201');
  const failResult = await registrationService.validatePrerequisites(
    studentsByCode[OTHER_FIXTURE_CODES.prereqFail]._id,
    targetClass._id,
  );
  const passResult = await registrationService.validatePrerequisites(
    studentsByCode[OTHER_FIXTURE_CODES.prereqPass]._id,
    targetClass._id,
  );

  return {
    classCode: targetClass.classCode,
    failStudent: {
      studentCode: OTHER_FIXTURE_CODES.prereqFail,
      eligible: failResult.eligible,
      message: failResult.message,
    },
    passStudent: {
      studentCode: OTHER_FIXTURE_CODES.prereqPass,
      eligible: passResult.eligible,
      message: passResult.message,
    },
  };
}

async function runOverloadTests(currentSemester, studentsByCode) {
  const overloadClass = await findFixtureClass(currentSemester, 'FXSE401B');
  const normalClass = await findFixtureClass(currentSemester, 'FXSE201A');

  const blockedResult = await registrationService.checkOverloadLimit(
    studentsByCode[OTHER_FIXTURE_CODES.overload]._id,
    currentSemester._id,
    overloadClass._id,
  );

  const allowedResult = await registrationService.checkOverloadLimit(
    studentsByCode[OTHER_FIXTURE_CODES.overload]._id,
    currentSemester._id,
    normalClass._id,
  );

  return {
    blockedScenario: {
      classCode: overloadClass.classCode,
      subjectCode: 'FXSE401B',
      allowed: blockedResult.allowed,
      currentOverloadCount: blockedResult.currentOverloadCount,
      projectedOverloadCount: blockedResult.projectedOverloadCount,
      message: blockedResult.message,
    },
    allowedScenario: {
      classCode: normalClass.classCode,
      subjectCode: 'FXSE201A',
      allowed: allowedResult.allowed,
      currentOverloadCount: allowedResult.currentOverloadCount,
      projectedOverloadCount: allowedResult.projectedOverloadCount,
      message: allowedResult.message,
    },
  };
}

async function runCreditLimitTest(currentSemester, studentsByCode) {
  const targetClass = await findFixtureClass(currentSemester, 'FXSE401E');
  const result = await registrationService.checkCreditLimit(
    studentsByCode[OTHER_FIXTURE_CODES.credit]._id,
    currentSemester._id,
    4,
    20,
  );

  return {
    classCode: targetClass.classCode,
    allowed: result.allowed,
    currentCredits: result.currentCredits,
    projectedCredits: result.projectedCredits,
    maxCredits: result.maxCredits,
    message: result.message,
  };
}

async function runCohortTests(currentSemester, studentsByCode) {
  const access = await registrationPeriodService.validateCurrentPeriodCohort(
    studentsByCode[OTHER_FIXTURE_CODES.cohortBlocked].cohort,
  );
  const targetClass = await findFixtureClass(currentSemester, 'FXSE201A');
  const summary = await registrationService.getStudentEligibilitySummary(
    studentsByCode[OTHER_FIXTURE_CODES.cohortBlocked]._id,
    targetClass._id,
  );

  return {
    access,
    eligibilitySummary: {
      canRegister: summary.canRegister,
      cohortAllowed: summary.limits?.cohortAccess?.allowed,
      overloadAllowed: summary.limits?.overload?.allowed,
      creditAllowed: summary.limits?.credit?.allowed,
    },
  };
}

async function runTeachingScheduleTest() {
  const teacher = await Teacher.findOne({ teacherCode: 'FXT-L-001', isActive: true }).lean();
  if (!teacher) {
    throw new Error('Fixture lecturer FXT-L-001 not found');
  }

  const result = await teachingScheduleService.getTeachingSchedule(teacher.userId, {
    teacherId: teacher._id,
  });

  return {
    teacherCode: teacher.teacherCode,
    teacherName: teacher.fullName,
    classCount: (result.classes || []).length,
    classesWithSchedules: (result.classes || []).filter((item) => (item.schedules || []).length > 0).length,
    sampleClasses: (result.classes || []).slice(0, 5).map((item) => ({
      classCode: item.classCode,
      subjectCode: item.subject?.subjectCode || null,
      scheduleCount: (item.schedules || []).length,
      roomCode: item.room?.roomCode || null,
      timeslot: item.timeslot?.groupName || null,
    })),
  };
}

async function runCrossSemesterWaitlistIsolationTest(currentSemester, studentsByCode) {
  const student = studentsByCode[OTHER_FIXTURE_CODES.prereqPass];
  if (!student?.userId) {
    throw new Error('Fixture student for cross-semester waitlist isolation test is missing userId');
  }

  const targetClass = await findFixtureClass(currentSemester, 'FXSE201A');

  await ClassEnrollment.deleteMany({
    student: student._id,
    classSection: targetClass._id,
    status: 'enrolled',
  });

  await ClassSection.updateOne(
    { _id: targetClass._id },
    { $set: { currentEnrollment: await ClassEnrollment.countDocuments({ classSection: targetClass._id, status: 'enrolled' }) } },
  );

  const legacyWaitlist = await Waitlist.findOneAndUpdate(
    {
      student: student._id,
      subject: targetClass.subject,
      targetSemester: 1,
      targetAcademicYear: currentSemester.academicYear,
      status: 'WAITING',
    },
    {
      $setOnInsert: {
        student: student._id,
        subject: targetClass.subject,
        targetSemester: 1,
        targetAcademicYear: currentSemester.academicYear,
        status: 'WAITING',
      },
    },
    { new: true, upsert: true },
  );

  let enrollment = null;
  try {
    enrollment = await classSectionService.selfEnroll(student.userId, String(targetClass._id));

    return {
      studentCode: student.studentCode,
      classCode: targetClass.classCode,
      oldWaitlistSemester: legacyWaitlist.targetSemester,
      oldWaitlistAcademicYear: legacyWaitlist.targetAcademicYear,
      registrationSucceeded: true,
      enrollmentId: String(enrollment._id),
    };
  } finally {
    if (enrollment?._id) {
      await ClassEnrollment.deleteOne({ _id: enrollment._id });
    }
    await ClassSection.updateOne(
      { _id: targetClass._id },
      { $set: { currentEnrollment: await ClassEnrollment.countDocuments({ classSection: targetClass._id, status: 'enrolled' }) } },
    );
    await Waitlist.deleteOne({ _id: legacyWaitlist._id });
  }
}

async function runSemesterHookTest() {
  const originalFindById = semesterRepo.findById;
  const originalClearCurrentFlag = semesterRepo.clearCurrentFlag;
  const originalUpdateById = semesterRepo.updateById;
  const originalTriggerAutoEnrollment = autoEnrollmentService.triggerAutoEnrollment;

  const calls = {
    cleared: false,
    updated: false,
    autoEnrollmentTriggeredWith: null,
  };

  const fakeId = new mongoose.Types.ObjectId().toString();
  const now = new Date();

  semesterRepo.findById = async () => ({
    _id: fakeId,
    code: 'FXT-HOOK-BEFORE',
    name: 'Fixture Hook Before',
    semesterType: 'regular',
    semesterNum: 3,
    academicYear: '2099-2100',
    isCurrent: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  semesterRepo.clearCurrentFlag = async () => {
    calls.cleared = true;
  };

  semesterRepo.updateById = async (_id, update) => {
    calls.updated = true;
    return {
      _id,
      code: 'FXT-HOOK-AFTER',
      name: 'Fixture Hook After',
      semesterType: 'regular',
      semesterNum: 3,
      academicYear: '2099-2100',
      isCurrent: update.isCurrent === true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  };

  autoEnrollmentService.triggerAutoEnrollment = async (semesterId) => {
    calls.autoEnrollmentTriggeredWith = semesterId;
    return {
      success: true,
      source: 'semester-hook-test',
    };
  };

  try {
    const result = await semesterService.updateSemester(fakeId, { isCurrent: true });
    return {
      clearedPreviousCurrent: calls.cleared,
      updatedSemester: calls.updated,
      autoEnrollmentTriggeredWith: calls.autoEnrollmentTriggeredWith,
      returnedAutoEnrollment: result.autoEnrollment,
    };
  } finally {
    semesterRepo.findById = originalFindById;
    semesterRepo.clearCurrentFlag = originalClearCurrentFlag;
    semesterRepo.updateById = originalUpdateById;
    autoEnrollmentService.triggerAutoEnrollment = originalTriggerAutoEnrollment;
  }
}

async function runCurrentSemesterGuardTest() {
  const originalFindById = semesterRepo.findById;
  const originalUpdateById = semesterRepo.updateById;

  const fakeId = new mongoose.Types.ObjectId().toString();
  const now = new Date();

  semesterRepo.findById = async () => ({
    _id: fakeId,
    code: 'FXT-CURRENT-GUARD',
    name: 'Fixture Current Guard',
    semesterType: 'regular',
    semesterNum: 1,
    academicYear: '2099-2100',
    isCurrent: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  semesterRepo.updateById = async () => {
    throw new Error('updateById should not be called when current semester is inactive');
  };

  try {
    await semesterService.updateSemester(fakeId, { isCurrent: true, isActive: false });
    return {
      rejected: false,
      message: 'Expected updateSemester to reject inactive current semester',
    };
  } catch (error) {
    return {
      rejected: error.message === 'Current semester must remain active',
      message: error.message,
    };
  } finally {
    semesterRepo.findById = originalFindById;
    semesterRepo.updateById = originalUpdateById;
  }
}

async function main() {
  const connectionConfig = ensureConnectionUri();
  await mongoose.connect(connectionConfig.uri, {
    dbName: connectionConfig.dbName,
    appName: connectionConfig.appName,
  });

  try {
    const currentSemester = await getCurrentSemester();
    const fixtureStudents = await Student.find({
      studentCode: { $in: [...AUTO_FIXTURE_CODES, ...Object.values(OTHER_FIXTURE_CODES)] },
    })
      .select('_id studentCode cohort userId')
      .lean();

    const studentsByCode = fixtureStudents.reduce((acc, student) => {
      acc[student.studentCode] = student;
      return acc;
    }, {});

    const results = {
      currentSemester: {
        id: String(currentSemester._id),
        code: currentSemester.code,
        semesterNum: currentSemester.semesterNum,
        academicYear: currentSemester.academicYear,
      },
      autoEnrollment: await runAutoEnrollmentTest(currentSemester),
      prerequisites: await runPrerequisiteTests(currentSemester, studentsByCode),
      overload: await runOverloadTests(currentSemester, studentsByCode),
      creditLimit: await runCreditLimitTest(currentSemester, studentsByCode),
      cohort: await runCohortTests(currentSemester, studentsByCode),
      teachingSchedule: await runTeachingScheduleTest(),
      crossSemesterWaitlistIsolation: await runCrossSemesterWaitlistIsolationTest(
        currentSemester,
        studentsByCode,
      ),
      semesterHook: await runSemesterHookTest(),
      currentSemesterGuard: await runCurrentSemesterGuardTest(),
    };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[verify-feature-flows] Failed:', error);
  process.exitCode = 1;
});
