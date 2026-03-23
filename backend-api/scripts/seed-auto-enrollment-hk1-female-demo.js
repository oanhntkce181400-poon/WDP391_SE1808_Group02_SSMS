const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const User = require('../src/models/user.model');
const Student = require('../src/models/student.model');
const Subject = require('../src/models/subject.model');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');
const CurriculumCourse = require('../src/models/curriculumCourse.model');
const Semester = require('../src/models/semester.model');

const PASSWORD = '123456';
const MAJOR_CODE = 'FAEK1';
const STUDENT_CODE = 'FAEK1S01';
const STUDENT_EMAIL = 'faek1.s01@fpt.edu.vn';
const STUDENT_NAME = 'Sinh viên nữ test Auto Enrollment HK1';
const TARGET_SEMESTER_CODE = '2025-2026_1';
const TARGET_SUBJECT_CODES = ['AEK1SUBA', 'AEK1SUBB'];
const TARGET_CLASS_CODES = ['AEK1-HK1-A-01', 'AEK1-HK1-B-01'];

function ensureConnectionConfig() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in backend-api/.env');
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'seed-auto-enrollment-hk1-female-demo',
  };
}

function parseAcademicYearStart(academicYear) {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const [startYearRaw] = academicYear.split(/[-/]/);
  const startYear = Number.parseInt(startYearRaw, 10);
  return Number.isNaN(startYear) ? null : startYear;
}

async function upsertUser(passwordHash) {
  return User.findOneAndUpdate(
    { email: STUDENT_EMAIL },
    {
      $set: {
        email: STUDENT_EMAIL,
        fullName: STUDENT_NAME,
        authProvider: 'local',
        role: 'student',
        status: 'active',
        isActive: true,
        mustChangePassword: false,
        password: passwordHash,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculum(academicYearStart) {
  const code = `${MAJOR_CODE}-CURR-${academicYearStart}`;
  return Curriculum.findOneAndUpdate(
    { code },
    {
      $set: {
        code,
        name: `Auto Enrollment Demo Nữ HK1 ${academicYearStart}`,
        major: MAJOR_CODE,
        academicYear: `${academicYearStart}-${academicYearStart + 8}`,
        description: 'Curriculum demo riêng cho 1 sinh viên nữ test Auto Enrollment HK1.',
        status: 'active',
        useRelationalStructure: true,
        semesters: [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumSemester(curriculumId) {
  return CurriculumSemester.findOneAndUpdate(
    { curriculum: curriculumId, semesterOrder: 1 },
    {
      $set: {
        name: 'Auto Enrollment Demo Nữ HK1',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumCourses(curriculumSemesterId) {
  const subjects = await Subject.find({ subjectCode: { $in: TARGET_SUBJECT_CODES } }).lean();
  if (subjects.length !== TARGET_SUBJECT_CODES.length) {
    throw new Error(`Missing target subjects: ${TARGET_SUBJECT_CODES.join(', ')}`);
  }

  for (const subject of subjects) {
    await CurriculumCourse.findOneAndUpdate(
      { semester: curriculumSemesterId, subjectCode: subject.subjectCode },
      {
        $set: {
          subject: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          credits: subject.credits,
          hasPrerequisite: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function upsertStudent(userDoc, curriculumDoc, academicYearStart) {
  return Student.findOneAndUpdate(
    { studentCode: STUDENT_CODE },
    {
      $set: {
        studentCode: STUDENT_CODE,
        fullName: STUDENT_NAME,
        email: STUDENT_EMAIL,
        majorCode: MAJOR_CODE,
        cohort: academicYearStart % 100,
        enrollmentYear: academicYearStart,
        classSection: `${MAJOR_CODE}-DEMO-${academicYearStart}`,
        academicStatus: 'enrolled',
        isActive: true,
        gender: 'female',
        userId: userDoc._id,
        curriculumId: curriculumDoc._id,
        currentCurriculumSemester: 1,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function run() {
  const { uri, dbName, appName } = ensureConnectionConfig();
  await mongoose.connect(uri, {
    dbName,
    appName,
  });

  try {
    const semester = await Semester.findOne({ code: TARGET_SEMESTER_CODE }).lean();
    if (!semester) {
      throw new Error(`Semester ${TARGET_SEMESTER_CODE} not found`);
    }

    const academicYearStart = parseAcademicYearStart(semester.academicYear);
    if (!academicYearStart) {
      throw new Error(`Cannot parse academicYear start from ${semester.academicYear}`);
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const userDoc = await upsertUser(passwordHash);
    const curriculumDoc = await upsertCurriculum(academicYearStart);
    const curriculumSemesterDoc = await upsertCurriculumSemester(curriculumDoc._id);
    await upsertCurriculumCourses(curriculumSemesterDoc._id);
    const studentDoc = await upsertStudent(userDoc, curriculumDoc, academicYearStart);

    console.log(
      JSON.stringify(
        {
          success: true,
          majorCode: MAJOR_CODE,
          student: {
            studentCode: studentDoc.studentCode,
            fullName: studentDoc.fullName,
            email: STUDENT_EMAIL,
            gender: 'female',
            password: PASSWORD,
          },
          semester: {
            id: String(semester._id),
            code: semester.code,
            semesterNum: semester.semesterNum,
            academicYear: semester.academicYear,
          },
          targetSubjects: TARGET_SUBJECT_CODES,
          targetClassesToWatch: TARGET_CLASS_CODES,
          sampleRequest: {
            semesterId: String(semester._id),
            dryRun: false,
            majorCodes: [MAJOR_CODE],
          },
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
  console.error('[seed-auto-enrollment-hk1-female-demo] Failed:', error.message);
  process.exit(1);
});
