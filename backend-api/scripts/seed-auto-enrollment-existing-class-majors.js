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
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const Waitlist = require('../src/models/waitlist.model');
const Semester = require('../src/models/semester.model');

const PASSWORD = '123456';
const STUDENTS_PER_GROUP = 10;
const ACTIVE_ENROLLMENT_STATUSES = ['enrolled', 'completed'];
const OPEN_CLASS_STATUSES = ['published', 'scheduled'];

// Các major test này chỉ dùng để lọc riêng trên UI/Admin.
// Chúng trỏ tới subject thật đang có class mở của các ngành BA/CA/CE/DS/SE/AI.
const DEMO_GROUPS = [
  {
    majorCode: 'EAI1',
    label: 'AI lớp sẵn kỳ 1',
    semesterCode: '2025-2026_1',
    curriculumSemesterOrder: 1,
    subjectCodes: ['FXAI202'],
  },
  {
    majorCode: 'ESE1',
    label: 'SE lớp sẵn kỳ 1',
    semesterCode: '2025-2026_1',
    curriculumSemesterOrder: 1,
    subjectCodes: ['SE101'],
  },
  {
    majorCode: 'ESE2',
    label: 'SE lớp sẵn kỳ 2',
    semesterCode: '2025-2026_2',
    curriculumSemesterOrder: 2,
    subjectCodes: ['SE201'],
  },
  {
    majorCode: 'EBA2',
    label: 'BA lớp sẵn kỳ 2',
    semesterCode: '2025-2026_2',
    curriculumSemesterOrder: 2,
    subjectCodes: ['FXBA202'],
  },
  {
    majorCode: 'ECA2',
    label: 'CA lớp sẵn kỳ 2',
    semesterCode: '2025-2026_2',
    curriculumSemesterOrder: 2,
    subjectCodes: ['FXCA202'],
  },
  {
    majorCode: 'ECE2',
    label: 'CE lớp sẵn kỳ 2',
    semesterCode: '2025-2026_2',
    curriculumSemesterOrder: 2,
    subjectCodes: ['FXCE202'],
  },
  {
    majorCode: 'EDS2',
    label: 'DS lớp sẵn kỳ 2',
    semesterCode: '2025-2026_2',
    curriculumSemesterOrder: 2,
    subjectCodes: ['FXDS202'],
  },
];

function ensureConnectionConfig() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in backend-api/.env');
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'seed-auto-enrollment-existing-class-majors',
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

function buildStudentCode(group, index) {
  return `${group.majorCode}S${pad(index)}`;
}

function buildStudentEmail(group, index) {
  return `${group.majorCode.toLowerCase()}.s${pad(index)}@fpt.edu.vn`;
}

