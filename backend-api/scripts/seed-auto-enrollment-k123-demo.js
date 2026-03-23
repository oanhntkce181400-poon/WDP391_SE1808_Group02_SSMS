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
const DEMO_GROUPS = [
  { semesterNum: 1, majorCode: 'AEK1', label: 'Kỳ 1' },
  { semesterNum: 2, majorCode: 'AEK2', label: 'Kỳ 2' },
  { semesterNum: 3, majorCode: 'AEK3', label: 'Kỳ 3' },
];
const STUDENTS_PER_GROUP = 10;
const LECTURER = {
  email: 'auto.enrollment.k123.lecturer@fpt.edu.vn',
  fullName: 'Auto Enrollment K123 Demo Lecturer',
  teacherCode: 'AEK-L-001',
};

function ensureConnectionConfig() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in backend-api/.env');
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'seed-auto-enrollment-k123-demo',
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseAcademicYearStart(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const [startYearRaw] = academicYear.split(/[-/]/);
  const startYear = Number.parseInt(startYearRaw, 10);
  return Number.isNaN(startYear) ? null : startYear;
}

function buildCurriculumCode(group, academicYearStart) {
  return `${group.majorCode}-CURR-${academicYearStart}`;
}

function buildCurriculumName(group, academicYear) {
  return `Auto Enrollment Demo ${group.label} - ${academicYear}`;
}

function buildCurriculumSemesterName(group) {
  return `Auto Enrollment Demo ${group.label}`;
}

function buildSubjectCode(group, suffix) {
  return `${group.majorCode}SUB${suffix}`;
}

function buildSubjectName(group, suffix) {
  return `Auto Enrollment Demo ${group.label} Môn ${suffix}`;
}

function buildClassCode(group, suffix) {
  return `${group.majorCode}-HK${group.semesterNum}-${suffix}-01`;
}

function buildClassName(group, suffix) {
  return `Auto Enrollment Demo ${group.label} Lớp ${suffix}`;
}

function buildStudentCode(group, index) {
  return `${group.majorCode}S${pad(index)}`;
}

function buildStudentEmail(group, index) {
  return `${group.majorCode.toLowerCase()}.s${pad(index)}@fpt.edu.vn`;
}

