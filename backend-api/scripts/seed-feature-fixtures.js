const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const User = require('../src/models/user.model');
const Student = require('../src/models/student.model');
const Teacher = require('../src/models/teacher.model');
const Wallet = require('../src/models/wallet.model');
const Semester = require('../src/models/semester.model');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');
const CurriculumCourse = require('../src/models/curriculumCourse.model');
const Subject = require('../src/models/subject.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Room = require('../src/models/room.model');
const Timeslot = require('../src/models/timeslot.model');
const Schedule = require('../src/models/schedule.model');

const FIXTURE_PASSWORD = 'Fixture@123';
const FIXTURE_WALLET_BALANCE = 100000;
const FIXTURE_REGISTRATION_PERIOD = 'FXT Registration Window 2025-2026 Semester 2';

const TEACHER_FIXTURE = {
  user: {
    email: 'fixture.lecturer@fpt.edu.vn',
    fullName: 'Fixture Lecturer',
    role: 'lecturer',
  },
  teacher: {
    teacherCode: 'FXT-L-001',
    fullName: 'Fixture Lecturer',
    email: 'fixture.lecturer@fpt.edu.vn',
    department: 'Fixture Teaching Department',
    specialization: 'Fixture Academic Operations',
    degree: 'masters',
    gender: 'other',
  },
};

const SPECIAL_SUBJECTS = [
  {
    subjectCode: 'FXSEP101',
    subjectName: 'Fixture Prerequisite Foundation',
    credits: 3,
    majorCode: 'SE',
    suggestedSemester: 1,
  },
  {
    subjectCode: 'FXSEP201',
    subjectName: 'Fixture Advanced Registration Lab',
    credits: 4,
    majorCode: 'SE',
    suggestedSemester: 2,
    prerequisites: [{ code: 'FXSEP101', name: 'Fixture Prerequisite Foundation' }],
  },
];

const CURRICULUM_FIXTURES = [
  {
    majorCode: 'CE',
    curriculumCode: 'FXT-CE-2021',
    curriculumName: 'Fixture Computer Engineering Curriculum',
    academicYear: '2021-2025',
    description: 'Fixture curriculum for Computer Engineering auto-enrollment tests.',
    semesters: {
      2: [{ subjectCode: 'FXCE202', subjectName: 'Fixture CE Semester 2 Studio', credits: 4 }],
      4: [{ subjectCode: 'FXCE404', subjectName: 'Fixture CE Semester 4 Studio', credits: 4 }],
      6: [{ subjectCode: 'FXCE606', subjectName: 'Fixture CE Semester 6 Studio', credits: 4 }],
      8: [{ subjectCode: 'FXCE808', subjectName: 'Fixture CE Semester 8 Studio', credits: 4 }],
      10: [{ subjectCode: 'FXCE1010', subjectName: 'Fixture CE Semester 10 Studio', credits: 4 }],
    },
  },
  {
    majorCode: 'CA',
    curriculumCode: 'FXT-CA-2021',
    curriculumName: 'Fixture Computer Applications Curriculum',
    academicYear: '2021-2025',
    description: 'Fixture curriculum for Computer Applications auto-enrollment tests.',
    semesters: {
      2: [{ subjectCode: 'FXCA202', subjectName: 'Fixture CA Semester 2 Studio', credits: 4 }],
      4: [{ subjectCode: 'FXCA404', subjectName: 'Fixture CA Semester 4 Studio', credits: 4 }],
      6: [{ subjectCode: 'FXCA606', subjectName: 'Fixture CA Semester 6 Studio', credits: 4 }],
      8: [{ subjectCode: 'FXCA808', subjectName: 'Fixture CA Semester 8 Studio', credits: 4 }],
      10: [{ subjectCode: 'FXCA1010', subjectName: 'Fixture CA Semester 10 Studio', credits: 4 }],
    },
  },
  {
    majorCode: 'BA',
    curriculumCode: 'FXT-BA-2021',
    curriculumName: 'Fixture Business Administration Curriculum',
    academicYear: '2021-2025',
    description: 'Fixture curriculum for Business Administration auto-enrollment tests.',
    semesters: {
      2: [{ subjectCode: 'FXBA202', subjectName: 'Fixture BA Semester 2 Studio', credits: 4 }],
      4: [{ subjectCode: 'FXBA404', subjectName: 'Fixture BA Semester 4 Studio', credits: 4 }],
      6: [{ subjectCode: 'FXBA606', subjectName: 'Fixture BA Semester 6 Studio', credits: 4 }],
      8: [{ subjectCode: 'FXBA808', subjectName: 'Fixture BA Semester 8 Studio', credits: 4 }],
      10: [{ subjectCode: 'FXBA1010', subjectName: 'Fixture BA Semester 10 Studio', credits: 4 }],
    },
  },
  {
    majorCode: 'SE',
    curriculumCode: 'FXT-SE-2021',
    curriculumName: 'Fixture Software Engineering Curriculum',
    academicYear: '2021-2025',
    description: 'Fixture curriculum for Software Engineering auto-enrollment and registration tests.',
    semesters: {
      2: [
        { subjectCode: 'FXSE201A', subjectName: 'Fixture SE Platform Engineering', credits: 4 },
        { subjectCode: 'FXSE201B', subjectName: 'Fixture SE Frontend Systems', credits: 4 },
      ],
      4: [
        { subjectCode: 'FXSE401A', subjectName: 'Fixture SE Design Studio A', credits: 4 },
        { subjectCode: 'FXSE401B', subjectName: 'Fixture SE Design Studio B', credits: 4 },
        { subjectCode: 'FXSE401C', subjectName: 'Fixture SE Delivery Lab C', credits: 5 },
        { subjectCode: 'FXSE401D', subjectName: 'Fixture SE Delivery Lab D', credits: 5 },
        { subjectCode: 'FXSE401E', subjectName: 'Fixture SE Delivery Lab E', credits: 4 },
      ],
      6: [{ subjectCode: 'FXSE601', subjectName: 'Fixture SE Semester 6 Studio', credits: 4 }],
      8: [{ subjectCode: 'FXSE801', subjectName: 'Fixture SE Semester 8 Studio', credits: 4 }],
      10: [{ subjectCode: 'FXSE1010', subjectName: 'Fixture SE Semester 10 Studio', credits: 4 }],
    },
  },
  {
    majorCode: 'AI',
    curriculumCode: 'FXT-AI-2026',
    curriculumName: 'Fixture Artificial Intelligence Curriculum',
    academicYear: '2026-2034',
    description: 'Fixture curriculum for AI auto-enrollment tests.',
    semesters: {
      2: [{ subjectCode: 'FXAI202', subjectName: 'Fixture AI Semester 2 Studio', credits: 4 }],
    },
  },
  {
    majorCode: 'DS',
    curriculumCode: 'FXT-DS-2026',
    curriculumName: 'Fixture Data Science Curriculum',
    academicYear: '2026-2034',
    description: 'Fixture curriculum for DS auto-enrollment tests.',
    semesters: {
      2: [{ subjectCode: 'FXDS202', subjectName: 'Fixture DS Semester 2 Studio', credits: 4 }],
    },
  },
];

const TEST_STUDENT_FIXTURES = [
  {
    key: 'autoStudent',
    user: { email: 'fixture.student.auto@fpt.edu.vn', fullName: 'Fixture Auto Enrollment Student' },
    student: {
      studentCode: 'FXTAESE2501',
      fullName: 'Fixture Auto Enrollment Student',
      email: 'fixture.student.auto@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentSeTwo',
    user: { email: 'fixture.student.auto.se.two@fpt.edu.vn', fullName: 'Fixture Auto SE Student 2' },
    student: {
      studentCode: 'FXTAESE2502',
      fullName: 'Fixture Auto SE Student 2',
      email: 'fixture.student.auto.se.two@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentSeThree',
    user: { email: 'fixture.student.auto.se.three@fpt.edu.vn', fullName: 'Fixture Auto SE Student 3' },
    student: {
      studentCode: 'FXTAESE2503',
      fullName: 'Fixture Auto SE Student 3',
      email: 'fixture.student.auto.se.three@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentCe',
    user: { email: 'fixture.student.auto.ce@fpt.edu.vn', fullName: 'Fixture Auto CE Student' },
    student: {
      studentCode: 'FXTAECE2501',
      fullName: 'Fixture Auto CE Student',
      email: 'fixture.student.auto.ce@fpt.edu.vn',
      majorCode: 'CE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-CE20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentCeTwo',
    user: { email: 'fixture.student.auto.ce.two@fpt.edu.vn', fullName: 'Fixture Auto CE Student 2' },
    student: {
      studentCode: 'FXTAECE2502',
      fullName: 'Fixture Auto CE Student 2',
      email: 'fixture.student.auto.ce.two@fpt.edu.vn',
      majorCode: 'CE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-CE20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentCa',
    user: { email: 'fixture.student.auto.ca@fpt.edu.vn', fullName: 'Fixture Auto CA Student' },
    student: {
      studentCode: 'FXTAECA2501',
      fullName: 'Fixture Auto CA Student',
      email: 'fixture.student.auto.ca@fpt.edu.vn',
      majorCode: 'CA',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-CA20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentCaTwo',
    user: { email: 'fixture.student.auto.ca.two@fpt.edu.vn', fullName: 'Fixture Auto CA Student 2' },
    student: {
      studentCode: 'FXTAECA2502',
      fullName: 'Fixture Auto CA Student 2',
      email: 'fixture.student.auto.ca.two@fpt.edu.vn',
      majorCode: 'CA',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-CA20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentBa',
    user: { email: 'fixture.student.auto.ba@fpt.edu.vn', fullName: 'Fixture Auto BA Student' },
    student: {
      studentCode: 'FXTAEBA2501',
      fullName: 'Fixture Auto BA Student',
      email: 'fixture.student.auto.ba@fpt.edu.vn',
      majorCode: 'BA',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-BA20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentBaTwo',
    user: { email: 'fixture.student.auto.ba.two@fpt.edu.vn', fullName: 'Fixture Auto BA Student 2' },
    student: {
      studentCode: 'FXTAEBA2502',
      fullName: 'Fixture Auto BA Student 2',
      email: 'fixture.student.auto.ba.two@fpt.edu.vn',
      majorCode: 'BA',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-BA20',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentAi',
    user: { email: 'fixture.student.auto.ai@fpt.edu.vn', fullName: 'Fixture Auto AI Student' },
    student: {
      studentCode: 'FXTAEAI2601',
      fullName: 'Fixture Auto AI Student',
      email: 'fixture.student.auto.ai@fpt.edu.vn',
      majorCode: 'AI',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-AI26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentAiTwo',
    user: { email: 'fixture.student.auto.ai.two@fpt.edu.vn', fullName: 'Fixture Auto AI Student 2' },
    student: {
      studentCode: 'FXTAEAI2602',
      fullName: 'Fixture Auto AI Student 2',
      email: 'fixture.student.auto.ai.two@fpt.edu.vn',
      majorCode: 'AI',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-AI26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentDsOne',
    user: { email: 'fixture.student.auto.ds.one@fpt.edu.vn', fullName: 'Fixture Auto DS Student 1' },
    student: {
      studentCode: 'FXTAEDS2601',
      fullName: 'Fixture Auto DS Student 1',
      email: 'fixture.student.auto.ds.one@fpt.edu.vn',
      majorCode: 'DS',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-DS26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentDsTwo',
    user: { email: 'fixture.student.auto.ds.two@fpt.edu.vn', fullName: 'Fixture Auto DS Student 2' },
    student: {
      studentCode: 'FXTAEDS2602',
      fullName: 'Fixture Auto DS Student 2',
      email: 'fixture.student.auto.ds.two@fpt.edu.vn',
      majorCode: 'DS',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-DS26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentDsThree',
    user: { email: 'fixture.student.auto.ds.three@fpt.edu.vn', fullName: 'Fixture Auto DS Student 3' },
    student: {
      studentCode: 'FXTAEDS2603',
      fullName: 'Fixture Auto DS Student 3',
      email: 'fixture.student.auto.ds.three@fpt.edu.vn',
      majorCode: 'DS',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-DS26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'autoStudentDsFour',
    user: { email: 'fixture.student.auto.ds.four@fpt.edu.vn', fullName: 'Fixture Auto DS Student 4' },
    student: {
      studentCode: 'FXTAEDS2604',
      fullName: 'Fixture Auto DS Student 4',
      email: 'fixture.student.auto.ds.four@fpt.edu.vn',
      majorCode: 'DS',
      cohort: 26,
      enrollmentYear: 2026,
      classSection: 'FXT-DS26',
      academicStatus: 'enrolled',
      isActive: true,
    },
  },
  {
    key: 'overloadStudent',
    user: { email: 'fixture.student.overload@fpt.edu.vn', fullName: 'Fixture Overload Student' },
    student: {
      studentCode: 'FXTOLSE2501',
      fullName: 'Fixture Overload Student',
      email: 'fixture.student.overload@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'on-leave',
      isActive: true,
    },
  },
  {
    key: 'prereqFailStudent',
    user: { email: 'fixture.student.prereq.fail@fpt.edu.vn', fullName: 'Fixture Prerequisite Fail Student' },
    student: {
      studentCode: 'FXTPRSE2501',
      fullName: 'Fixture Prerequisite Fail Student',
      email: 'fixture.student.prereq.fail@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'on-leave',
      isActive: true,
    },
  },
  {
    key: 'prereqPassStudent',
    user: { email: 'fixture.student.prereq.pass@fpt.edu.vn', fullName: 'Fixture Prerequisite Pass Student' },
    student: {
      studentCode: 'FXTPPSE2501',
      fullName: 'Fixture Prerequisite Pass Student',
      email: 'fixture.student.prereq.pass@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 20,
      enrollmentYear: 2025,
      classSection: 'FXT-SE20',
      academicStatus: 'on-leave',
      isActive: true,
    },
  },
  {
    key: 'creditStudent',
    user: { email: 'fixture.student.credit@fpt.edu.vn', fullName: 'Fixture Credit Limit Student' },
    student: {
      studentCode: 'FXTCRSE2401',
      fullName: 'Fixture Credit Limit Student',
      email: 'fixture.student.credit@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 19,
      enrollmentYear: 2024,
      classSection: 'FXT-SE19',
      academicStatus: 'on-leave',
      isActive: true,
    },
  },
  {
    key: 'cohortBlockedStudent',
    user: { email: 'fixture.student.cohort.blocked@fpt.edu.vn', fullName: 'Fixture Cohort Blocked Student' },
    student: {
      studentCode: 'FXTCBSE2101',
      fullName: 'Fixture Cohort Blocked Student',
      email: 'fixture.student.cohort.blocked@fpt.edu.vn',
      majorCode: 'SE',
      cohort: 16,
      enrollmentYear: 2021,
      classSection: 'FXT-SE16',
      academicStatus: 'on-leave',
      isActive: true,
    },
  },
];

function parseAcademicYearStart(academicYear) {
  if (!academicYear) return null;
  const match = String(academicYear).match(/^(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildSemesterName(semesterOrder) {
  return `Học kỳ ${semesterOrder}`;
}

function buildCurrentClassCode(subjectCode) {
  return `FXT-${subjectCode}-${new Date().getFullYear()}`.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
}

function buildPreviousClassCode(subjectCode) {
  return `FXT-PREV-${subjectCode}`.toUpperCase();
}

async function upsertUser(userPayload, passwordHash) {
  return User.findOneAndUpdate(
    { email: userPayload.email },
    {
      $set: {
        email: userPayload.email,
        fullName: userPayload.fullName,
        authProvider: 'local',
        role: userPayload.role || 'student',
        status: 'active',
        isActive: true,
        mustChangePassword: false,
        password: passwordHash,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertTeacher(userDoc, teacherPayload) {
  return Teacher.findOneAndUpdate(
    { teacherCode: teacherPayload.teacherCode },
    {
      $set: {
        fullName: teacherPayload.fullName,
        email: teacherPayload.email,
        department: teacherPayload.department,
        specialization: teacherPayload.specialization,
        degree: teacherPayload.degree,
        gender: teacherPayload.gender,
        isActive: true,
        userId: userDoc._id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertStudent(userDoc, studentPayload) {
  return Student.findOneAndUpdate(
    { studentCode: studentPayload.studentCode },
    {
      $set: {
        fullName: studentPayload.fullName,
        email: studentPayload.email,
        majorCode: studentPayload.majorCode,
        cohort: studentPayload.cohort,
        enrollmentYear: studentPayload.enrollmentYear,
        classSection: studentPayload.classSection,
        academicStatus: studentPayload.academicStatus,
        isActive: studentPayload.isActive !== false,
        userId: userDoc._id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertWallet(userDoc, balance) {
  return Wallet.findOneAndUpdate(
    { userId: userDoc._id },
    {
      $set: {
        balance,
        currency: 'VND',
        status: 'active',
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
        majorCode: subjectPayload.majorCode || null,
        majorCodes: subjectPayload.majorCodes || [],
        isCommon: subjectPayload.isCommon === true,
        prerequisites: subjectPayload.prerequisites || [],
        suggestedSemester: Math.min(subjectPayload.suggestedSemester || 1, 9),
        teachers: teacherId ? [teacherId] : [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculum(config) {
  return Curriculum.findOneAndUpdate(
    { code: config.curriculumCode },
    {
      $set: {
        name: config.curriculumName,
        major: config.majorCode,
        academicYear: config.academicYear,
        description: config.description,
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
    { $set: { name: buildSemesterName(semesterOrder) } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumCourse(semesterId, subjectDoc) {
  return CurriculumCourse.findOneAndUpdate(
    { semester: semesterId, subjectCode: subjectDoc.subjectCode },
    {
      $set: {
        subject: subjectDoc._id,
        subjectCode: subjectDoc.subjectCode,
        subjectName: subjectDoc.subjectName,
        credits: subjectDoc.credits,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertClassSection({
  classCode,
  className,
  subjectId,
  teacherId,
  roomId,
  timeslotId,
  semesterNum,
  academicYear,
  startDate,
  endDate,
  dayOfWeek,
  maxCapacity,
  status,
}) {
  return ClassSection.findOneAndUpdate(
    { classCode },
    {
      $set: {
        className,
        subject: subjectId,
        teacher: teacherId,
        room: roomId,
        timeslot: timeslotId,
        semester: semesterNum,
        academicYear,
        startDate,
        endDate,
        dayOfWeek,
        maxCapacity,
        status,
      },
      $setOnInsert: {
        currentEnrollment: 0,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertSchedule({
  classSectionId,
  roomId,
  dayOfWeek,
  startPeriod,
  endPeriod,
  startDate,
  endDate,
}) {
  return Schedule.findOneAndUpdate(
    {
      classSection: classSectionId,
      room: roomId,
      dayOfWeek,
      startPeriod,
      endPeriod,
    },
    {
      $set: {
        status: 'active',
        startDate,
        endDate,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertClassEnrollment({
  studentId,
  classSectionId,
  status,
  grade,
  isOverload,
  note,
  enrollmentDate,
}) {
  return ClassEnrollment.findOneAndUpdate(
    { student: studentId, classSection: classSectionId },
    {
      $set: {
        status,
        grade: grade == null ? undefined : grade,
        isOverload: isOverload === true,
        note: note || '',
        enrollmentDate: enrollmentDate || new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureCurrentSemester() {
  const currentSemester = await Semester.findOne({ isCurrent: true });
  if (!currentSemester) {
    throw new Error('Current semester is required before seeding fixtures.');
  }

  return currentSemester;
}

async function ensurePreviousSemester(currentSemester) {
  const academicYear = currentSemester.academicYear;
  const previousSemesterCode = `${academicYear}_1`;
  const currentStartDate = currentSemester.startDate || new Date();
  const previousStartDate = new Date(currentStartDate);
  previousStartDate.setMonth(previousStartDate.getMonth() - 5);
  const previousEndDate = new Date(currentStartDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);

  return Semester.findOneAndUpdate(
    { code: previousSemesterCode },
    {
      $set: {
        name: `Học kỳ 1 năm học ${academicYear}`,
        academicYear,
        semesterNum: 1,
        semesterType: 'regular',
        isCurrent: false,
        isActive: true,
        startDate: previousStartDate,
        endDate: previousEndDate,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function backfillEnrollmentYears(currentSemester) {
  const currentAcademicYearStart = parseAcademicYearStart(currentSemester.academicYear);
  if (!currentAcademicYearStart) {
    return { updatedStudents: 0, cohortToYearMap: {} };
  }

  const studentsMissingEnrollmentYear = await Student.find({
    isActive: true,
    $or: [{ enrollmentYear: null }, { enrollmentYear: { $exists: false } }],
  })
    .select('_id cohort')
    .lean();

  const cohorts = Array.from(
    new Set(
      studentsMissingEnrollmentYear
        .map((student) => Number.parseInt(student.cohort, 10))
        .filter((cohort) => Number.isInteger(cohort) && cohort > 0 && cohort < 100),
    ),
  ).sort((left, right) => left - right);

  if (cohorts.length === 0) {
    return { updatedStudents: 0, cohortToYearMap: {} };
  }

  const maxCohort = cohorts[cohorts.length - 1];
  const cohortToYearMap = {};
  let updatedStudents = 0;

  for (const cohort of cohorts) {
    const enrollmentYear = currentAcademicYearStart - (maxCohort - cohort);
    cohortToYearMap[cohort] = enrollmentYear;
    const result = await Student.updateMany(
      {
        isActive: true,
        cohort,
        $or: [{ enrollmentYear: null }, { enrollmentYear: { $exists: false } }],
      },
      { $set: { enrollmentYear } },
    );
    updatedStudents += result.modifiedCount || 0;
  }

  return { updatedStudents, cohortToYearMap };
}

function flattenCurriculumSubjects() {
  const subjects = [];

  for (const curriculum of CURRICULUM_FIXTURES) {
    for (const [semesterOrder, semesterSubjects] of Object.entries(curriculum.semesters)) {
      for (const subject of semesterSubjects) {
        subjects.push({
          ...subject,
          majorCode: curriculum.majorCode,
          suggestedSemester: Number.parseInt(semesterOrder, 10),
        });
      }
    }
  }

  return subjects;
}

async function ensureFixtureTeacherAndResources() {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
  const teacherUser = await upsertUser(TEACHER_FIXTURE.user, passwordHash);
  const teacherDoc = await upsertTeacher(teacherUser, TEACHER_FIXTURE.teacher);

  const rooms = await Room.find({ status: { $ne: 'maintenance' } })
    .sort({ roomCode: 1 })
    .limit(10)
    .lean();
  const timeslots = await Timeslot.find({ status: 'active' })
    .sort({ startTime: 1 })
    .lean();

  if (rooms.length === 0 || timeslots.length === 0) {
    throw new Error('Rooms and timeslots must exist before seeding fixture classes.');
  }

  return { teacherUser, teacherDoc, rooms, timeslots };
}

async function ensureSubjects(teacherId) {
  const subjectDocsByCode = new Map();

  for (const subject of [...flattenCurriculumSubjects(), ...SPECIAL_SUBJECTS]) {
    const subjectDoc = await upsertSubject(subject, teacherId);
    subjectDocsByCode.set(subject.subjectCode, subjectDoc);
  }

  for (const existingSubject of [
    {
      subjectCode: 'SE201',
      subjectName: 'Fixture SE2026 Data Structures',
      credits: 3,
      majorCode: 'SE',
      suggestedSemester: 2,
    },
    {
      subjectCode: 'SE203',
      subjectName: 'Fixture SE2026 Operating Systems',
      credits: 3,
      majorCode: 'SE',
      suggestedSemester: 2,
    },
  ]) {
    const subjectDoc = await upsertSubject(existingSubject, teacherId);
    subjectDocsByCode.set(existingSubject.subjectCode, subjectDoc);
  }

  return subjectDocsByCode;
}

async function ensureCurriculums(subjectDocsByCode) {
  for (const config of CURRICULUM_FIXTURES) {
    const curriculumDoc = await upsertCurriculum(config);

    for (const [semesterOrderRaw, semesterSubjects] of Object.entries(config.semesters)) {
      const semesterOrder = Number.parseInt(semesterOrderRaw, 10);
      const semesterDoc = await upsertCurriculumSemester(curriculumDoc._id, semesterOrder);

      for (const semesterSubject of semesterSubjects) {
        const subjectDoc = subjectDocsByCode.get(semesterSubject.subjectCode);
        await upsertCurriculumCourse(semesterDoc._id, subjectDoc);
      }
    }
  }

  const se2026Curriculum = await Curriculum.findOne({ code: 'SE2026K1' });
  if (!se2026Curriculum) return;

  const semester2 = await CurriculumSemester.findOne({
    curriculum: se2026Curriculum._id,
    semesterOrder: 2,
  });

  if (!semester2) return;

  for (const subjectCode of ['SE201', 'SE203']) {
    const subjectDoc = subjectDocsByCode.get(subjectCode);
    if (!subjectDoc) continue;

    await CurriculumCourse.findOneAndUpdate(
      { semester: semester2._id, subjectCode },
      {
        $set: {
          subject: subjectDoc._id,
          subjectName: subjectDoc.subjectName,
          credits: subjectDoc.credits,
        },
      },
      { new: true },
    );
  }
}

async function ensureCurrentSemesterClasses({
  currentSemester,
  subjectDocsByCode,
  teacherDoc,
  rooms,
  timeslots,
}) {
  const currentClasses = new Map();
  let classIndex = 0;

  const currentFixtureSubjects = [];
  for (const config of CURRICULUM_FIXTURES) {
    for (const [semesterOrderRaw, semesterSubjects] of Object.entries(config.semesters)) {
      for (const semesterSubject of semesterSubjects) {
        currentFixtureSubjects.push({
          majorCode: config.majorCode,
          semesterOrder: Number.parseInt(semesterOrderRaw, 10),
          ...semesterSubject,
        });
      }
    }
  }

  currentFixtureSubjects.push(
    {
      majorCode: 'SE',
      semesterOrder: 2,
      subjectCode: 'FXSEP201',
      subjectName: 'Fixture Advanced Registration Lab',
      credits: 4,
      maxCapacity: 25,
      className: 'Fixture Advanced Registration Lab',
    },
    {
      majorCode: 'SE',
      semesterOrder: 2,
      subjectCode: 'SE201',
      subjectName: 'Fixture SE2026 Data Structures',
      credits: 3,
      maxCapacity: 25,
      className: 'Fixture SE2026 Data Structures',
    },
    {
      majorCode: 'SE',
      semesterOrder: 2,
      subjectCode: 'SE203',
      subjectName: 'Fixture SE2026 Operating Systems',
      credits: 3,
      maxCapacity: 25,
      className: 'Fixture SE2026 Operating Systems',
    },
  );

  for (const currentSubject of currentFixtureSubjects) {
    const subjectDoc = subjectDocsByCode.get(currentSubject.subjectCode);
    if (!subjectDoc) continue;

    const room = rooms[classIndex % rooms.length];
    const timeslot = timeslots[classIndex % timeslots.length];
    const dayOfWeek = (classIndex % 5) + 1;
    const startPeriod = (classIndex % 5) * 2 + 1;
    const endPeriod = startPeriod + 1;

    const classDoc = await upsertClassSection({
      classCode: buildCurrentClassCode(currentSubject.subjectCode),
      className:
        currentSubject.className ||
        `${currentSubject.subjectName} - ${currentSubject.majorCode} Semester ${currentSubject.semesterOrder}`,
      subjectId: subjectDoc._id,
      teacherId: teacherDoc._id,
      roomId: room._id,
      timeslotId: timeslot._id,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate: currentSemester.startDate,
      endDate: currentSemester.endDate,
      dayOfWeek,
      maxCapacity: currentSubject.subjectCode === 'FXDS202' ? 1 : currentSubject.maxCapacity || 120,
      status: 'published',
    });

    await upsertSchedule({
      classSectionId: classDoc._id,
      roomId: room._id,
      dayOfWeek,
      startPeriod,
      endPeriod,
      startDate: currentSemester.startDate,
      endDate: currentSemester.endDate,
    });

    currentClasses.set(currentSubject.subjectCode, classDoc);
    classIndex += 1;
  }

  return currentClasses;
}

async function ensurePreviousSemesterClass({
  previousSemester,
  subjectDocsByCode,
  teacherDoc,
  rooms,
  timeslots,
}) {
  const subjectDoc = subjectDocsByCode.get('FXSEP101');
  const room = rooms[0];
  const timeslot = timeslots[0];

  const previousClass = await upsertClassSection({
    classCode: buildPreviousClassCode('FXSEP101'),
    className: 'Fixture Prerequisite Foundation - Previous Semester',
    subjectId: subjectDoc._id,
    teacherId: teacherDoc._id,
    roomId: room._id,
    timeslotId: timeslot._id,
    semesterNum: previousSemester.semesterNum,
    academicYear: previousSemester.academicYear,
    startDate: previousSemester.startDate,
    endDate: previousSemester.endDate,
    dayOfWeek: 2,
    maxCapacity: 40,
    status: 'completed',
  });

  await upsertSchedule({
    classSectionId: previousClass._id,
    roomId: room._id,
    dayOfWeek: 2,
    startPeriod: 1,
    endPeriod: 2,
    startDate: previousSemester.startDate,
    endDate: previousSemester.endDate,
  });

  return previousClass;
}

async function ensureFixtureStudents() {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
  const usersByKey = new Map();
  const studentsByKey = new Map();

  for (const fixture of TEST_STUDENT_FIXTURES) {
    const userDoc = await upsertUser(
      {
        email: fixture.user.email,
        fullName: fixture.user.fullName,
        role: 'student',
      },
      passwordHash,
    );
    const studentDoc = await upsertStudent(userDoc, fixture.student);
    await upsertWallet(userDoc, FIXTURE_WALLET_BALANCE);
    usersByKey.set(fixture.key, userDoc);
    studentsByKey.set(fixture.key, studentDoc);
  }

  return { usersByKey, studentsByKey };
}

async function ensureRegistrationPeriod() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  await RegistrationPeriod.updateMany(
    { status: 'active', periodName: { $ne: FIXTURE_REGISTRATION_PERIOD } },
    { $set: { status: 'closed' } },
  );

  return RegistrationPeriod.findOneAndUpdate(
    { periodName: FIXTURE_REGISTRATION_PERIOD },
    {
      $set: {
        startDate,
        endDate,
        allowedCohorts: [17, 18, 19, 20, 26],
        description: 'Fixture registration period for guardrail feature tests.',
        status: 'active',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureScenarioEnrollments({
  studentsByKey,
  currentClasses,
  previousPrereqClass,
}) {
  const creditStudent = studentsByKey.get('creditStudent');
  const overloadStudent = studentsByKey.get('overloadStudent');
  const prereqPassStudent = studentsByKey.get('prereqPassStudent');
  const now = new Date();

  const currentClassBySubject = (subjectCode) => {
    const classDoc = currentClasses.get(subjectCode);
    if (!classDoc) {
      throw new Error(`Fixture class for subject ${subjectCode} was not created.`);
    }
    return classDoc;
  };

  await upsertClassEnrollment({
    studentId: prereqPassStudent._id,
    classSectionId: previousPrereqClass._id,
    status: 'completed',
    grade: 8,
    isOverload: false,
    note: 'Fixture prerequisite passed history',
    enrollmentDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30),
  });

  for (const subjectCode of ['FXSE401A', 'FXSE401B', 'FXSE401C', 'FXSE401D']) {
    await upsertClassEnrollment({
      studentId: creditStudent._id,
      classSectionId: currentClassBySubject(subjectCode)._id,
      status: 'enrolled',
      isOverload: false,
      note: 'Fixture credit limit setup',
      enrollmentDate: now,
    });
  }

  for (const subjectCode of ['FXSE401A', 'FXSE601']) {
    await upsertClassEnrollment({
      studentId: overloadStudent._id,
      classSectionId: currentClassBySubject(subjectCode)._id,
      status: 'enrolled',
      isOverload: true,
      note: 'Fixture overload limit setup',
      enrollmentDate: now,
    });
  }
}

async function syncFixtureEnrollmentCounts() {
  const fixtureClasses = await ClassSection.find({
    classCode: { $regex: '^FXT-' },
  })
    .select('_id')
    .lean();

  for (const fixtureClass of fixtureClasses) {
    const enrolledCount = await ClassEnrollment.countDocuments({
      classSection: fixtureClass._id,
      status: { $in: ['enrolled', 'completed'] },
    });

    await ClassSection.updateOne(
      { _id: fixtureClass._id },
      { $set: { currentEnrollment: enrolledCount } },
    );
  }
}

async function run() {
  const connectionUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!connectionUri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in environment.');
  }

  await mongoose.connect(connectionUri, {
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: 'seed-feature-fixtures',
  });

  try {
    const currentSemester = await ensureCurrentSemester();
    const previousSemester = await ensurePreviousSemester(currentSemester);
    const backfillResult = await backfillEnrollmentYears(currentSemester);
    const { teacherUser, teacherDoc, rooms, timeslots } = await ensureFixtureTeacherAndResources();
    const subjectDocsByCode = await ensureSubjects(teacherDoc._id);
    await ensureCurriculums(subjectDocsByCode);
    const currentClasses = await ensureCurrentSemesterClasses({
      currentSemester,
      subjectDocsByCode,
      teacherDoc,
      rooms,
      timeslots,
    });
    const previousPrereqClass = await ensurePreviousSemesterClass({
      previousSemester,
      subjectDocsByCode,
      teacherDoc,
      rooms,
      timeslots,
    });
    const { studentsByKey } = await ensureFixtureStudents();
    const registrationPeriod = await ensureRegistrationPeriod();
    await ensureScenarioEnrollments({
      studentsByKey,
      currentClasses,
      previousPrereqClass,
    });
    await syncFixtureEnrollmentCounts();

    const eligibleStudentCount = await Student.countDocuments({
      isActive: true,
      $or: [{ academicStatus: 'enrolled' }, { academicStatus: { $exists: false } }],
    });

    console.log(
      JSON.stringify(
        {
          success: true,
          backfillResult,
          currentSemester: {
            code: currentSemester.code,
            semesterNum: currentSemester.semesterNum,
            academicYear: currentSemester.academicYear,
          },
          previousSemester: {
            code: previousSemester.code,
            semesterNum: previousSemester.semesterNum,
            academicYear: previousSemester.academicYear,
          },
          registrationPeriod: {
            periodName: registrationPeriod.periodName,
            status: registrationPeriod.status,
            allowedCohorts: registrationPeriod.allowedCohorts,
          },
          fixtureLecturer: {
            email: teacherUser.email,
            password: FIXTURE_PASSWORD,
            teacherCode: teacherDoc.teacherCode,
          },
          fixtureStudents: TEST_STUDENT_FIXTURES.map((fixture) => ({
            purpose: fixture.key,
            email: fixture.user.email,
            password: FIXTURE_PASSWORD,
            studentCode: fixture.student.studentCode,
            academicStatus: fixture.student.academicStatus,
            cohort: fixture.student.cohort,
            majorCode: fixture.student.majorCode,
          })),
          currentFixtureClasses: Array.from(currentClasses.entries()).map(([subjectCode, classDoc]) => ({
            subjectCode,
            classCode: classDoc.classCode,
            status: classDoc.status,
            maxCapacity: classDoc.maxCapacity,
          })),
          eligibleStudentCount,
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
  console.error(error);
  process.exit(1);
});
