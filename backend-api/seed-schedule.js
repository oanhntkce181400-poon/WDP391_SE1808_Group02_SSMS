require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';
const STUDENT_EMAIL = 'huyhmce181719@fpt.edu.vn';

const SUBJECT_RENAMES = {
  SUB004: { code: 'WDP301', name: 'Web Design & Prototyping',               credits: 4 },
  SUB002: { code: 'SDN302', name: 'Software Development for Network Apps',  credits: 4 },
  SUB024: { code: 'MLN122', name: 'Chu nghia Mac-Lenin',                    credits: 4 },
  SUB044: { code: 'PRJ301', name: 'Java Web Application Development',       credits: 4 },
  SUB043: { code: 'EXE201', name: 'Entrepreneurship Concepts',              credits: 2 },
  SUB013: { code: 'EXE101', name: 'Introduction to Entrepreneurship',       credits: 2 },
  SUB025: { code: 'PRM393', name: 'Mobile Programming',                     credits: 3 },
  SUB034: { code: 'SWP391', name: 'Software Project',                       credits: 5 },
  SUB009: { code: 'OSG202', name: 'Operating Systems',                      credits: 3 },
  SUB015: { code: 'DBI202', name: 'Introduction to Databases',              credits: 2 },
  SUB046: { code: 'SWT301', name: 'Software Testing',                       credits: 5 },
  SUB047: { code: 'NWC203', name: 'Computer Networks',                      credits: 5 },
};

const SLOT_TIMES = [
  { slot: 1, startTime: '07:00', endTime: '09:15' },
  { slot: 2, startTime: '09:30', endTime: '11:45' },
  { slot: 3, startTime: '12:30', endTime: '14:45' },
  { slot: 4, startTime: '15:00', endTime: '17:15' },
  { slot: 5, startTime: '17:30', endTime: '19:45' },
  { slot: 6, startTime: '20:00', endTime: '22:00' },
];

const SCHEDULE_LAYOUT = [
  ['SUB004', 2, 1, 0, 0], ['SUB004', 4, 2, 1, 0],
  ['SUB002', 1, 2, 2, 1], ['SUB002', 4, 3, 3, 1],
  ['SUB024', 3, 1, 4, 2], ['SUB024', 5, 3, 5, 2],
  ['SUB044', 1, 3, 6, 3], ['SUB044', 3, 4, 7, 3],
  ['SUB043', 2, 5, 8, 4], ['SUB043', 6, 4, 9, 4],
  ['SUB025', 2, 2, 10, 5],['SUB025', 5, 1, 11, 5],
  ['SUB034', 3, 2, 12, 6],
];

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('Connected:', db.databaseName);

  const student = await db.collection('students').findOne({ email: STUDENT_EMAIL });
  if (!student) { console.error('Student not found'); await mongoose.disconnect(); return; }
  console.log('Student:', student.fullName);

  for (const [oldCode, info] of Object.entries(SUBJECT_RENAMES)) {
    await db.collection('subjects').updateOne(
      { subjectCode: oldCode },
      { $set: { subjectCode: info.code, subjectName: info.name } }
    );
  }
  console.log('Subjects renamed');

  const semStart = new Date('2026-01-05');
  const semEnd   = new Date('2026-05-20');
  const timeslotIds = {};
  for (const st of SLOT_TIMES) {
    const groupName = 'CA' + st.slot;
    const ts = await db.collection('timeslots').findOneAndUpdate(
      { groupName },
      { $set: { groupName, startDate: semStart, endDate: semEnd, startTime: st.startTime, endTime: st.endTime, sessionsPerDay: 1, status: 'active', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    timeslotIds[st.slot] = ts._id;
  }
  console.log('Timeslots upserted');

  const rooms    = await db.collection('rooms').find({}).limit(20).toArray();
  const teachers = await db.collection('teachers').find({}).limit(15).toArray();
  if (!rooms.length || !teachers.length) { console.error('No rooms/teachers'); await mongoose.disconnect(); return; }

  const oldEnrollments = await db.collection('classenrollments').find({ student: student._id }).toArray();
  if (oldEnrollments.length) {
    const ids = oldEnrollments.map(e => e.classSection);
    await db.collection('classenrollments').deleteMany({ student: student._id });
    await db.collection('classsections').deleteMany({ _id: { $in: ids } });
  }

  const subjectDocs = await db.collection('subjects').find({}).toArray();
  const subByCode = {};
  subjectDocs.forEach(s => { subByCode[s.subjectCode] = s; });
  const subByOldCode = {};
  for (const [old, info] of Object.entries(SUBJECT_RENAMES)) {
    if (subByCode[info.code]) subByOldCode[old] = subByCode[info.code];
  }

  const DAY_NAMES = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  let count = 0;
  for (const [oldCode, dayOfWeek, slotNum, roomIdx, teacherIdx] of SCHEDULE_LAYOUT) {
    const subDoc = subByCode[SUBJECT_RENAMES[oldCode]?.code] || subByOldCode[oldCode];
    if (!subDoc) continue;
    const room    = rooms[roomIdx % rooms.length];
    const teacher = teachers[teacherIdx % teachers.length];
    const classCode = subDoc.subjectCode + '-' + dayOfWeek + slotNum + '-CE18';
    const inserted = await db.collection('classsections').insertOne({
      classCode, className: subDoc.subjectCode + ' - CE18 (' + DAY_NAMES[dayOfWeek] + '-Ca' + slotNum + ')',
      subject: subDoc._id, teacher: teacher._id, room: room._id, timeslot: timeslotIds[slotNum],
      semester: 2, academicYear: '2025-2026', maxCapacity: 30, currentEnrollment: 1,
      status: 'active', dayOfWeek, createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection('classenrollments').insertOne({
      classSection: inserted.insertedId, student: student._id,
      enrollmentDate: new Date('2026-01-05'), status: 'enrolled', createdAt: new Date(), updatedAt: new Date(),
    });
    const st = SLOT_TIMES.find(s => s.slot === slotNum);
    console.log(' ' + classCode.padEnd(22) + DAY_NAMES[dayOfWeek] + ' Ca' + slotNum + ' ' + st.startTime);
    count++;
  }
  console.log(count + ' sections + enrollments created');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
