require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';

const PRICE_PER_CREDIT = 630_000;

const FPT_SUBJECTS = {
  WDP301: { name: 'Web Design & Prototyping',              credits: 4 },
  SDN302: { name: 'Software Development for Network Apps', credits: 4 },
  MLN122: { name: 'Chủ nghĩa Mác-Lênin',                  credits: 4 },
  PRJ301: { name: 'Java Web Application Development',      credits: 4 },
  EXE201: { name: 'Entrepreneurship Concepts',             credits: 2 },
  PRM393: { name: 'Mobile Programming',                    credits: 3 },
  SWP391: { name: 'Software Project',                      credits: 5 },
};

const CLASS_SLOTS = [
  { code: 'WDP301', days: [2, 4], caSlots: ['CA1', 'CA2'] },
  { code: 'SDN302', days: [1, 4], caSlots: ['CA2', 'CA3'] },
  { code: 'MLN122', days: [3, 5], caSlots: ['CA1', 'CA3'] },
  { code: 'PRJ301', days: [1, 3], caSlots: ['CA3', 'CA4'] },
  { code: 'EXE201', days: [2, 6], caSlots: ['CA5', 'CA4'] },
  { code: 'PRM393', days: [2, 5], caSlots: ['CA2', 'CA1'] },
  { code: 'SWP391', days: [3],    caSlots: ['CA2'] },
];

const TIMESLOT_DEFS = {
  CA1: { name: 'Ca 1', startTime: '07:30', endTime: '09:00' },
  CA2: { name: 'Ca 2', startTime: '09:30', endTime: '11:00' },
  CA3: { name: 'Ca 3', startTime: '12:30', endTime: '14:00' },
  CA4: { name: 'Ca 4', startTime: '14:30', endTime: '16:00' },
  CA5: { name: 'Ca 5', startTime: '17:00', endTime: '18:30' },
  CA6: { name: 'Ca 6', startTime: '19:00', endTime: '20:00' },
};

const CEK18_SEMESTERS = [
  { id: 1, name: 'Học kỳ 1', courses: ['WDP301', 'SDN302', 'MLN122'] },
  { id: 2, name: 'Học kỳ 2', courses: ['PRJ301', 'EXE201', 'PRM393', 'SWP391'] },
  { id: 3, name: 'Học kỳ 3', courses: ['DBI202', 'OSG202', 'EXE101'] },
  { id: 4, name: 'Học kỳ 4', courses: ['SWT301', 'NWC203'] },
];

function parseStudentCode(email) {
  const m = email.match(/([a-z]{2,6}ce18\d{4})@fpt\.edu\.vn/i);
  if (m) {
    const raw = m[1].toUpperCase();
    const numMatch = raw.match(/CE18(\d{4})/i);
    if (numMatch) return 'CE18' + numMatch[1];
  }
  const n = Math.floor(1000 + Math.random() * 8999);
  return 'CE18' + n;
}

