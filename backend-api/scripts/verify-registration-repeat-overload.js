const assert = require('assert');

const registrationService = require('../src/services/registration.service');
const classSectionService = require('../src/modules/classSection/classSection.service');

const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Semester = require('../src/models/semester.model');
const Student = require('../src/models/student.model');
const User = require('../src/models/user.model');

const curriculumService = require('../src/services/curriculum.service');
const paymentValidationService = require('../src/services/paymentValidation.service');
const registrationPeriodService = require('../src/services/registrationPeriod.service');
function createChain(result) {
  return {
    populate() {
      return this;
    },
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean: async () => result,
    exec: async () => result,
  };
}

function withPatched(object, methodName, implementation, restoreStack) {
  const original = object[methodName];
  object[methodName] = implementation;
  restoreStack.push(() => {
    object[methodName] = original;
  });
}

async function testNormalSubjectGoesToAutoEnrollment() {
  const restore = [];

  try {
    const student = {
      _id: 'student-normal',
      studentCode: 'SV001',
      cohort: 18,
      majorCode: 'SE',
      enrollmentYear: 2025,
    };
    const classSection = {
      _id: 'class-normal',
      classCode: 'CLS-NORMAL',
      subject: { _id: 'subject-normal', credits: 3 },
      semester: 1,
      academicYear: '2025-2026',
    };
    const semester = {
      _id: 'semester-1',
      semesterNum: 1,
      academicYear: '2025-2026',
      code: 'SP25',
      name: 'Semester 1',
    };

    withPatched(Student, 'findById', () => createChain(student), restore);
    withPatched(ClassSection, 'findById', () => createChain(classSection), restore);
    withPatched(ClassSection, 'find', (query) => {
      if (query?.subject && query?.semester && query?.academicYear) {
        return createChain([{ _id: classSection._id }]);
      }
      if (query?.subject === classSection.subject._id) {
        return createChain([{ _id: classSection._id }]);
      }
      return createChain([]);
    }, restore);
    withPatched(ClassEnrollment, 'find', () => createChain([]), restore);
    withPatched(ClassEnrollment, 'findOne', () => createChain(null), restore);
    withPatched(Semester, 'findById', () => createChain(semester), restore);
    withPatched(Semester, 'findOne', () => createChain(semester), restore);
    withPatched(curriculumService, 'getCurriculumForStudent', async () => ({ _id: 'curr-1' }), restore);
    withPatched(curriculumService, 'getSubjectsBySemester', async () => [
      { subject: { _id: 'subject-normal', subjectCode: 'SUB101' } },
    ], restore);
    withPatched(paymentValidationService, 'resolveDisplayedCurriculumSemester', async () => 1, restore);
    withPatched(registrationPeriodService, 'validateCurrentPeriodCohort', async () => ({
      hasActivePeriod: true,
      allowed: true,
      message: 'Allowed',
      period: null,
    }), restore);
    withPatched(registrationPeriodService, 'isRegistrationOpen', async () => ({
      isOpen: false,
      reason: 'NO_ACTIVE_PERIOD',
      message: 'No active period',
      period: null,
    }), restore);

    const result = await registrationService.getStudentEligibilitySummary(student._id, classSection._id, semester._id);

    assert.strictEqual(result.canRegister, false);
    assert.strictEqual(result.limits.registrationWindow.allowed, false);
    assert.strictEqual(result.limits.registrationWindow.reason, 'AUTO_ENROLLMENT_MANAGED');
    assert.strictEqual(result.limits.duplicateSubject.allowed, true);
  } finally {
    while (restore.length) {
      restore.pop()();
    }
  }
}

