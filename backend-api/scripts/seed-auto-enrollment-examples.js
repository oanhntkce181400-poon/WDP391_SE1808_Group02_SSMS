const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const User = require('../src/models/user.model');
const Teacher = require('../src/models/teacher.model');
const Student = require('../src/models/student.model');
const Subject = require('../src/models/subject.model');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');
const CurriculumCourse = require('../src/models/curriculumCourse.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const Waitlist = require('../src/models/waitlist.model');
const Room = require('../src/models/room.model');
const Timeslot = require('../src/models/timeslot.model');
const Semester = require('../src/models/semester.model');

const PASSWORD = '123456';
const PREFIX = 'AEX';
const MAJOR_CODE = 'AEX';
const LECTURER = {
  email: 'auto.enrollment.fixture.lecturer@fpt.edu.vn',
  fullName: 'Auto Enrollment Fixture Lecturer',
  teacherCode: 'AEX-L-001',
};

const CASE_DEFINITIONS = [
  { index: 1, key: 'happy_path_one', label: 'Happy Path 1' },
  { index: 2, key: 'happy_path_two', label: 'Happy Path 2' },
  { index: 3, key: 'duplicate_a_then_b', label: 'Preset A Duplicate, B Available' },
  { index: 4, key: 'full_b_waitlist_one', label: 'B Full -> Waitlist 1' },
  { index: 5, key: 'full_b_waitlist_two', label: 'B Full -> Waitlist 2' },
  { index: 6, key: 'already_waiting_b', label: 'Already Waiting For B' },
  { index: 7, key: 'duplicate_a_and_waiting_b', label: 'Preset A Duplicate + Waiting B' },
  { index: 8, key: 'preset_b_only', label: 'Preset B Duplicate Only' },
  { index: 9, key: 'preset_both_subjects', label: 'Preset A+B Duplicate' },
  { index: 10, key: 'late_waitlist_candidate', label: 'Late Candidate -> Waitlist' },
];

function ensureConnectionConfig() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in backend-api/.env');
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'seed-auto-enrollment-examples',
  };
}

