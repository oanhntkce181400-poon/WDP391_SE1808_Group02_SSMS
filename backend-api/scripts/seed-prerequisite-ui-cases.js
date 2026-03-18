require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Student = require('../src/models/student.model');
const Wallet = require('../src/models/wallet.model');
const Subject = require('../src/models/subject.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const Semester = require('../src/models/semester.model');
const Teacher = require('../src/models/teacher.model');
const Room = require('../src/models/room.model');
const Timeslot = require('../src/models/timeslot.model');

const STUDENT_EMAIL = 'tetttnds260002@fpt.edu.vn';
const PREFIX = 'UI-PRQ-DS260002';
const PASS_CASES = 5;
const FAIL_CASES = 5;
const DAYS = [1, 2, 3, 6, 7];

function fail(message) {
  const error = new Error(message);
  error.isOperational = true;
  throw error;
}

async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) fail('Missing MONGODB_URI or MONGO_URI in backend-api/.env');

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'wdp301',
    appName: process.env.MONGODB_APP_NAME || 'seed-prerequisite-ui-cases',
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
  });
}

async function ensureWallet(userId) {
  return Wallet.findOneAndUpdate(
    { userId },
    {
      $set: {
        status: 'active',
        currency: 'VND',
      },
      $max: {
        balance: 1000000,
        totalEarned: 1000000,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

async function upsertSubject({ subjectCode, subjectName, credits, prerequisites = [] }) {
  return Subject.findOneAndUpdate(
    { subjectCode },
    {
      $set: {
        subjectName,
        credits,
        tuitionFee: 100,
        description: `Seeded UI prerequisite test subject for ${STUDENT_EMAIL}`,
        prerequisites,
        suggestedSemester: 2,
        isCommon: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
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
  status,
  dayOfWeek,
  startDate,
  endDate,
  currentEnrollment,
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
        maxCapacity: 50,
        currentEnrollment,
        status,
        dayOfWeek,
        startDate,
        endDate,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

async function ensureCompletedEnrollment(studentId, classSectionId, note) {
  return ClassEnrollment.findOneAndUpdate(
    { student: studentId, classSection: classSectionId },
    {
      $set: {
        status: 'completed',
        grade: 8.5,
        midtermScore: 8,
        finalScore: 9,
        assignmentScore: 8,
        continuousScore: 9,
        isFinalized: true,
        submittedAt: new Date(),
        isOverload: false,
        note,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

async function run() {
  await connectDb();

  const student = await Student.findOne({ email: STUDENT_EMAIL }).lean();
  if (!student) fail(`Student not found for ${STUDENT_EMAIL}`);
  if (!student.userId) fail(`Student ${STUDENT_EMAIL} is missing userId`);

  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) fail('Current semester not found');

  const [teacher, room, timeslots] = await Promise.all([
    Teacher.findOne({}).lean(),
    Room.findOne({}).lean(),
    Timeslot.find({ startTime: { $ne: null }, endTime: { $ne: null } })
      .sort({ startTime: 1 })
      .limit(5)
      .lean(),
  ]);

  if (!teacher) fail('No teacher found to seed class sections');
  if (!room) fail('No room found to seed class sections');
  if (timeslots.length < 2) fail('Not enough timeslots found to seed class sections');

  await ensureWallet(student.userId);

  const createdCases = [];
  const prereqStart = new Date('2025-01-06T00:00:00.000Z');
  const prereqEnd = new Date('2025-04-30T00:00:00.000Z');
  const targetStart = currentSemester.startDate || new Date();
  const targetEnd = currentSemester.endDate || new Date('2026-06-30T00:00:00.000Z');

  for (let index = 1; index <= PASS_CASES + FAIL_CASES; index += 1) {
    const padded = String(index).padStart(2, '0');
    const isPassCase = index <= PASS_CASES;
    const dayOfWeek = DAYS[(index - 1) % DAYS.length];
    const timeslot = timeslots[(index - 1) % timeslots.length];
    const statusLabel = isPassCase ? 'PASS' : 'FAIL';

    const prerequisiteSubject = await upsertSubject({
      subjectCode: `${PREFIX}-PRE-${padded}`,
      subjectName: `UI Test Prerequisite Foundation ${padded}`,
      credits: 3,
    });

    const targetSubject = await upsertSubject({
      subjectCode: `${PREFIX}-TARGET-${padded}`,
      subjectName: `UI Test Prerequisite ${statusLabel} Case ${padded}`,
      credits: 3,
      prerequisites: [
        {
          code: prerequisiteSubject.subjectCode,
          name: prerequisiteSubject.subjectName,
        },
      ],
    });

    if (isPassCase) {
      const prereqClass = await upsertClassSection({
        classCode: `${PREFIX}-PRE-CLS-${padded}`,
        className: `UI Test Foundation Class ${padded}`,
        subjectId: prerequisiteSubject._id,
        teacherId: teacher._id,
        roomId: room._id,
        timeslotId: timeslot._id,
        semesterNum: 1,
        academicYear: '2024-2025',
        status: 'completed',
        dayOfWeek,
        startDate: prereqStart,
        endDate: prereqEnd,
        currentEnrollment: 1,
      });

      await ensureCompletedEnrollment(
        student._id,
        prereqClass._id,
        `Seeded prerequisite completion for ${STUDENT_EMAIL} - case ${padded}`,
      );
    }

    const targetClass = await upsertClassSection({
      classCode: `${PREFIX}-CLS-${padded}`,
      className: `UI Test Prerequisite ${statusLabel} Case ${padded}`,
      subjectId: targetSubject._id,
      teacherId: teacher._id,
      roomId: room._id,
      timeslotId: timeslot._id,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      status: 'published',
      dayOfWeek,
      startDate: targetStart,
      endDate: targetEnd,
      currentEnrollment: 0,
    });

    createdCases.push({
      case: padded,
      result: isPassCase ? 'pass-prerequisite' : 'missing-prerequisite',
      subjectCode: targetSubject.subjectCode,
      classCode: targetClass.classCode,
      prerequisiteCode: prerequisiteSubject.subjectCode,
      keyword: PREFIX,
    });
  }

  console.log(JSON.stringify({
    student: {
      email: student.email,
      studentCode: student.studentCode,
      id: String(student._id),
    },
    currentSemester: {
      code: currentSemester.code,
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
    },
    keyword: PREFIX,
    totalCases: createdCases.length,
    passCases: createdCases.filter((item) => item.result === 'pass-prerequisite').length,
    failCases: createdCases.filter((item) => item.result === 'missing-prerequisite').length,
    cases: createdCases,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // ignore disconnect errors during script shutdown
    }
  });