async function testDuplicateSubjectBlocksRepeatRegistration() {
  const restore = [];

  try {
    const student = {
      _id: 'student-repeat',
      studentCode: 'SV002',
      cohort: 18,
      majorCode: 'SE',
      enrollmentYear: 2024,
    };
    const classSection = {
      _id: 'class-repeat',
      classCode: 'CLS-REPEAT',
      subject: { _id: 'subject-repeat', credits: 3 },
      semester: 1,
      academicYear: '2025-2026',
    };
    const semester = {
      _id: 'semester-1',
      semesterNum: 1,
      academicYear: '2025-2026',
      code: 'SP25',
      name: 'Semester 1',
    };
    const duplicateEnrollment = {
      _id: 'enroll-dup',
      classSection: {
        _id: 'class-repeat-old',
        classCode: 'CLS-REPEAT-OLD',
        subject: {
          subjectCode: 'SUB201',
          subjectName: 'Software Testing',
        },
      },
    };

    withPatched(Student, 'findById', () => createChain(student), restore);
    withPatched(ClassSection, 'findById', () => createChain(classSection), restore);
    withPatched(ClassSection, 'find', (query) => {
      if (query?.subject && query?.semester && query?.academicYear) {
        return createChain([{ _id: classSection._id }, { _id: 'class-repeat-old' }]);
      }
      if (query?.subject === classSection.subject._id) {
        return createChain([{ _id: 'class-repeat-old' }]);
      }
      return createChain([]);
    }, restore);
    withPatched(ClassEnrollment, 'find', (query) => {
      if (query?.status?.$in?.includes('completed') || query?.status?.$in?.includes('dropped')) {
        return createChain([
          {
            classSection: {
              subject: { _id: classSection.subject._id },
            },
          },
        ]);
      }
      return createChain([]);
    }, restore);
    withPatched(ClassEnrollment, 'findOne', (query) => {
      if (query?.classSection?.$in?.includes('class-repeat-old') && query?.status?.$in?.includes('enrolled')) {
        return createChain(duplicateEnrollment);
      }
      if (query?.classSection?.$in?.includes('class-repeat-old') && query?.status?.$in?.includes('dropped')) {
        return createChain({ _id: 'historic-enrollment' });
      }
      return createChain(null);
    }, restore);
    withPatched(Semester, 'findById', () => createChain(semester), restore);
    withPatched(Semester, 'findOne', () => createChain(semester), restore);
    withPatched(curriculumService, 'getCurriculumForStudent', async () => ({ _id: 'curr-1' }), restore);
    withPatched(curriculumService, 'getSubjectsBySemester', async () => [
      { subject: { _id: 'different-subject', subjectCode: 'SUB101' } },
    ], restore);
    withPatched(paymentValidationService, 'resolveDisplayedCurriculumSemester', async () => 1, restore);
    withPatched(registrationPeriodService, 'validateCurrentPeriodCohort', async () => ({
      hasActivePeriod: true,
      allowed: true,
      message: 'Allowed',
      period: null,
    }), restore);
    withPatched(registrationPeriodService, 'isRegistrationOpen', async (requestType) => ({
      isOpen: requestType === 'repeat',
      reason: requestType === 'repeat' ? 'OPEN' : 'NO_ACTIVE_PERIOD',
      message: requestType === 'repeat' ? 'Repeat window open' : 'No active period',
      period: requestType === 'repeat' ? { requestType: 'repeat' } : null,
    }), restore);

    const result = await registrationService.getStudentEligibilitySummary(student._id, classSection._id, semester._id);

    assert.strictEqual(result.limits.overload.enrollingCourseIsOverload, false);
    assert.strictEqual(result.limits.registrationWindow.allowed, true);
    assert.strictEqual(result.limits.registrationWindow.requestType, 'repeat');
    assert.strictEqual(result.limits.duplicateSubject.allowed, false);
    assert.strictEqual(result.limits.duplicateSubject.existingEnrollment.classCode, 'CLS-REPEAT-OLD');
    assert.strictEqual(result.canRegister, false);
  } finally {
    while (restore.length) {
      restore.pop()();
    }
  }
}

async function testSelfEnrollHonorsRegistrationWindowAndDuplicateSubject() {
  const restore = [];

  try {
    const user = { _id: 'user-1', email: 'student@example.com' };
    const student = { _id: 'student-1', userId: user._id, email: user.email };

    withPatched(User, 'findById', () => createChain(user), restore);
    withPatched(Student, 'findOne', () => createChain(student), restore);
    withPatched(registrationService, 'validatePrerequisites', async () => ({
      eligible: true,
      message: 'OK',
    }), restore);
    withPatched(registrationService, 'validateClassCapacity', async () => ({
      isFull: false,
      message: 'OK',
    }), restore);
    withPatched(registrationService, 'validateWallet', async () => ({
      isSufficient: true,
      message: 'OK',
    }), restore);
    withPatched(registrationService, 'checkScheduleConflict', async () => ({
      hasConflict: false,
      message: 'OK',
    }), restore);
    withPatched(registrationService, 'getStudentEligibilitySummary', async () => ({
      limits: {
        overload: { allowed: true, message: 'OK', enrollingCourseIsOverload: false },
        credit: { allowed: true, message: 'OK' },
        registrationWindow: { allowed: false, message: 'Repeat window closed' },
        duplicateSubject: { allowed: false, message: 'Bạn đã có lớp khác của cùng môn' },
      },
    }), restore);

    await assert.rejects(
      () => classSectionService.selfEnroll(user._id, 'class-1'),
      (error) =>
        error.message.includes('Repeat window closed') &&
        error.message.includes('Bạn đã có lớp khác của cùng môn'),
    );
  } finally {
    while (restore.length) {
      restore.pop()();
    }
  }
}

async function testRegistrationWindowHonorsSemester() {
  const restore = [];

  try {
    withPatched(RegistrationPeriod, 'find', () =>
      createChain([
        {
          _id: 'period-repeat-other-semester',
          requestType: 'repeat',
          allowedCohorts: [18],
          semester: {
            _id: 'semester-other',
            semesterNum: 2,
            academicYear: '2026-2027',
          },
        },
      ]), restore);

    const result = await registrationPeriodService.isRegistrationOpen('repeat', 18, {
      semesterId: 'semester-target',
      semesterNum: 1,
      academicYear: '2025-2026',
    });

    assert.strictEqual(result.isOpen, false);
    assert.strictEqual(result.reason, 'NO_ACTIVE_PERIOD_FOR_SEMESTER');
  } finally {
    while (restore.length) {
      restore.pop()();
    }
  }
}

async function main() {
  await testNormalSubjectGoesToAutoEnrollment();
  await testDuplicateSubjectBlocksRepeatRegistration();
  await testSelfEnrollHonorsRegistrationWindowAndDuplicateSubject();
  await testRegistrationWindowHonorsSemester();
  console.log(
    JSON.stringify(
      {
        ok: true,
        tests: [
          'normal-subject-goes-to-auto-enrollment',
          'duplicate-subject-blocks-repeat-registration',
          'self-enroll-honors-registration-window-and-duplicate-subject',
          'registration-window-honors-semester',
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[verify-registration-repeat-overload] Failed:', error);
  process.exitCode = 1;
});