function parseAcademicYearStart(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const [startYearRaw] = academicYear.split(/[-/]/);
  const startYear = Number.parseInt(startYearRaw, 10);
  return Number.isNaN(startYear) ? null : startYear;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildSubjectCode(semesterOrder, suffix) {
  return `${PREFIX}S${pad(semesterOrder)}${suffix}`;
}

function buildSubjectName(semesterOrder, suffix) {
  return `Auto Enrollment Example Semester ${semesterOrder} Subject ${suffix}`;
}

function buildStudentCode(semesterOrder, caseIndex) {
  return `${PREFIX}K${pad(semesterOrder)}C${pad(caseIndex)}`;
}

function buildStudentEmail(semesterOrder, caseIndex) {
  return `aex.k${pad(semesterOrder)}.c${pad(caseIndex)}@fpt.edu.vn`;
}

function buildStudentName(semesterOrder, caseDefinition) {
  return `AEX Semester ${semesterOrder} Case ${pad(caseDefinition.index)} ${caseDefinition.label}`;
}

function buildSemesterName(semesterOrder) {
  return `Auto Enrollment Semester ${semesterOrder}`;
}

function buildClassCode(semesterOrder, suffix, group) {
  return `${PREFIX}-K${pad(semesterOrder)}-${suffix}-${group}`;
}

function buildClassName(semesterOrder, suffix, group) {
  return `AEX Semester ${semesterOrder} Subject ${suffix} Group ${group}`;
}

async function upsertUser(payload, passwordHash) {
  return User.findOneAndUpdate(
    { email: payload.email },
    {
      $set: {
        email: payload.email,
        fullName: payload.fullName,
        authProvider: 'local',
        role: payload.role,
        status: 'active',
        isActive: true,
        mustChangePassword: false,
        password: passwordHash,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertTeacher(userDoc) {
  return Teacher.findOneAndUpdate(
    { teacherCode: LECTURER.teacherCode },
    {
      $set: {
        fullName: LECTURER.fullName,
        email: LECTURER.email,
        department: 'Academic Operations',
        specialization: 'Auto Enrollment Test Data',
        degree: 'masters',
        gender: 'other',
        isActive: true,
        userId: userDoc._id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertSubject(subjectPayload, teacherId) {
  return Subject.findOneAndUpdate(
    { subjectCode: subjectPayload.subjectCode },
    {
      $set: {
        subjectName: subjectPayload.subjectName,
        credits: subjectPayload.credits,
        tuitionFee: subjectPayload.tuitionFee || 100,
        majorCode: subjectPayload.majorCode,
        majorCodes: [subjectPayload.majorCode],
        isCommon: false,
        prerequisites: [],
        suggestedSemester: subjectPayload.suggestedSemester,
        teachers: teacherId ? [teacherId] : [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculum(curriculumCode, academicYear) {
  return Curriculum.findOneAndUpdate(
    { code: curriculumCode },
    {
      $set: {
        name: `Auto Enrollment Example Curriculum ${academicYear}`,
        major: MAJOR_CODE,
        academicYear,
        description: 'Dedicated curriculum for auto-enrollment test examples.',
        status: 'active',
        useRelationalStructure: true,
        semesters: [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumSemester(curriculumId, semesterOrder) {
  return CurriculumSemester.findOneAndUpdate(
    { curriculum: curriculumId, semesterOrder },
    {
      $set: {
        name: buildSemesterName(semesterOrder),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumCourse(curriculumSemesterId, subjectDoc) {
  return CurriculumCourse.findOneAndUpdate(
    { semester: curriculumSemesterId, subjectCode: subjectDoc.subjectCode },
    {
      $set: {
        subject: subjectDoc._id,
        subjectCode: subjectDoc.subjectCode,
        subjectName: subjectDoc.subjectName,
        credits: subjectDoc.credits,
        hasPrerequisite: false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertClassSection(payload) {
  return ClassSection.findOneAndUpdate(
    { classCode: payload.classCode },
    {
      $set: {
        className: payload.className,
        subject: payload.subjectId,
        teacher: payload.teacherId,
        room: payload.roomId,
        timeslot: payload.timeslotId,
        semester: payload.semesterNum,
        academicYear: payload.academicYear,
        startDate: payload.startDate,
        endDate: payload.endDate,
        dayOfWeek: payload.dayOfWeek,
        maxCapacity: payload.maxCapacity,
        status: payload.status,
      },
      $setOnInsert: {
        currentEnrollment: 0,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertStudent(userDoc, curriculumDoc, academicYearStart, semesterOrder, caseDefinition) {
  const studentCode = buildStudentCode(semesterOrder, caseDefinition.index);
  const email = buildStudentEmail(semesterOrder, caseDefinition.index);

  return Student.findOneAndUpdate(
    { studentCode },
    {
      $set: {
        fullName: buildStudentName(semesterOrder, caseDefinition),
        email,
        majorCode: MAJOR_CODE,
        cohort: academicYearStart % 100,
        enrollmentYear: academicYearStart,
        classSection: `${PREFIX}-TEST-${academicYearStart}`,
        academicStatus: 'enrolled',
        isActive: true,
        userId: userDoc._id,
        curriculumId: curriculumDoc._id,
        currentCurriculumSemester: semesterOrder,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertClassEnrollment(payload) {
  return ClassEnrollment.findOneAndUpdate(
    { student: payload.studentId, classSection: payload.classSectionId },
    {
      $set: {
        status: payload.status || 'enrolled',
        isOverload: false,
        note: payload.note || '',
        enrollmentDate: payload.enrollmentDate || new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertWaitlist(payload) {
  return Waitlist.findOneAndUpdate(
    {
      student: payload.studentId,
      subject: payload.subjectId,
      targetSemester: payload.targetSemester,
      targetAcademicYear: payload.targetAcademicYear,
      status: 'WAITING',
    },
    {
      $set: {
        cancelReason: payload.cancelReason || null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureCurrentSemester() {
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    throw new Error('Current semester is required before seeding auto-enrollment examples.');
  }
  return currentSemester;
}

async function ensureLecturerAndResources(passwordHash) {
  const lecturerUser = await upsertUser(
    {
      email: LECTURER.email,
      fullName: LECTURER.fullName,
      role: 'lecturer',
    },
    passwordHash,
  );
  const lecturerDoc = await upsertTeacher(lecturerUser);

  const rooms = await Room.find({ status: { $ne: 'maintenance' } })
    .sort({ roomCode: 1 })
    .limit(30)
    .lean();
  const timeslots = await Timeslot.find({ status: 'active' })
    .sort({ startTime: 1 })
    .limit(10)
    .lean();

  if (!rooms.length || !timeslots.length) {
    throw new Error('Rooms and timeslots must exist before seeding auto-enrollment examples.');
  }

  return { lecturerUser, lecturerDoc, rooms, timeslots };
}

async function ensureCurriculumAndSubjects(currentSemester, lecturerDoc) {
  const academicYearStart = parseAcademicYearStart(currentSemester.academicYear);
  if (!academicYearStart) {
    throw new Error(`Cannot parse academicYear start from ${currentSemester.academicYear}`);
  }

  const curriculumCode = `${PREFIX}-CURR-${academicYearStart}`;
  const curriculumAcademicYear = `${academicYearStart}-${academicYearStart + 10}`;
  const curriculumDoc = await upsertCurriculum(curriculumCode, curriculumAcademicYear);
  const subjectDocsBySemester = new Map();

  for (let semesterOrder = 1; semesterOrder <= 9; semesterOrder += 1) {
    const curriculumSemesterDoc = await upsertCurriculumSemester(curriculumDoc._id, semesterOrder);
    const subjectA = await upsertSubject(
      {
        subjectCode: buildSubjectCode(semesterOrder, 'A'),
        subjectName: buildSubjectName(semesterOrder, 'A'),
        credits: 3,
        majorCode: MAJOR_CODE,
        suggestedSemester: semesterOrder,
      },
      lecturerDoc._id,
    );
    const subjectB = await upsertSubject(
      {
        subjectCode: buildSubjectCode(semesterOrder, 'B'),
        subjectName: buildSubjectName(semesterOrder, 'B'),
        credits: 3,
        majorCode: MAJOR_CODE,
        suggestedSemester: semesterOrder,
      },
      lecturerDoc._id,
    );

    await upsertCurriculumCourse(curriculumSemesterDoc._id, subjectA);
    await upsertCurriculumCourse(curriculumSemesterDoc._id, subjectB);

    subjectDocsBySemester.set(semesterOrder, {
      A: subjectA,
      B: subjectB,
    });
  }

  return {
    academicYearStart,
    curriculumDoc,
    curriculumCode,
    subjectDocsBySemester,
  };
}

async function ensureClassSections({
  currentSemester,
  lecturerDoc,
  rooms,
  timeslots,
  subjectDocsBySemester,
}) {
  const classesBySemester = new Map();
  let classIndex = 0;

  for (let semesterOrder = 1; semesterOrder <= 9; semesterOrder += 1) {
    const subjects = subjectDocsBySemester.get(semesterOrder);
    const roomOne = rooms[classIndex % rooms.length];
    const roomTwo = rooms[(classIndex + 1) % rooms.length];
    const roomThree = rooms[(classIndex + 2) % rooms.length];
    const timeslotOne = timeslots[classIndex % timeslots.length];
    const timeslotTwo = timeslots[(classIndex + 1) % timeslots.length];
    const timeslotThree = timeslots[(classIndex + 2) % timeslots.length];

    const classA1 = await upsertClassSection({
      classCode: buildClassCode(semesterOrder, 'A', '01'),
      className: buildClassName(semesterOrder, 'A', '01'),
      subjectId: subjects.A._id,
      teacherId: lecturerDoc._id,
      roomId: roomOne._id,
      timeslotId: timeslotOne._id,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate: currentSemester.startDate,
      endDate: currentSemester.endDate,
      dayOfWeek: (classIndex % 6) + 1,
      maxCapacity: 20,
      status: 'published',
    });

    const classA2 = await upsertClassSection({
      classCode: buildClassCode(semesterOrder, 'A', '02'),
      className: buildClassName(semesterOrder, 'A', '02'),
      subjectId: subjects.A._id,
      teacherId: lecturerDoc._id,
      roomId: roomTwo._id,
      timeslotId: timeslotTwo._id,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate: currentSemester.startDate,
      endDate: currentSemester.endDate,
      dayOfWeek: ((classIndex + 1) % 6) + 1,
      maxCapacity: 20,
      status: 'published',
    });

    const classB1 = await upsertClassSection({
      classCode: buildClassCode(semesterOrder, 'B', '01'),
      className: buildClassName(semesterOrder, 'B', '01'),
      subjectId: subjects.B._id,
      teacherId: lecturerDoc._id,
      roomId: roomThree._id,
      timeslotId: timeslotThree._id,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate: currentSemester.startDate,
      endDate: currentSemester.endDate,
      dayOfWeek: ((classIndex + 2) % 6) + 1,
      maxCapacity: 5,
      status: 'published',
    });

    classesBySemester.set(semesterOrder, {
      A1: classA1,
      A2: classA2,
      B1: classB1,
      subjects,
    });

    classIndex += 3;
  }

  return classesBySemester;
}

async function ensureStudents(passwordHash, curriculumDoc, academicYearStart) {
  const studentsBySemester = new Map();
  const allStudents = [];

  for (let semesterOrder = 1; semesterOrder <= 9; semesterOrder += 1) {
    const semesterStudents = [];

    for (const caseDefinition of CASE_DEFINITIONS) {
      const userDoc = await upsertUser(
        {
          email: buildStudentEmail(semesterOrder, caseDefinition.index),
          fullName: buildStudentName(semesterOrder, caseDefinition),
          role: 'student',
        },
        passwordHash,
      );

      const studentDoc = await upsertStudent(
        userDoc,
        curriculumDoc,
        academicYearStart,
        semesterOrder,
        caseDefinition,
      );

      semesterStudents.push({
        caseDefinition,
        userDoc,
        studentDoc,
      });
      allStudents.push(studentDoc);
    }

    studentsBySemester.set(semesterOrder, semesterStudents);
  }

  return { studentsBySemester, allStudents };
}

async function cleanupScenarioState(currentSemester, studentsBySemester, classesBySemester) {
  const allStudentIds = [];
  const allClassIds = [];
  const allSubjectIds = [];

  for (const semesterStudents of studentsBySemester.values()) {
    semesterStudents.forEach(({ studentDoc }) => {
      allStudentIds.push(studentDoc._id);
    });
  }

  for (const semesterClasses of classesBySemester.values()) {
    allClassIds.push(semesterClasses.A1._id, semesterClasses.A2._id, semesterClasses.B1._id);
    allSubjectIds.push(semesterClasses.subjects.A._id, semesterClasses.subjects.B._id);
  }

  await ClassEnrollment.deleteMany({
    student: { $in: allStudentIds },
    classSection: { $in: allClassIds },
  });

  await Waitlist.deleteMany({
    student: { $in: allStudentIds },
    subject: { $in: allSubjectIds },
    targetSemester: currentSemester.semesterNum,
    targetAcademicYear: currentSemester.academicYear,
  });

  await ClassSection.updateMany(
    { _id: { $in: allClassIds } },
    { $set: { currentEnrollment: 0 } },
  );
}

async function applyPresetScenarioState(currentSemester, studentsBySemester, classesBySemester) {
  for (let semesterOrder = 1; semesterOrder <= 9; semesterOrder += 1) {
    const semesterStudents = studentsBySemester.get(semesterOrder);
    const semesterClasses = classesBySemester.get(semesterOrder);
    const studentByCase = new Map(
      semesterStudents.map((entry) => [entry.caseDefinition.index, entry.studentDoc]),
    );

    await upsertClassEnrollment({
      studentId: studentByCase.get(3)._id,
      classSectionId: semesterClasses.A1._id,
      note: 'AEX preset duplicate for subject A',
    });

    await upsertClassEnrollment({
      studentId: studentByCase.get(7)._id,
      classSectionId: semesterClasses.A2._id,
      note: 'AEX preset duplicate for subject A',
    });

    await upsertClassEnrollment({
      studentId: studentByCase.get(8)._id,
      classSectionId: semesterClasses.B1._id,
      note: 'AEX preset duplicate for subject B',
    });

    await upsertClassEnrollment({
      studentId: studentByCase.get(9)._id,
      classSectionId: semesterClasses.A1._id,
      note: 'AEX preset duplicate for subject A',
    });

    await upsertClassEnrollment({
      studentId: studentByCase.get(9)._id,
      classSectionId: semesterClasses.B1._id,
      note: 'AEX preset duplicate for subject B',
    });

    await upsertWaitlist({
      studentId: studentByCase.get(6)._id,
      subjectId: semesterClasses.subjects.B._id,
      targetSemester: currentSemester.semesterNum,
      targetAcademicYear: currentSemester.academicYear,
      cancelReason: 'AEX preset existing waitlist',
    });

    await upsertWaitlist({
      studentId: studentByCase.get(7)._id,
      subjectId: semesterClasses.subjects.B._id,
      targetSemester: currentSemester.semesterNum,
      targetAcademicYear: currentSemester.academicYear,
      cancelReason: 'AEX preset existing waitlist',
    });
  }
}

async function syncClassEnrollmentCounts(classesBySemester) {
  const allClassIds = [];
  for (const semesterClasses of classesBySemester.values()) {
    allClassIds.push(semesterClasses.A1._id, semesterClasses.A2._id, semesterClasses.B1._id);
  }

  for (const classSectionId of allClassIds) {
    const enrolledCount = await ClassEnrollment.countDocuments({
      classSection: classSectionId,
      status: { $in: ['enrolled', 'completed'] },
    });

    await ClassSection.updateOne(
      { _id: classSectionId },
      { $set: { currentEnrollment: enrolledCount } },
    );
  }
}

function buildSemesterSummary(currentSemester, studentsBySemester, classesBySemester) {
  const semesters = [];

  for (let semesterOrder = 1; semesterOrder <= 9; semesterOrder += 1) {
    const semesterStudents = studentsBySemester.get(semesterOrder);
    const semesterClasses = classesBySemester.get(semesterOrder);

    semesters.push({
      semesterOrder,
      studentCodes: semesterStudents.map(({ studentDoc }) => studentDoc.studentCode),
      scenarios: semesterStudents.map(({ caseDefinition, studentDoc, userDoc }) => ({
        case: pad(caseDefinition.index),
        scenario: caseDefinition.label,
        studentCode: studentDoc.studentCode,
        email: userDoc.email,
        password: PASSWORD,
      })),
      subjects: {
        A: semesterClasses.subjects.A.subjectCode,
        B: semesterClasses.subjects.B.subjectCode,
      },
      classes: {
        A: [semesterClasses.A1.classCode, semesterClasses.A2.classCode],
        B: [semesterClasses.B1.classCode],
      },
      expectedPatterns: [
        'Case 01-02: happy path, enroll A and B',
        'Case 03: A duplicate, still enroll B',
        'Case 04-05: enroll A, waitlist B because B is full',
        'Case 06: enroll A, keep existing waitlist B',
        'Case 07: duplicate A, keep existing waitlist B',
        'Case 08: enroll A, skip duplicate B',
        'Case 09: duplicate both A and B',
        'Case 10: enroll A, waitlist B',
      ],
    });
  }

  return {
    currentSemester: {
      id: String(currentSemester._id),
      code: currentSemester.code,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
    },
    testDataPrefix: PREFIX,
    lecturer: {
      email: LECTURER.email,
      password: PASSWORD,
      teacherCode: LECTURER.teacherCode,
    },
    howToTest: {
      endpoint: 'POST /api/auto-enrollment/trigger',
      note:
        'Use majorCodes=AEX in Admin UI for isolated testing, or use studentCodes from one semester group for deterministic per-semester checks.',
      sampleRequest: {
        semesterId: String(currentSemester._id),
        dryRun: false,
        studentCodes: studentsBySemester.get(1).map(({ studentDoc }) => studentDoc.studentCode),
      },
      adminUiFilter: {
        majorCodes: ['AEX'],
      },
      resetHint: 'Re-run this script before each demo if you want the preset duplicate/waitlist state back.',
    },
    semesters,
  };
}

async function run() {
  const { uri, dbName, appName } = ensureConnectionConfig();
  await mongoose.connect(uri, {
    dbName,
    appName,
  });

  try {
    const currentSemester = await ensureCurrentSemester();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const { lecturerUser, lecturerDoc, rooms, timeslots } = await ensureLecturerAndResources(
      passwordHash,
    );
    const { academicYearStart, curriculumDoc, subjectDocsBySemester } = await ensureCurriculumAndSubjects(
      currentSemester,
      lecturerDoc,
    );
    const classesBySemester = await ensureClassSections({
      currentSemester,
      lecturerDoc,
      rooms,
      timeslots,
      subjectDocsBySemester,
    });
    const { studentsBySemester } = await ensureStudents(
      passwordHash,
      curriculumDoc,
      academicYearStart,
    );

    await cleanupScenarioState(currentSemester, studentsBySemester, classesBySemester);
    await applyPresetScenarioState(currentSemester, studentsBySemester, classesBySemester);
    await syncClassEnrollmentCounts(classesBySemester);

    console.log(
      JSON.stringify(
        {
          success: true,
          curriculum: {
            code: curriculumDoc.code,
            name: curriculumDoc.name,
            academicYear: curriculumDoc.academicYear,
          },
          lecturer: {
            email: lecturerUser.email,
            password: PASSWORD,
            teacherCode: lecturerDoc.teacherCode,
          },
          ...buildSemesterSummary(currentSemester, studentsBySemester, classesBySemester),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('[seed-auto-enrollment-examples] Failed:', error.message);
  process.exit(1);
});