async function ensureStudents(db) {
  const users = await db.collection('users').find({ role: 'student' }).toArray();
  const existing = await db.collection('students').find({}).project({ email: 1 }).toArray();
  const existingEmails = new Set(existing.map(s => s.email));

  const toCreate = users.filter(u => !existingEmails.has(u.email));
  if (toCreate.length === 0) {
    console.log('  All users already have student records.');
    return;
  }

  const docs = toCreate.map(u => ({
    userId: u._id,
    email: u.email,
    fullName: u.fullName || u.name || 'Sinh viên',
    studentCode: parseStudentCode(u.email),
    cohort: '18',
    majorCode: 'CE',
    curriculumCode: 'CEK18',
    status: 'active',
    enrollmentYear: 2023,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.collection('students').insertMany(docs);
  console.log(`  Created ${docs.length} student records:`);
  docs.forEach(d => console.log(`    ${d.email} -> ${d.studentCode}`));
}

async function ensureTimeslots(db) {
  for (const [caKey, def] of Object.entries(TIMESLOT_DEFS)) {
    await db.collection('timeslots').updateOne(
      { groupName: caKey },
      {
        $set: {
          name: def.name,
          groupName: caKey,
          startTime: def.startTime,
          endTime: def.endTime,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-30'),
          status: 'active',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
  console.log('  Timeslots OK');
}

async function ensureSubjects(db) {
  for (const [code, info] of Object.entries(FPT_SUBJECTS)) {
    await db.collection('subjects').updateOne(
      { subjectCode: code },
      {
        $set: {
          subjectCode: code,
          subjectName: info.name,
          credits: info.credits,
          status: 'active',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
  console.log('  Subjects OK');
}

async function ensureClassSectionsForStudent(db, student, subjectMap, timeslotMap, roomId) {
  for (const slot of CLASS_SLOTS) {
    const sub = subjectMap[slot.code];
    if (!sub) continue;

    for (let i = 0; i < slot.days.length; i++) {
      const day = slot.days[i];
      const caKey = slot.caSlots[i] || slot.caSlots[0];
      const timeslot = timeslotMap[caKey];
      if (!timeslot) continue;

      const classCode = `${slot.code}-D${day}${caKey}-${student.studentCode.slice(-4)}`;

      await db.collection('classsections').updateOne(
        { classCode },
        {
          $set: {
            classCode,
            className: `${sub.subjectName} - SE18`,
            subject: sub._id,
            academicYear: '2025-2026',
            semester: 2,
            dayOfWeek: day,
            timeslot: timeslot._id,
            room: roomId,
            status: 'active',
            maxStudents: 40,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      const section = await db.collection('classsections').findOne({ classCode });

      await db.collection('classenrollments').updateOne(
        { student: student._id, classSection: section._id },
        {
          $set: {
            student: student._id,
            classSection: section._id,
            status: 'enrolled',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
  }
}

async function ensureSchedules(db) {
  const subjectsInDB = await db.collection('subjects').find({ subjectCode: { $in: Object.keys(FPT_SUBJECTS) } }).toArray();
  const subjectMap = {};
  subjectsInDB.forEach(s => { subjectMap[s.subjectCode] = s; });

  const timeslotsInDB = await db.collection('timeslots').find({}).toArray();
  const timeslotMap = {};
  timeslotsInDB.forEach(t => { timeslotMap[t.groupName] = t; });

  let room = await db.collection('rooms').findOne({ status: 'active' });
  if (!room) {
    await db.collection('rooms').insertOne({ roomCode: 'A101', roomName: 'Phòng A101', status: 'active', createdAt: new Date() });
    room = await db.collection('rooms').findOne({ roomCode: 'A101' });
  }

  const students = await db.collection('students').find({ status: 'active' }).toArray();
  console.log(`  Creating schedules for ${students.length} students...`);
  for (const student of students) {
    await ensureClassSectionsForStudent(db, student, subjectMap, timeslotMap, room._id);
  }
  console.log('  Schedules OK');
}

async function ensureTuitionFee(db) {
  const subjectsInDB = await db.collection('subjects').find({ subjectCode: { $in: Object.keys(FPT_SUBJECTS) } }).toArray();
  const subjectMap = {};
  subjectsInDB.forEach(s => { subjectMap[s.subjectCode] = s; });

  const ALL_SUBJECTS = Object.entries(FPT_SUBJECTS).map(([code, info]) => ({
    subjectId: subjectMap[code]?._id ?? null,
    subjectCode: code,
    subjectName: info.name,
    credits: info.credits,
    tuitionFee: info.credits * PRICE_PER_CREDIT,
  }));

  const updatedSemesters = CEK18_SEMESTERS.map(sem => {
    const courses = sem.courses
      .filter(c => FPT_SUBJECTS[c])
      .map(code => ({
        code,
        name: FPT_SUBJECTS[code].name,
        credits: FPT_SUBJECTS[code].credits,
        hasPrerequisite: false,
      }));
    return { ...sem, credits: courses.reduce((s, c) => s + c.credits, 0), courses };
  });

  const COHORT_VARIANTS = ['18', 'K18', 'K18CT'];

  for (const cohort of COHORT_VARIANTS) {
    for (const sem of updatedSemesters) {
      if (sem.courses.length === 0) continue;
      const subjects = sem.courses.map(c => ({
        subjectId: subjectMap[c.code]?._id ?? null,
        subjectCode: c.code,
        subjectName: c.name,
        credits: c.credits,
        tuitionFee: c.credits * PRICE_PER_CREDIT,
      }));
      const baseFee = sem.credits * PRICE_PER_CREDIT;
      await db.collection('tuitionfees').updateOne(
        { cohort, academicYear: '2025-2026', semester: sem.name },
        {
          $set: {
            cohort,
            academicYear: '2025-2026',
            majorCode: 'CE',
            semester: sem.name,
            subjects,
            totalCredits: sem.credits,
            baseTuitionFee: baseFee,
            finalTuitionFee: baseFee,
            totalDiscount: 0,
            discounts: [],
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
  }
  console.log('  TuitionFee OK (cohorts: 18, K18, K18CT)');
}

async function ensureSemester(db) {
  await db.collection('semesters').updateOne(
    { code: '2025-2026_2' },
    {
      $set: {
        code: '2025-2026_2',
        name: 'Học kỳ 2 năm học 2025-2026',
        academicYear: '2025-2026',
        semesterNum: 2,
        isCurrent: true,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        status: 'active',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  await db.collection('semesters').updateMany(
    { code: { $ne: '2025-2026_2' } },
    { $set: { isCurrent: false } }
  );
  console.log('  Semester OK (2025-2026_2 is current)');
}

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('Connected:', db.databaseName);

  console.log('\n[1] Ensuring student records for all users...');
  await ensureStudents(db);

  console.log('\n[2] Ensuring timeslots...');
  await ensureTimeslots(db);

  console.log('\n[3] Ensuring subjects...');
  await ensureSubjects(db);

  console.log('\n[4] Ensuring current semester...');
  await ensureSemester(db);

  console.log('\n[5] Ensuring tuition fee config (K18)...');
  await ensureTuitionFee(db);

  console.log('\n[6] Ensuring schedules for all students...');
  await ensureSchedules(db);

  await mongoose.disconnect();
  console.log('\nDone. Every student account now has schedule + tuition data.');
}

run().catch(e => { console.error(e); process.exit(1); });