function buildStudentName(group, index) {
  return `Sinh viên test ${group.label} ${pad(index)}`;
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

async function upsertCurriculum(group, academicYearStart) {
  const code = buildCurriculumCode(group, academicYearStart);
  return Curriculum.findOneAndUpdate(
    { code },
    {
      $set: {
        code,
        name: `Auto Enrollment Existing Class Demo ${group.label}`,
        major: group.majorCode,
        academicYear: `${academicYearStart}-${academicYearStart + 8}`,
        description: `Curriculum test bám vào class có sẵn cho ${group.label}.`,
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
    {
      curriculum: curriculumId,
      semesterOrder: group.curriculumSemesterOrder,
    },
    {
      $set: {
        name: `Auto Enrollment Existing Class Demo ${group.label}`,
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
        currentCurriculumSemester: group.curriculumSemesterOrder,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function resolveGroupTargets(group) {
  const semesterDoc = await Semester.findOne({ code: group.semesterCode }).lean();
  if (!semesterDoc) {
    throw new Error(`Semester ${group.semesterCode} not found`);
  }

  const subjectDocs = [];
  const classSectionsBySubjectCode = new Map();

  for (const subjectCode of group.subjectCodes) {
    const subjectDoc = await Subject.findOne({ subjectCode }).lean();
    if (!subjectDoc) {
      throw new Error(`Subject ${subjectCode} not found for ${group.majorCode}`);
    }

    const classSections = await ClassSection.find({
      subject: subjectDoc._id,
      semester: semesterDoc.semesterNum,
      academicYear: semesterDoc.academicYear,
      status: { $in: OPEN_CLASS_STATUSES },
    })
      .select('classCode currentEnrollment maxCapacity semester academicYear status subject')
      .lean();

    if (!classSections.length) {
      throw new Error(
        `No open class sections found for subject ${subjectCode} in semester ${semesterDoc.code}`,
      );
    }

    subjectDocs.push(subjectDoc);
    classSectionsBySubjectCode.set(subjectCode, classSections);
  }

  return {
    ...group,
    semesterDoc,
    subjectDocs,
    classSectionsBySubjectCode,
  };
}

function simulateGreedyAssignments(subjectDocs, classSectionsBySubjectCode, studentCount) {
  const simulatedPools = new Map();
  const increments = new Map();

  for (const subjectDoc of subjectDocs) {
    const pool = (classSectionsBySubjectCode.get(subjectDoc.subjectCode) || []).map((cls) => ({
      _id: String(cls._id),
      classCode: cls.classCode,
      currentEnrollment: Number(cls.currentEnrollment || 0),
      maxCapacity: Number(cls.maxCapacity || 0),
    }));
    simulatedPools.set(subjectDoc.subjectCode, pool);
  }

  for (let index = 0; index < studentCount; index += 1) {
    for (const subjectDoc of subjectDocs) {
      const pool = simulatedPools.get(subjectDoc.subjectCode) || [];
      let selected = null;

      for (const classSection of pool) {
        if (classSection.currentEnrollment >= classSection.maxCapacity) {
          continue;
        }

        if (
          !selected ||
          classSection.currentEnrollment < selected.currentEnrollment ||
          (classSection.currentEnrollment === selected.currentEnrollment &&
            classSection.classCode.localeCompare(selected.classCode) < 0)
        ) {
          selected = classSection;
        }
      }

      if (!selected) {
        continue;
      }

      selected.currentEnrollment += 1;
      increments.set(selected.classCode, Number(increments.get(selected.classCode) || 0) + 1);
    }
  }

  return Object.fromEntries(
    Array.from(increments.entries()).sort((left, right) => left[0].localeCompare(right[0])),
  );
}

async function cleanupScenarioState(groupResults) {
  const studentIds = [];
  const touchedClassIds = [];
  const touchedSubjectIds = [];
  const waitlistFilters = [];

  for (const result of groupResults) {
    result.students.forEach(({ studentDoc }) => {
      studentIds.push(studentDoc._id);
    });

    result.subjectDocs.forEach((subjectDoc) => {
      touchedSubjectIds.push(subjectDoc._id);
      const classSections = result.classSectionsBySubjectCode.get(subjectDoc.subjectCode) || [];
      classSections.forEach((classSection) => {
        touchedClassIds.push(classSection._id);
      });
    });

    waitlistFilters.push({
      targetSemester: result.semesterDoc.semesterNum,
      targetAcademicYear: result.semesterDoc.academicYear,
    });
  }

  await ClassEnrollment.deleteMany({
    student: { $in: studentIds },
    classSection: { $in: touchedClassIds },
  });

  await Waitlist.deleteMany({
    student: { $in: studentIds },
    subject: { $in: touchedSubjectIds },
    $or: waitlistFilters,
  });

  const uniqueClassIds = Array.from(new Set(touchedClassIds.map((id) => String(id))));
  for (const classId of uniqueClassIds) {
    const enrolledCount = await ClassEnrollment.countDocuments({
      classSection: classId,
      status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    });

    await ClassSection.updateOne(
      { _id: classId },
      { $set: { currentEnrollment: enrolledCount } },
    );
  }
}

async function seedGroup(group, passwordHash, academicYearStart) {
  const curriculumDoc = await upsertCurriculum(group, academicYearStart);
  const curriculumSemesterDoc = await upsertCurriculumSemester(curriculumDoc._id, group);

  for (const subjectDoc of group.subjectDocs) {
    await upsertCurriculumCourse(curriculumSemesterDoc._id, subjectDoc);
  }

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

    students.push({ userDoc, studentDoc });
  }

  return {
    ...group,
    curriculumDoc,
    students,
  };
}

function buildOutput(groupResults) {
  return {
    success: true,
    password: PASSWORD,
    note:
      'Các majorCode EX... là major test để lọc riêng trên UI, nhưng curriculum của chúng trỏ vào subject thật đang có class mở.',
    groups: groupResults.map((result) => ({
      majorCode: result.majorCode,
      label: result.label,
      semester: {
        id: String(result.semesterDoc._id),
        code: result.semesterDoc.code,
        semesterNum: result.semesterDoc.semesterNum,
        academicYear: result.semesterDoc.academicYear,
      },
      curriculumCode: result.curriculumDoc.code,
      subjectCodes: result.subjectDocs.map((subjectDoc) => subjectDoc.subjectCode),
      availableClassCodes: result.subjectDocs.flatMap((subjectDoc) =>
        (result.classSectionsBySubjectCode.get(subjectDoc.subjectCode) || []).map(
          (classSection) => classSection.classCode,
        ),
      ),
      predictedClassIncrements: simulateGreedyAssignments(
        result.subjectDocs,
        result.classSectionsBySubjectCode,
        result.students.length,
      ),
      studentCodes: result.students.map(({ studentDoc }) => studentDoc.studentCode),
      sampleRequest: {
        semesterId: String(result.semesterDoc._id),
        dryRun: false,
        majorCodes: [result.majorCode],
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
    const baseSemester = await Semester.findOne({ code: '2025-2026_2' }).lean();
    if (!baseSemester) {
      throw new Error('Base semester 2025-2026_2 not found');
    }

    const academicYearStart = parseAcademicYearStart(baseSemester.academicYear);
    if (!academicYearStart) {
      throw new Error(`Cannot parse academicYear start from ${baseSemester.academicYear}`);
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const resolvedGroups = [];

    for (const group of DEMO_GROUPS) {
      resolvedGroups.push(await resolveGroupTargets(group));
    }

    const seededGroups = [];
    for (const group of resolvedGroups) {
      seededGroups.push(await seedGroup(group, passwordHash, academicYearStart));
    }

    await cleanupScenarioState(seededGroups);
    console.log(JSON.stringify(buildOutput(seededGroups), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('[seed-auto-enrollment-existing-class-majors] Failed:', error.message);
  process.exit(1);
});