function buildStudentName(group, index) {
  return `Sinh viên test Auto Enrollment ${group.label} ${pad(index)}`;
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
        teacherCode: LECTURER.teacherCode,
        fullName: LECTURER.fullName,
        email: LECTURER.email,
        department: 'Academic Operations',
        specialization: 'Auto Enrollment Demo Data',
        degree: 'masters',
        gender: 'other',
        isActive: true,
        userId: userDoc._id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureSemester(baseSemester, semesterNum) {
  const code = `${baseSemester.academicYear}_${semesterNum}`;
  return Semester.findOneAndUpdate(
    { code },
    {
      $setOnInsert: {
        code,
        name: `Kỳ ${semesterNum} - ${baseSemester.academicYear}`,
        semesterType: 'regular',
        semesterNum,
        academicYear: baseSemester.academicYear,
        startDate: baseSemester.startDate,
        endDate: baseSemester.endDate,
        description: `Auto-created semester ${semesterNum} for auto-enrollment demo data.`,
        isCurrent: semesterNum === baseSemester.semesterNum ? baseSemester.isCurrent === true : false,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculum(group, academicYearStart) {
  const code = buildCurriculumCode(group, academicYearStart);
  return Curriculum.findOneAndUpdate(
    { code },
    {
      $set: {
        code,
        name: buildCurriculumName(group, `${academicYearStart}-${academicYearStart + 8}`),
        major: group.majorCode,
        academicYear: `${academicYearStart}-${academicYearStart + 8}`,
        description: `Curriculum demo cho Auto Enrollment ${group.label}.`,
        status: 'active',
        useRelationalStructure: true,
        semesters: [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumSemester(curriculumId, group) {
  return CurriculumSemester.findOneAndUpdate(
    { curriculum: curriculumId, semesterOrder: group.semesterNum },
    {
      $set: {
        name: buildCurriculumSemesterName(group),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertSubject(group, suffix, teacherId) {
  const subjectCode = buildSubjectCode(group, suffix);
  return Subject.findOneAndUpdate(
    { subjectCode },
    {
      $set: {
        subjectCode,
        subjectName: buildSubjectName(group, suffix),
        credits: 3,
        tuitionFee: 100,
        majorCode: group.majorCode,
        majorCodes: [group.majorCode],
        isCommon: false,
        prerequisites: [],
        suggestedSemester: group.semesterNum,
        teachers: teacherId ? [teacherId] : [],
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

async function upsertStudent(userDoc, group, curriculumDoc, academicYearStart, index) {
  const studentCode = buildStudentCode(group, index);
  const email = buildStudentEmail(group, index);

  return Student.findOneAndUpdate(
    { studentCode },
    {
      $set: {
        studentCode,
        fullName: buildStudentName(group, index),
        email,
        majorCode: group.majorCode,
        cohort: academicYearStart % 100,
        enrollmentYear: academicYearStart,
        classSection: `${group.majorCode}-DEMO-${academicYearStart}`,
        academicStatus: 'enrolled',
        isActive: true,
        userId: userDoc._id,
        curriculumId: curriculumDoc._id,
        currentCurriculumSemester: group.semesterNum,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureBaseSemester() {
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    throw new Error('Current semester is required before seeding semester 1/2/3 demo data.');
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
    .sort({ roomCode: 1, _id: 1 })
    .limit(20)
    .lean();
  const timeslots = await Timeslot.find({ status: 'active' })
    .sort({ startTime: 1, _id: 1 })
    .limit(10)
    .lean();

  if (!rooms.length || !timeslots.length) {
    throw new Error('Rooms and timeslots must exist before seeding auto-enrollment k123 demo data.');
  }

  return { lecturerUser, lecturerDoc, rooms, timeslots };
}

async function seedGroup({
  group,
  semesterDoc,
  academicYearStart,
  lecturerDoc,
  rooms,
  timeslots,
  passwordHash,
}) {
  const curriculumDoc = await upsertCurriculum(group, academicYearStart);
  const curriculumSemesterDoc = await upsertCurriculumSemester(curriculumDoc._id, group);
  const subjectA = await upsertSubject(group, 'A', lecturerDoc._id);
  const subjectB = await upsertSubject(group, 'B', lecturerDoc._id);

  await upsertCurriculumCourse(curriculumSemesterDoc._id, subjectA);
  await upsertCurriculumCourse(curriculumSemesterDoc._id, subjectB);

  const roomA = rooms[(group.semesterNum - 1) % rooms.length];
  const roomB = rooms[group.semesterNum % rooms.length];
  const timeslotA = timeslots[(group.semesterNum - 1) % timeslots.length];
  const timeslotB = timeslots[group.semesterNum % timeslots.length];

  const classA = await upsertClassSection({
    classCode: buildClassCode(group, 'A'),
    className: buildClassName(group, 'A'),
    subjectId: subjectA._id,
    teacherId: lecturerDoc._id,
    roomId: roomA._id,
    timeslotId: timeslotA._id,
    semesterNum: semesterDoc.semesterNum,
    academicYear: semesterDoc.academicYear,
    startDate: semesterDoc.startDate,
    endDate: semesterDoc.endDate,
    dayOfWeek: ((group.semesterNum - 1) % 6) + 1,
    maxCapacity: 40,
    status: 'published',
  });

  const classB = await upsertClassSection({
    classCode: buildClassCode(group, 'B'),
    className: buildClassName(group, 'B'),
    subjectId: subjectB._id,
    teacherId: lecturerDoc._id,
    roomId: roomB._id,
    timeslotId: timeslotB._id,
    semesterNum: semesterDoc.semesterNum,
    academicYear: semesterDoc.academicYear,
    startDate: semesterDoc.startDate,
    endDate: semesterDoc.endDate,
    dayOfWeek: (group.semesterNum % 6) + 1,
    maxCapacity: 40,
    status: 'published',
  });

  const students = [];
  for (let index = 1; index <= STUDENTS_PER_GROUP; index += 1) {
    const email = buildStudentEmail(group, index);
    const fullName = buildStudentName(group, index);
    const userDoc = await upsertUser(
      {
        email,
        fullName,
        role: 'student',
      },
      passwordHash,
    );

    const studentDoc = await upsertStudent(
      userDoc,
      group,
      curriculumDoc,
      academicYearStart,
      index,
    );

    students.push({
      userDoc,
      studentDoc,
    });
  }

  return {
    semesterDoc,
    group,
    curriculumDoc,
    subjects: { A: subjectA, B: subjectB },
    classes: { A: classA, B: classB },
    students,
  };
}

async function cleanupDemoState(groupResults) {
  const studentIds = [];
  const classIds = [];
  const subjectIds = [];
  const waitlistFilters = [];

  for (const result of groupResults) {
    result.students.forEach(({ studentDoc }) => {
      studentIds.push(studentDoc._id);
    });
    classIds.push(result.classes.A._id, result.classes.B._id);
    subjectIds.push(result.subjects.A._id, result.subjects.B._id);
    waitlistFilters.push({
      targetSemester: result.semesterDoc.semesterNum,
      targetAcademicYear: result.semesterDoc.academicYear,
    });
  }

  await ClassEnrollment.deleteMany({
    student: { $in: studentIds },
    classSection: { $in: classIds },
  });

  await Waitlist.deleteMany({
    student: { $in: studentIds },
    subject: { $in: subjectIds },
    $or: waitlistFilters,
  });

  await ClassSection.updateMany(
    { _id: { $in: classIds } },
    { $set: { currentEnrollment: 0 } },
  );
}

function buildOutput(groupResults) {
  return {
    success: true,
    password: PASSWORD,
    note: 'Chạy auto-enrollment theo từng kỳ với majorCodes tương ứng AEK1 / AEK2 / AEK3.',
    groups: groupResults.map((result) => ({
      semester: {
        id: String(result.semesterDoc._id),
        code: result.semesterDoc.code,
        semesterNum: result.semesterDoc.semesterNum,
        academicYear: result.semesterDoc.academicYear,
      },
      majorCode: result.group.majorCode,
      curriculumCode: result.curriculumDoc.code,
      studentCodes: result.students.map(({ studentDoc }) => studentDoc.studentCode),
      studentEmails: result.students.map(({ userDoc }) => userDoc.email),
      subjectCodes: [
        result.subjects.A.subjectCode,
        result.subjects.B.subjectCode,
      ],
      classCodes: [
        result.classes.A.classCode,
        result.classes.B.classCode,
      ],
      expectedResult: {
        totalStudents: result.students.length,
        expectedEnrollmentsWhenRun: result.students.length * 2,
        expectedClassAIncrease: result.students.length,
        expectedClassBIncrease: result.students.length,
      },
      sampleRequest: {
        semesterId: String(result.semesterDoc._id),
        dryRun: false,
        majorCodes: [result.group.majorCode],
      },
    })),
  };
}

async function run() {
  const { uri, dbName, appName } = ensureConnectionConfig();
  await mongoose.connect(uri, {
    dbName,
    appName,
  });

  try {
    const baseSemester = await ensureBaseSemester();
    const academicYearStart = parseAcademicYearStart(baseSemester.academicYear);
    if (!academicYearStart) {
      throw new Error(`Cannot parse academicYear start from ${baseSemester.academicYear}`);
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const { lecturerDoc, rooms, timeslots } = await ensureLecturerAndResources(passwordHash);

    const semesterDocs = new Map();
    for (const group of DEMO_GROUPS) {
      semesterDocs.set(group.semesterNum, await ensureSemester(baseSemester, group.semesterNum));
    }

    const groupResults = [];
    for (const group of DEMO_GROUPS) {
      groupResults.push(
        await seedGroup({
          group,
          semesterDoc: semesterDocs.get(group.semesterNum),
          academicYearStart,
          lecturerDoc,
          rooms,
          timeslots,
          passwordHash,
        }),
      );
    }

    await cleanupDemoState(groupResults);
    console.log(JSON.stringify(buildOutput(groupResults), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('[seed-auto-enrollment-k123-demo] Failed:', error.message);
  process.exit(1);
});
