/**
 * Seed data for K26 cohort (enrollment year 2026)
 *
 * Scenario:
 *   - 45 students, 1 class group: SE2601
 *   - 9 semesters (4.5 years), Semester 1 starts 30/3/2026
 *   - Each semester = 4 months
 *   - Major: SE (Software Engineering)
 *
 * Semester schedule:
 *   HK1:  30/3/2026  – 26/7/2026   (AY 2025-2026)
 *   HK2:  14/9/2026  – 11/1/2027   (AY 2026-2027)
 *   HK3:  29/3/2027  – 26/7/2027   (AY 2026-2027)
 *   HK4:  13/9/2027  – 10/1/2028   (AY 2027-2028)
 *   HK5:  27/3/2028  – 24/7/2028   (AY 2027-2028)
 *   HK6:  11/9/2028  –  8/1/2029   (AY 2028-2029)
 *   HK7:  25/3/2029  – 22/7/2029   (AY 2028-2029)
 *   HK8:  10/9/2029  –  7/1/2030   (AY 2029-2030)
 *   HK9:  24/3/2030  – 21/7/2030   (AY 2029-2030)
 *
 * Run: node seed-K26-2026.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';

// ─── Constants ─────────────────────────────────────
const PASSWORD = '123456';
const MAJOR_CODE = 'SE';
const COHORT = 26;             // K26 → cohort 26
const CLASS_GROUP = 'SE2601';   // 1 nhóm lớp, 45 SV
const STUDENTS_PER_GROUP = 45;
const SEMESTER_DURATION_MONTHS = 4;
const TOTAL_SEMESTERS = 9;

// Academic year pattern: "YYYY-YYYY" matching FPT convention
// where each AY = September year → August next year
const SEMESTERS = [
  {
    num: 1,
    label: 'HK1',
    academicYear: '2025-2026',
    startDate: new Date('2026-03-30'),
    endDate:   new Date('2026-07-26'),
    isCurrent: true,
  },
  {
    num: 2,
    label: 'HK2',
    academicYear: '2026-2027',
    startDate: new Date('2026-09-14'),
    endDate:   new Date('2027-01-11'),
    isCurrent: false,
  },
  {
    num: 3,
    label: 'HK3',
    academicYear: '2026-2027',
    startDate: new Date('2027-03-29'),
    endDate:   new Date('2027-07-26'),
    isCurrent: false,
  },
  {
    num: 4,
    label: 'HK4',
    academicYear: '2027-2028',
    startDate: new Date('2027-09-13'),
    endDate:   new Date('2028-01-10'),
    isCurrent: false,
  },
  {
    num: 5,
    label: 'HK5',
    academicYear: '2027-2028',
    startDate: new Date('2028-03-27'),
    endDate:   new Date('2028-07-24'),
    isCurrent: false,
  },
  {
    num: 6,
    label: 'HK6',
    academicYear: '2028-2029',
    startDate: new Date('2028-09-11'),
    endDate:   new Date('2029-01-08'),
    isCurrent: false,
  },
  {
    num: 7,
    label: 'HK7',
    academicYear: '2028-2029',
    startDate: new Date('2029-03-26'),
    endDate:   new Date('2029-07-23'),
    isCurrent: false,
  },
  {
    num: 8,
    label: 'HK8',
    academicYear: '2029-2030',
    startDate: new Date('2029-09-10'),
    endDate:   new Date('2030-01-07'),
    isCurrent: false,
  },
  {
    num: 9,
    label: 'HK9',
    academicYear: '2029-2030',
    startDate: new Date('2030-03-24'),
    endDate:   new Date('2030-07-21'),
    isCurrent: false,
  },
];

// 9 subjects × 9 semesters = 81 CurriculumCourse entries
// (mỗi môn xuất hiện ở đúng 1 học kỳ trong khung K26)
const CURRICULUM_SUBJECTS = [
  // ── HK1 ──
  { semesterOrder: 1, subjectCode: 'PRF192', subjectName: 'Programming Fundamentals',      credits: 3 },
  { semesterOrder: 1, subjectCode: 'MTH101',  subjectName: 'Discrete Mathematics',           credits: 3 },
  { semesterOrder: 1, subjectCode: 'ENG101',  subjectName: 'Academic English I',              credits: 3 },
  { semesterOrder: 1, subjectCode: 'PE201',   subjectName: 'Physical Education I',            credits: 1 },
  // ── HK2 ──
  { semesterOrder: 2, subjectCode: 'CSD201',  subjectName: 'Data Structures & Algorithms',    credits: 4 },
  { semesterOrder: 2, subjectCode: 'OOP201', subjectName: 'Object-Oriented Programming',    credits: 3 },
  { semesterOrder: 2, subjectCode: 'PRO201',  subjectName: 'Academic English II',             credits: 3 },
  { semesterOrder: 2, subjectCode: 'PE202',   subjectName: 'Physical Education II',           credits: 1 },
  // ── HK3 ──
  { semesterOrder: 3, subjectCode: 'OS202',   subjectName: 'Operating Systems',               credits: 3 },
  { semesterOrder: 3, subjectCode: 'WCD301',  subjectName: 'Web Client Development',          credits: 3 },
  { semesterOrder: 3, subjectCode: 'CN101',   subjectName: 'Computer Networks',               credits: 3 },
  { semesterOrder: 3, subjectCode: 'DBI201',  subjectName: 'Database Systems',                credits: 3 },
  // ── HK4 ──
  { semesterOrder: 4, subjectCode: 'PRJ301',  subjectName: 'Java Web Application Development', credits: 4 },
  { semesterOrder: 4, subjectCode: 'SWC301',  subjectName: 'Software Construction',           credits: 3 },
  { semesterOrder: 4, subjectCode: 'SE301',   subjectName: 'Software Engineering Principles', credits: 3 },
  { semesterOrder: 4, subjectCode: 'IOT201',  subjectName: 'Internet of Things',               credits: 3 },
  // ── HK5 ──
  { semesterOrder: 5, subjectCode: 'MAS291',  subjectName: 'Applied Statistics',              credits: 3 },
  { semesterOrder: 5, subjectCode: 'HCI201',  subjectName: 'Human-Computer Interaction',       credits: 3 },
  { semesterOrder: 5, subjectCode: 'SEC201',  subjectName: 'Information Security Fundamentals', credits: 3 },
  { semesterOrder: 5, subjectCode: 'WAD301',  subjectName: 'Web Architecture & Services',     credits: 3 },
  // ── HK6 ──
  { semesterOrder: 6, subjectCode: 'PRJ401',  subjectName: 'Enterprise Web Development',       credits: 4 },
  { semesterOrder: 6, subjectCode: 'MAD101',  subjectName: 'Mobile Application Development',   credits: 3 },
  { semesterOrder: 6, subjectCode: 'CLD201',  subjectName: 'Cloud Computing',                  credits: 3 },
  { semesterOrder: 6, subjectCode: 'ST301',   subjectName: 'Software Testing & Quality',        credits: 3 },
  // ── HK7 ──
  { semesterOrder: 7, subjectCode: 'INP301',  subjectName: 'Industrial Project',               credits: 5 },
  { semesterOrder: 7, subjectCode: 'DBA301',  subjectName: 'Database Administration',         credits: 3 },
  { semesterOrder: 7, subjectCode: 'SAP301',  subjectName: 'System Analysis & Design',         credits: 3 },
  { semesterOrder: 7, subjectCode: 'CSP301',  subjectName: 'Container & DevOps',              credits: 2 },
  // ── HK8 ──
  { semesterOrder: 8, subjectCode: 'CSP401',  subjectName: 'Capstone Project I',               credits: 5 },
  { semesterOrder: 8, subjectCode: 'AIA201',  subjectName: 'Artificial Intelligence',          credits: 3 },
  { semesterOrder: 8, subjectCode: 'BIA301',  subjectName: 'Business Intelligence',           credits: 3 },
  // ── HK9 ──
  { semesterOrder: 9, subjectCode: 'CSP402',  subjectName: 'Capstone Project II',              credits: 6 },
  { semesterOrder: 9, subjectCode: 'PML301',  subjectName: 'Project Management',              credits: 3 },
  { semesterOrder: 9, subjectCode: 'IS401',   subjectName: 'Information Systems Strategy',     credits: 3 },
];

// ─── Models ────────────────────────────────────────
const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const Subject = require('./src/models/subject.model');
const Teacher = require('./src/models/teacher.model');
const Room = require('./src/models/room.model');
const Timeslot = require('./src/models/timeslot.model');
const Curriculum = require('./src/models/curriculum.model');
const CurriculumSemester = require('./src/models/curriculumSemester.model');
const CurriculumCourse = require('./src/models/curriculumCourse.model');
const ClassSection = require('./src/models/classSection.model');
const Semester = require('./src/models/semester.model');

// ─── Helper Functions ──────────────────────────────
function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

function buildStudentCode(studentIndex) {
  // SE260101 … SE260145
  const studentNum = pad(studentIndex + 1);
  return `${CLASS_GROUP}${studentNum}`;
}

function buildStudentEmail(studentCode) {
  return `${studentCode.toLowerCase()}@fpt.edu.vn`;
}

function buildClassCode(subjectCode, semesterNum) {
  // PRF192-HK1 … CSP402-HK9
  return `${subjectCode}-HK${semesterNum}`;
}

// ─── Upsert helpers ─────────────────────────────────
async function upsertUser(payload) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return User.findOneAndUpdate(
    { email: payload.email },
    { $set: { ...payload, authProvider: 'local', status: 'active', isActive: true, mustChangePassword: false, password: hash } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertStudent(payload) {
  return Student.findOneAndUpdate(
    { studentCode: payload.studentCode },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertSubject(payload) {
  return Subject.findOneAndUpdate(
    { subjectCode: payload.subjectCode },
    { $set: { ...payload, majorCode: MAJOR_CODE, majorCodes: [MAJOR_CODE], status: 'active' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertTeacher(payload) {
  return Teacher.findOneAndUpdate(
    { teacherCode: payload.teacherCode },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertRoom(payload) {
  return Room.findOneAndUpdate(
    { roomCode: payload.roomCode },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertTimeslot(payload) {
  return Timeslot.findOneAndUpdate(
    { groupName: payload.groupName },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertSemester(payload) {
  return Semester.findOneAndUpdate(
    { semesterNum: payload.semesterNum, academicYear: payload.academicYear },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculum(payload) {
  return Curriculum.findOneAndUpdate(
    { code: payload.code },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumSemester(payload) {
  return CurriculumSemester.findOneAndUpdate(
    { curriculum: payload.curriculum, semesterOrder: payload.semesterOrder },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertCurriculumCourse(payload) {
  return CurriculumCourse.findOneAndUpdate(
    { semester: payload.semester, subject: payload.subject },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function upsertClassSection(payload) {
  return ClassSection.findOneAndUpdate(
    { classCode: payload.classCode },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

// ─── Main Seeding ──────────────────────────────────
async function seed() {
  console.log('🔄 Starting K26 seed...\n');

  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Create rooms ──
  console.log('🏢 Creating rooms...');
  const rooms = [];
  for (let i = 1; i <= 8; i++) {
    rooms.push(await upsertRoom({
      roomCode: `A${pad(i, 3)}`,
      roomName: `Phòng A${pad(i, 3)}`,
      capacity: 50,
      status: 'available',
      roomType: 'lecture',
    }));
  }
  console.log(`   ✅ ${rooms.length} rooms`);

  // ── 2. Create timeslots ──
  console.log('\n⏰ Creating timeslots...');
  const timeslots = [];
  const timeSlotDefs = [
    { groupName: 'CA1', name: 'Ca 1 - Sáng',  startPeriod: 1,  endPeriod: 2,  startTime: '07:30', endTime: '09:00' },
    { groupName: 'CA2', name: 'Ca 2 - Sáng',   startPeriod: 3,  endPeriod: 4,  startTime: '09:30', endTime: '11:00' },
    { groupName: 'CA3', name: 'Ca 3 - Chiều',  startPeriod: 5,  endPeriod: 6,  startTime: '12:30', endTime: '14:00' },
    { groupName: 'CA4', name: 'Ca 4 - Chiều',  startPeriod: 7,  endPeriod: 8,  startTime: '14:30', endTime: '16:00' },
    { groupName: 'CA5', name: 'Ca 5 - Tối',    startPeriod: 9,  endPeriod: 10, startTime: '17:00', endTime: '18:30' },
  ];
  for (const def of timeSlotDefs) {
    timeslots.push(await upsertTimeslot({ ...def, status: 'active' }));
  }
  console.log(`   ✅ ${timeslots.length} timeslots`);

  // ── 3. Create teachers ──
  console.log('\n👨‍🏫 Creating teachers...');
  const teachers = [];
  for (let i = 1; i <= 8; i++) {
    teachers.push(await upsertTeacher({
      teacherCode: `GV${pad(i, 3)}`,
      fullName: `Giảng viên ${i}`,
      email: `gv${pad(i, 3)}@fpt.edu.vn`,
      department: 'Khoa Công nghệ Thông tin',
      isActive: true,
    }));
  }
  console.log(`   ✅ ${teachers.length} teachers`);

  // ── 4. Create semesters ──
  console.log('\n📅 Creating semesters...');
  const semesterDocs = {};
  for (const sem of SEMESTERS) {
    const doc = await upsertSemester({
      code: `${sem.label}-${sem.academicYear}`,
      name: `Học kỳ ${sem.num} - ${sem.academicYear}`,
      semesterNum: sem.num,
      academicYear: sem.academicYear,
      startDate: sem.startDate,
      endDate: sem.endDate,
      isCurrent: sem.isCurrent,
      status: 'active',
    });
    semesterDocs[sem.num] = doc;
    console.log(`   ✅ ${doc.code}  (${doc.startDate.toISOString().slice(0, 10)} → ${doc.endDate.toISOString().slice(0, 10)})`);
  }

  // ── 5. Create subjects ──
  console.log('\n📚 Creating subjects...');
  const subjectMap = {};
  for (const item of CURRICULUM_SUBJECTS) {
    if (!subjectMap[item.subjectCode]) {
      subjectMap[item.subjectCode] = await upsertSubject({
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        credits: item.credits,
        teachers: teachers.map(t => t._id),
      });
    }
  }
  const uniqueSubjectCodes = [...new Set(CURRICULUM_SUBJECTS.map(s => s.subjectCode))];
  console.log(`   ✅ ${Object.keys(subjectMap).length} subjects`);

  // ── 6. Create curriculum ──
  console.log('\n📖 Creating curriculum...');
  const curriculum = await upsertCurriculum({
    code: `CURR_${MAJOR_CODE}_${COHORT}`,
    name: `Khung chương trình ${MAJOR_CODE} Khóa ${COHORT} (${COHORT}-${COHORT + 5})`,
    major: MAJOR_CODE,
    academicYear: `${COHORT}-${COHORT + 5}`,
    status: 'active',
    useRelationalStructure: true,
  });
  console.log(`   ✅ ${curriculum.code}`);

  // ── 7. Create curriculum semesters + link subjects ──
  console.log('\n📗 Creating curriculum semesters & linking subjects...');
  const curriculumSemesterMap = {}; // semesterOrder → CurriculumSemester doc

  for (const sem of SEMESTERS) {
    const cs = await upsertCurriculumSemester({
      curriculum: curriculum._id,
      semesterOrder: sem.num,
      name: `Học kỳ ${sem.num} — Năm ${Math.ceil(sem.num / 2)}`,
      startDate: sem.startDate,
      endDate: sem.endDate,
      status: 'active',
    });
    curriculumSemesterMap[sem.num] = cs;
  }

  const subjectCodes = [...new Set(CURRICULUM_SUBJECTS.map(s => s.subjectCode))];
  let totalLinked = 0;
  for (const semOrder of [...new Set(CURRICULUM_SUBJECTS.map(s => s.semesterOrder))].sort()) {
    const cs = curriculumSemesterMap[semOrder];
    const semSubjects = CURRICULUM_SUBJECTS.filter(s => s.semesterOrder === semOrder);
    for (const item of semSubjects) {
      const subjectDoc = subjectMap[item.subjectCode];
      await upsertCurriculumCourse({
        semester: cs._id,
        subject: subjectDoc._id,
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        credits: item.credits,
        isRequired: true,
      });
      totalLinked++;
    }
    const credits = semSubjects.reduce((sum, s) => sum + s.credits, 0);
    console.log(`   ✅ HK${semOrder}: ${semSubjects.map(s => s.subjectCode).join(', ')}  (${credits} TC)`);
  }
  console.log(`   ✅ Total linked: ${totalLinked} courses`);

  // ── 8. Create class sections (1 per subject per semester) ──
  console.log('\n🏫 Creating class sections...');
  let classSectionCount = 0;

  for (const sem of SEMESTERS) {
    const semSubjects = CURRICULUM_SUBJECTS.filter(s => s.semesterOrder === sem.num);
    const semDoc = semesterDocs[sem.num];

    for (let subjIdx = 0; subjIdx < semSubjects.length; subjIdx++) {
      const item = semSubjects[subjIdx];
      const subjectDoc = subjectMap[item.subjectCode];
      const classCode = buildClassCode(item.subjectCode, sem.num);

      // Xoay schedule: mỗi môn 1 ngày khác trong tuần, ca xen kẽ
      const dayOfWeek = [2, 3, 4, 5, 6][subjIdx % 5];            // T2–T6
      const startPeriod = [1, 3, 5, 7, 9][subjIdx % 5];
      const endPeriod   = startPeriod + 1;
      const room        = rooms[subjIdx % rooms.length];
      const timeslot    = timeslots[subjIdx % timeslots.length];
      const teacher     = teachers[subjIdx % teachers.length];

      await upsertClassSection({
        classCode,
        className: `${item.subjectName} — ${CLASS_GROUP}`,
        subject: subjectDoc._id,
        teacher: teacher._id,
        semester: sem.num,
        academicYear: sem.academicYear,
        maxCapacity: STUDENTS_PER_GROUP,
        currentEnrollment: 0,
        status: sem.isCurrent ? 'published' : 'published',   // tất cả published để auto-enrollment chạy full
        room: room._id,
        timeslot: timeslot._id,
        dayOfWeek,
        startDate: sem.startDate,
        endDate: sem.endDate,
        classGroup: CLASS_GROUP,
        groupIndex: 0,
      });
      classSectionCount++;
    }
  }
  console.log(`   ✅ ${classSectionCount} class sections (1 group × ${SEMESTERS.length} semesters × subjects)`);

  // ── 9. Create 45 students ──
  console.log('\n👨‍🎓 Creating students...');
  const allStudents = [];
  for (let i = 0; i < STUDENTS_PER_GROUP; i++) {
    const studentCode = buildStudentCode(i);
    const email = buildStudentEmail(studentCode);

    await upsertUser({ email, fullName: `Sinh viên ${studentCode}`, role: 'student' });

    const student = await upsertStudent({
      studentCode,
      fullName: `SV ${studentCode}`,
      email,
      majorCode: MAJOR_CODE,
      cohort: COHORT,
      enrollmentYear: COHORT,
      classSection: CLASS_GROUP,
      academicStatus: 'enrolled',
      isActive: true,
      curriculumId: curriculum._id,
      currentCurriculumSemester: 1,
    });
    allStudents.push(student);
  }
  console.log(`   ✅ ${allStudents.length} students (${CLASS_GROUP})`);

  // ── 10. Summary ──
  console.log('\n' + '='.repeat(65));
  console.log('✅ K26 SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(65));
  console.log(`   • Students   : ${allStudents.length}  (${CLASS_GROUP})`);
  console.log(`   • Semesters  : ${SEMESTERS.length}  (HK1 startDate: 2026-03-30)`);
  console.log(`   • Subjects   : ${Object.keys(subjectMap).length}  unique across all semesters`);
  console.log(`   • ClassSec.  : ${classSectionCount}  (1 section per subject per semester)`);
  console.log(`   • Curriculum : ${curriculum.code}`);
  console.log(`   • Password    : ${PASSWORD}`);

  console.log('\n🧪 How to test auto enrollment:');
  console.log('   1. Login as admin');
  console.log('   2. Go to: Tự động xếp lớp');
  console.log('   3. Select semester: HK1-2025-2026');
  console.log('   4. Enter majorCodes: SE');
  console.log('   5. Click "Run auto enrollment"');
  console.log('   6. Verify SE2601 → all 4 subjects (HK1)');

  console.log('\n' + '='.repeat(65));
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
