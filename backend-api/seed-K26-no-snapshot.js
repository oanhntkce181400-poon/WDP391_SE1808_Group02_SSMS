/**
 * seed-K26-no-snapshot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tạo dữ liệu hoàn chỉnh cho khóa K26 (Software Engineering, 2026–2030)
 * KHÔNG tạo EnrollmentSnapshot — dùng để test luồng auto-enrollment thực tế.
 *
 *  • 9 học kỳ × 3 môn  = 27 môn học (mỗi môn 3–4 tín chỉ)
 *  • Mỗi môn → 1 ClassSection
 *  • Lịch học: T2+T4 tiết 1  |  T3+T5 tiết 2  (2 slot Schedule / môn)
 *  • GV được gán vào từng ClassSection
 *  • 45 SV K26 (nhóm SE2601-01); classGroup trên ClassSection
 *  • Mặc định KHÔNG tạo ClassEnrollment HK1 — để auto-enrollment báo Enrolled, không “skipped / already enrolled”.
 *    Muốn gán sẵn lớp + điểm danh HK1: SEED_K26_PRESEED_HK1_ENROLLMENTS=1
 *  • HK1 bắt đầu: 01/03/2026
 *  • KHÔNG tạo EnrollmentSnapshot — để test auto-enrollment snapshot
 *
 * Chạy:  node seed-K26-no-snapshot.js
 * ─────────────────────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSWORD          = '123456';
const MAJOR_CODE        = 'SE';
const COHORT            = 26;
const CLASS_GROUP       = 'SE2601';
/** Dùng cho ClassSection.classGroup + Student.classSection — có dạng "…-01" để khớp auto-enrollment */
const CLASS_GROUP_TAG   = `${CLASS_GROUP}-01`;
const STUDENTS_COUNT    = 45;
const HK1_START         = new Date('2026-03-01');
/** false (default): SV chưa có enrollment HK1 → chạy xếp lớp tự động sẽ thấy Enrolled. true: gán sẵn + attendance như bản complete */
const PRESEED_HK1_ENROLLMENTS =
  String(process.env.SEED_K26_PRESEED_HK1_ENROLLMENTS || '').trim() === '1';

// ─── 1. 9 Học kỳ ────────────────────────────────────────────────────────────
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const SEMESTERS = [
  { num: 1, label: 'HK1', academicYear: '2025-2026', startDate: new Date('2026-03-01'), endDate: addDays(new Date('2026-03-01'), 139) },
  { num: 2, label: 'HK2', academicYear: '2026-2027', startDate: new Date('2026-09-07'), endDate: addDays(new Date('2026-09-07'), 139) },
  { num: 3, label: 'HK3', academicYear: '2026-2027', startDate: new Date('2027-03-01'), endDate: addDays(new Date('2027-03-01'), 139) },
  { num: 4, label: 'HK4', academicYear: '2027-2028', startDate: new Date('2027-09-06'), endDate: addDays(new Date('2027-09-06'), 139) },
  { num: 5, label: 'HK5', academicYear: '2027-2028', startDate: new Date('2028-03-06'), endDate: addDays(new Date('2028-03-06'), 139) },
  { num: 6, label: 'HK6', academicYear: '2028-2029', startDate: new Date('2028-09-04'), endDate: addDays(new Date('2028-09-04'), 139) },
  { num: 7, label: 'HK7', academicYear: '2028-2029', startDate: new Date('2029-03-05'), endDate: addDays(new Date('2029-03-05'), 139) },
  { num: 8, label: 'HK8', academicYear: '2029-2030', startDate: new Date('2029-09-03'), endDate: addDays(new Date('2029-09-03'), 139) },
  { num: 9, label: 'HK9', academicYear: '2029-2030', startDate: new Date('2030-03-04'), endDate: addDays(new Date('2030-03-04'), 139) },
];

// ─── 2. 27 Môn học (3 môn × 9 kỳ) ───────────────────────────────────────────
const CURRICULUM_COURSES = [
  // ── HK1 (3 môn, 01/03/2026 → 18/07/2026) ──
  { sem: 1, code: 'PRF192', name: 'Programming Fundamentals',              credits: 3 },
  { sem: 1, code: 'MTH101', name: 'Discrete Mathematics',                 credits: 3 },
  { sem: 1, code: 'ENG101', name: 'Academic English I',                   credits: 3 },
  // ── HK2 ──
  { sem: 2, code: 'CSD201', name: 'Data Structures & Algorithms',         credits: 4 },
  { sem: 2, code: 'OOP201', name: 'Object-Oriented Programming',           credits: 3 },
  { sem: 2, code: 'PRO201', name: 'Academic English II',                   credits: 3 },
  // ── HK3 ──
  { sem: 3, code: 'OS202',  name: 'Operating Systems',                    credits: 3 },
  { sem: 3, code: 'WCD301', name: 'Web Client Development',               credits: 3 },
  { sem: 3, code: 'CN101',  name: 'Computer Networks',                    credits: 3 },
  // ── HK4 ──
  { sem: 4, code: 'DBI201', name: 'Database Systems',                     credits: 3 },
  { sem: 4, code: 'PRJ301', name: 'Java Web Application Development',     credits: 4 },
  { sem: 4, code: 'SWC301', name: 'Software Construction',                credits: 3 },
  // ── HK5 ──
  { sem: 5, code: 'SE301',  name: 'Software Engineering Principles',       credits: 3 },
  { sem: 5, code: 'WAD301', name: 'Web Architecture & Services',          credits: 3 },
  { sem: 5, code: 'HCI201', name: 'Human-Computer Interaction',          credits: 3 },
  // ── HK6 ──
  { sem: 6, code: 'MAD101', name: 'Mobile Application Development',       credits: 3 },
  { sem: 6, code: 'ST301',  name: 'Software Testing & Quality',          credits: 3 },
  { sem: 6, code: 'SEC201', name: 'Information Security Fundamentals',   credits: 3 },
  // ── HK7 ──
  { sem: 7, code: 'INP301', name: 'Industrial Project',                  credits: 5 },
  { sem: 7, code: 'CLD201', name: 'Cloud Computing',                     credits: 3 },
  { sem: 7, code: 'SAP301', name: 'System Analysis & Design',           credits: 3 },
  // ── HK8 ──
  { sem: 8, code: 'CSP401', name: 'Capstone Project I',                  credits: 5 },
  { sem: 8, code: 'AIA201', name: 'Artificial Intelligence',             credits: 3 },
  { sem: 8, code: 'BIA301', name: 'Business Intelligence',               credits: 3 },
  // ── HK9 ──
  { sem: 9, code: 'CSP402', name: 'Capstone Project II',                 credits: 6 },
  { sem: 9, code: 'PML301', name: 'Project Management',                   credits: 3 },
  { sem: 9, code: 'IS401',  name: 'Information Systems Strategy',       credits: 3 },
];

// ─── 3. Giảng viên (12 GV) ──────────────────────────────────────────────────
const TEACHERS = [
  { code: 'GV001', name: 'Nguyễn Văn A',   email: 'nguyenvana.gv@fpt.edu.vn',  dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV002', name: 'Trần Thị B',     email: 'tranthib.gv@fpt.edu.vn',    dept: 'Khoa CNTT', gender: 'female' },
  { code: 'GV003', name: 'Lê Văn C',       email: 'levanc.gv@fpt.edu.vn',      dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV004', name: 'Phạm Thị D',     email: 'phamthid.gv@fpt.edu.vn',  dept: 'Khoa CNTT', gender: 'female' },
  { code: 'GV005', name: 'Hoàng Văn E',    email: 'hoangvane.gv@fpt.edu.vn', dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV006', name: 'Vũ Thị F',       email: 'vuthif.gv@fpt.edu.vn',    dept: 'Khoa CNTT', gender: 'female' },
  { code: 'GV007', name: 'Đặng Văn G',    email: 'dangvang.gv@fpt.edu.vn', dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV008', name: 'Bùi Thị H',     email: 'buithih.gv@fpt.edu.vn',  dept: 'Khoa CNTT', gender: 'female' },
  { code: 'GV009', name: 'Cao Văn I',     email: 'caovani.gv@fpt.edu.vn',  dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV010', name: 'Trịnh Thị J',   email: 'trinhthij.gv@fpt.edu.vn',dept: 'Khoa CNTT', gender: 'female' },
  { code: 'GV011', name: 'Phan Văn K',    email: 'phanvank.gv@fpt.edu.vn', dept: 'Khoa CNTT', gender: 'male'   },
  { code: 'GV012', name: 'Lý Thị L',      email: 'lythil.gv@fpt.edu.vn',   dept: 'Khoa CNTT', gender: 'female' },
];

// ─── 4. Phòng học ────────────────────────────────────────────────────────────
const ROOMS = [
  { code: 'A101', name: 'Phòng A101',         capacity: 40 },
  { code: 'A102', name: 'Phòng A102',         capacity: 40 },
  { code: 'A103', name: 'Phòng A103',         capacity: 40 },
  { code: 'A104', name: 'Phòng A104',         capacity: 40 },
  { code: 'LAB1', name: 'Phòng LAB1 – Máy',   capacity: 35 },
  { code: 'LAB2', name: 'Phòng LAB2 – Máy',  capacity: 35 },
  { code: 'LAB3', name: 'Phòng LAB3 – Máy',  capacity: 35 },
];

// ─── 5. Timeslot ─────────────────────────────────────────────────────────────
const TIMESLOTS = [
  { group: 'CA1', name: 'Ca 1 – Sáng', startTime: '07:30', endTime: '09:00', sp: 1, ep: 2 },
  { group: 'CA2', name: 'Ca 2 – Sáng', startTime: '09:30', endTime: '11:00', sp: 3, ep: 4 },
];

// ─── 6. Lịch pattern: mỗi môn học có 2 slot Schedule ────────────────────────
//   Môn idx 0 → T2 (dow=1) + T4 (dow=4)  → tiết 1–2 (CA1)
//   Môn idx 1 → T3 (dow=2) + T5 (dow=5)  → tiết 3–4 (CA2)
//   Môn idx 2 → T2 (dow=1) + T4 (dow=4)  → tiết 3–4 (CA2)
const SCHEDULE_PATTERN = [
  [{ dow: 1 }, { dow: 4 }],  // Môn 1: T2+T4, CA1
  [{ dow: 2 }, { dow: 5 }],  // Môn 2: T3+T5, CA2
  [{ dow: 1 }, { dow: 4 }],  // Môn 3: T2+T4, CA2
];

// GV gán theo HK: mỗi HK 3 GV (xoay vòng)
const HK_TEACHER_IDX = [
  [0, 1, 2],   // HK1
  [3, 4, 5],   // HK2
  [6, 7, 8],   // HK3
  [9, 10, 11], // HK4
  [0, 1, 2],   // HK5
  [3, 4, 5],   // HK6
  [6, 7, 8],   // HK7
  [9, 10, 11], // HK8
  [0, 1, 2],   // HK9
];

// ─── Models ──────────────────────────────────────────────────────────────────
const User               = require('./src/models/user.model');
const Student            = require('./src/models/student.model');
const Subject            = require('./src/models/subject.model');
const Teacher            = require('./src/models/teacher.model');
const Room               = require('./src/models/room.model');
const Timeslot           = require('./src/models/timeslot.model');
const Semester           = require('./src/models/semester.model');
const Major              = require('./src/models/major.model');
const Faculty            = require('./src/models/faculty.model');
const Curriculum         = require('./src/models/curriculum.model');
const CurriculumSemester = require('./src/models/curriculumSemester.model');
const CurriculumCourse   = require('./src/models/curriculumCourse.model');
const ClassSection       = require('./src/models/classSection.model');
const Schedule           = require('./src/models/schedule.model');
const ClassEnrollment    = require('./src/models/classEnrollment.model');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pad(n, s = 2) { return String(n).padStart(s, '0'); }

async function upsertUser(email, fullName, role) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  return User.findOneAndUpdate(
    { email },
    { $set: { email, fullName, name: fullName, role,
               authProvider: 'local', status: 'active', isActive: true,
               mustChangePassword: false, password: hash } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Faculty + Major ──────────────────────────────────────────────────────
  let faculty = await Faculty.findOne({ facultyCode: 'CIT' });
  if (!faculty) {
    faculty = await Faculty.create({ facultyCode: 'CIT', facultyName: 'Công nghệ Thông tin' });
    console.log('📚 Faculty: Công nghệ Thông tin (CIT)');
  } else {
    console.log('📚 Faculty CIT already exists');
  }

  let major = await Major.findOne({ majorCode: MAJOR_CODE });
  if (!major) {
    major = await Major.create({ majorCode: MAJOR_CODE, majorName: 'Kỹ thuật Phần mềm', faculty: faculty._id, isActive: true });
    console.log('📚 Major: Kỹ thuật Phần mềm (SE)');
  } else {
    console.log('📚 Major SE already exists');
  }

  // ── 2. Semester records ────────────────────────────────────────────────────
  await Semester.updateMany({}, { $set: { isCurrent: false } });
  for (const sem of SEMESTERS) {
    await Semester.findOneAndUpdate(
      { code: `${sem.academicYear}_${sem.num}` },
      { $set: {
        name:         `${sem.label} – ${sem.academicYear}`,
        academicYear: sem.academicYear,
        semesterNum:  sem.num,
        semesterType: 'regular',
        startDate:    sem.startDate,
        endDate:      sem.endDate,
        isCurrent:    sem.num === 1,
        isActive:     true,
      }},
      { new: true, upsert: true },
    );
    // Set HK1 isCurrent
    await Semester.findOneAndUpdate(
      { code: `${SEMESTERS[0].academicYear}_${SEMESTERS[0].num}` },
      { $set: { isCurrent: true } },
    );
  }
  console.log(`✅ ${SEMESTERS.length} semesters created (HK1 isCurrent = true)\n`);

  // ── 3. Curriculum K26_SE_2026 ──────────────────────────────────────────────
  const totalCredits = CURRICULUM_COURSES.reduce((s, c) => s + c.credits, 0);
  let curriculum = await Curriculum.findOne({ code: 'K26_SE_2026' });
  if (curriculum) {
    await CurriculumCourse.deleteMany({ curriculum: curriculum._id });
    await CurriculumSemester.deleteMany({ curriculum: curriculum._id });
    await Curriculum.deleteOne({ _id: curriculum._id });
    console.log('🗑️  Removed existing K26_SE_2026 curriculum');
  }
  curriculum = await Curriculum.create({
    code:              'K26_SE_2026',
    name:              'Khung chương trình SE Khóa 26 (2026–2030)',
    major:             'Kỹ thuật Phần mềm',
    majorId:           major._id,
    academicYear:      '2026-2030',
    totalCredits,
    totalCourses:      CURRICULUM_COURSES.length,
    status:            'active',
    useRelationalStructure: true,
  });
  console.log(`✅ Curriculum K26_SE_2026 (${totalCredits} tín chỉ, 27 môn)\n`);

  // ── 4. CurriculumSemester + CurriculumCourse ────────────────────────────────
  for (const sem of SEMESTERS) {
    const cs = await CurriculumSemester.create({
      curriculum:    curriculum._id,
      name:         sem.label,
      semesterOrder: sem.num,
      credits:      0,
      startDate:    sem.startDate,
      endDate:      sem.endDate,
    });

    const courses = CURRICULUM_COURSES.filter(c => c.sem === sem.num);
    const semCredits = courses.reduce((s, c) => s + c.credits, 0);
    await CurriculumSemester.updateOne({ _id: cs._id }, { $set: { credits: semCredits } });

    for (const course of courses) {
      let subject = await Subject.findOne({ subjectCode: course.code });
      if (!subject) {
        subject = await Subject.create({
          subjectCode: course.code,
          subjectName: course.name,
          credits:     course.credits,
          majorCode:   MAJOR_CODE,
          majorCodes:  [MAJOR_CODE],
          status:      'active',
        });
      }

      await CurriculumCourse.create({
        curriculum:       curriculum._id,
        semester:         cs._id,
        semesterOrder:    sem.num,
        subject:          subject._id,
        subjectCode:      course.code,
        subjectName:      course.name,
        credits:          course.credits,
        isOptional:       false,
        hasPrerequisite: false,
      });
    }

    const creditList = courses.map(c => `${c.code}(${c.credits})`).join(' + ');
    console.log(`   HK${sem.num}: ${creditList} = ${semCredits} TC`);
  }
  console.log('');

  // ── 5. Timeslots ────────────────────────────────────────────────────────────
  for (const ts of TIMESLOTS) {
    await Timeslot.findOneAndUpdate(
      { groupName: ts.group },
      { $set: { name: ts.name, startTime: ts.startTime, endTime: ts.endTime,
                startPeriod: ts.sp, endPeriod: ts.ep, status: 'active' } },
      { new: true, upsert: true },
    );
  }
  console.log('✅ Timeslots: CA1 (tiết 1–2), CA2 (tiết 3–4)\n');

  // ── 6. Rooms ────────────────────────────────────────────────────────────────
  for (const r of ROOMS) {
    await Room.findOneAndUpdate(
      { roomCode: r.code },
      { $set: { roomName: r.name, capacity: r.capacity, status: 'active' } },
      { new: true, upsert: true },
    );
  }
  console.log(`✅ ${ROOMS.length} rooms created\n`);

  // ── 7. Teachers + Users ────────────────────────────────────────────────────
  const teacherMap = {};
  for (const t of TEACHERS) {
    const u = await upsertUser(t.email, t.name, 'lecturer');
    let teacher = await Teacher.findOne({ teacherCode: t.code });
    if (!teacher) {
      teacher = await Teacher.create({ teacherCode: t.code, fullName: t.name, email: t.email, department: t.dept, gender: t.gender, userId: u._id });
    } else {
      await Teacher.updateOne({ _id: teacher._id }, { $set: { userId: u._id } });
    }
    teacherMap[t.code] = teacher;
  }
  console.log(`✅ ${TEACHERS.length} teachers created\n`);

  // ── 8. ClassSections + Schedules ───────────────────────────────────────────
  const rooms$ = await Room.find({}).lean();
  const ts1    = await Timeslot.findOne({ groupName: 'CA1' });
  const ts2    = await Timeslot.findOne({ groupName: 'CA2' });

  let sectionCount = 0;
  for (const sem of SEMESTERS) {
    const courses   = CURRICULUM_COURSES.filter(c => c.sem === sem.num);
    const tIdx      = HK_TEACHER_IDX[sem.num - 1];
    const status    = sem.num === 1 ? 'published' : 'scheduled';

    for (let ci = 0; ci < courses.length; ci++) {
      const course  = courses[ci];
      const subject = await Subject.findOne({ subjectCode: course.code });
      const classCode = `${course.code}-${CLASS_GROUP}-HK${sem.num}`;
      const className = `${course.code} – Lớp 01`;
      const teacher  = teacherMap[TEACHERS[tIdx[ci]].code];
      const room     = rooms$[ci % rooms$.length];
      const pattern  = SCHEDULE_PATTERN[ci];
      const slotNo   = (ci === 1 || ci === 2) ? 2 : 1;
      const ts       = slotNo === 1 ? ts1 : ts2;

      let cs = await ClassSection.findOne({ classCode });
      if (!cs) {
        cs = await ClassSection.create({
          classCode,
          className,
          subject:    subject._id,
          teacher:    teacher._id,
          semester:   sem.num,
          academicYear: sem.academicYear,
          maxCapacity:   STUDENTS_COUNT,
          currentEnrollment: 0,
          status,
          classGroup:  CLASS_GROUP,
          groupIndex:  0,
        });
      } else {
        await ClassSection.updateOne(
          { _id: cs._id },
          { $set: { classGroup: CLASS_GROUP, groupIndex: 0 } },
        );
      }

      for (const p of pattern) {
        await Schedule.findOneAndUpdate(
          { classSection: cs._id, dayOfWeek: p.dow, startPeriod: ts.startPeriod },
          { $set: {
            classSection: cs._id,
            room:         room._id,
            dayOfWeek:    p.dow,
            startPeriod:  ts.startPeriod,
            endPeriod:    ts.endPeriod,
            startDate:    sem.startDate,
            endDate:      sem.endDate,
            status:       'active',
          }},
          { new: true, upsert: true },
        );
      }

      const days = pattern.map(p => 'T' + p.dow).join('+');
      console.log(`   ${classCode.padEnd(24)} | ${days} tiết ${ts.startPeriod}–${ts.endPeriod} | ${room.roomCode.padEnd(5)} | ${teacher.fullName}`);
      sectionCount++;
    }
  }
  console.log(`\n✅ ${sectionCount} ClassSections + ${sectionCount * 2} Schedules created\n`);

  // ── 9. Students K26 (45 SV) + Enrollments vào HK1 ─────────────────────────
  const hk1 = SEMESTERS[0];
  const hk1Sections = await ClassSection.find({
    semester:     hk1.num,
    academicYear: hk1.academicYear,
    classGroup:   CLASS_GROUP,
  }).lean();

  // ── 9a. Batch tạo Users ─────────────────────────────────────────────────────
  const studentSpecs = [];
  for (let i = 1; i <= STUDENTS_COUNT; i++) {
    const studentCode = `${CLASS_GROUP}${pad(i, 3)}`;   // SE2601001 … SE2601045
    const email       = `${studentCode.toLowerCase()}@fpt.edu.vn`;
    const fullName    = `Sinh viên K26 số ${pad(i, 3)}`;
    const hash        = await bcrypt.hash(PASSWORD, 10);
    studentSpecs.push({ studentCode, email, fullName, hash });
  }

  const upsertedUsers = await Promise.all(
    studentSpecs.map((s) =>
      User.findOneAndUpdate(
        { email: s.email },
        {
          $set: {
            email: s.email, fullName: s.fullName, name: s.fullName,
            role: 'student', authProvider: 'local',
            status: 'active', isActive: true,
            mustChangePassword: false, password: s.hash,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );
  console.log(`✅ ${STUDENTS_COUNT} user accounts upserted`);

  // ── 9b. Batch upsert Students ────────────────────────────────────────────────
  const studentOps = upsertedUsers.map((u, i) => {
    const s = studentSpecs[i];
    return {
      updateOne: {
        filter:       { studentCode: s.studentCode },
        update: {
          $set: {
            fullName:                  s.fullName,
            email:                    s.email,
            majorCode:                MAJOR_CODE,
            majorId:                  major._id,
            cohort:                   COHORT,
            classSection:             CLASS_GROUP_TAG,
            academicStatus:           'enrolled',
            enrollmentYear:           2026,
            curriculumId:             curriculum._id,
            currentCurriculumSemester: 1,
            userId:                   u._id,
            isActive:                 true,
          },
        },
        upsert: true,
      },
    };
  });
  await Student.bulkWrite(studentOps);
  const createdStudents = await Student.find({ studentCode: { $regex: `^${CLASS_GROUP}` } }).lean();
  // Lọc chính xác 45 SV K26 SE
  const k26Students = createdStudents.filter(
    (s) => s.majorCode === MAJOR_CODE && s.cohort === COHORT,
  );
  console.log(`✅ ${k26Students.length} students upserted (major=${MAJOR_CODE}, cohort=${COHORT})`);

  // ── 9c. Batch enrollments + counters (tùy chọn) ─────────────────────────────
  let enrollmentDocs = [];
  if (PRESEED_HK1_ENROLLMENTS) {
    const existingEnrollments = await ClassEnrollment.find({
      student:      { $in: k26Students.map((s) => s._id) },
      classSection: { $in: hk1Sections.map((c) => c._id) },
    }).lean();
    const existingKeys = new Set(
      existingEnrollments.map((e) =>
        `${String(e.student)}-${String(e.classSection)}`,
      ),
    );

    const classCounter = {};
    for (const st of k26Students) {
      for (const cs of hk1Sections) {
        const key = `${String(st._id)}-${String(cs._id)}`;
        if (!existingKeys.has(key)) {
          enrollmentDocs.push({
            student:      st._id,
            classSection: cs._id,
            status:      'enrolled',
            enrolledAt:  new Date(),
          });
          const k = String(cs._id);
          classCounter[k] = (classCounter[k] || 0) + 1;
        }
      }
    }

    if (enrollmentDocs.length > 0) {
      await ClassEnrollment.insertMany(enrollmentDocs, { ordered: false });
      await Promise.all(
        Object.entries(classCounter).map(([csId, inc]) =>
          ClassSection.updateOne({ _id: csId }, { $inc: { currentEnrollment: inc } }),
        ),
      );
    }
    console.log(`✅ ${enrollmentDocs.length} HK1 enrollments created / already exist`);
  } else {
    console.log(
      '⏭️  Bỏ qua ClassEnrollment HK1 (PRESEED_HK1_ENROLLMENTS=0). Chạy xếp lớp tự động để gán lớp.',
    );
  }

  // ── 9d. Attendance HK1 (chỉ khi đã có enrollment HK1) ───────────────────────
  function getDatesForDayOfWeek(startDate, endDate, dayOfWeek) {
    const iso = Number(dayOfWeek);
    const targetJsDay = iso === 7 ? 0 : iso;
    const dates = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      if (cur.getDay() === targetJsDay) dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }
  function toYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const snapStudentIds = k26Students.map((s) => s._id);

  const AttendanceModel = require('./src/models/attendance.model');
  if (!PRESEED_HK1_ENROLLMENTS) {
    console.log('⏭️  Bỏ qua Attendance HK1 (chưa có enrollment — tạo sau khi xếp lớp)\n');
  } else {
  console.log('📋 Tạo Attendance cho HK1...');

  const hk1Schedules = await Schedule.find({
    classSection: { $in: hk1Sections.map((c) => c._id) },
    status:        'active',
  }).lean();

  // Map: classSection → mảng slotId (ngày)
  const slotIdsByClass = new Map();
  for (const sch of hk1Schedules) {
    const csId = String(sch.classSection);
    if (!slotIdsByClass.has(csId)) slotIdsByClass.set(csId, new Set());
    const dates = getDatesForDayOfWeek(hk1.startDate, hk1.endDate, sch.dayOfWeek);
    dates.slice(0, 2).forEach((d) => slotIdsByClass.get(csId).add(toYmd(d)));
  }
  for (const [k, v] of slotIdsByClass) {
    slotIdsByClass.set(k, [...v].sort());
  }

  // Lấy enrollment đã upsert xong (filter K26 SE)
  const k26StudentIds = new Set(k26Students.map((s) => String(s._id)));
  const allHk1Enrollments = await ClassEnrollment.find({
    classSection: { $in: hk1Sections.map((c) => c._id) },
    status:        'enrolled',
  }).lean();
  const k26Enrollments = allHk1Enrollments.filter((e) =>
    k26StudentIds.has(String(e.student)),
  );

  // Check existing attendance (chỉ K26 students)
  const existingAttendance = await AttendanceModel.find({
    classSection: { $in: hk1Sections.map((c) => c._id) },
    student:      { $in: snapStudentIds },
  }).lean();
  const existingAttKeys = new Set(
    existingAttendance.map((a) =>
      `${String(a.classSection)}-${String(a.student)}-${a.slotId}`,
    ),
  );

  const attDocs = [];
  for (const enroll of k26Enrollments) {
    const csIdStr = String(enroll.classSection);
    const slots   = slotIdsByClass.get(csIdStr) || [];
    for (const slotId of slots) {
      const key = `${csIdStr}-${String(enroll.student)}-${slotId}`;
      if (existingAttKeys.has(key)) continue;
      const rand  = Math.random();
      const status = rand < 0.85 ? 'Present' : rand < 0.95 ? 'Late' : 'Absent';
      attDocs.push({
        classSection:  enroll.classSection,
        student:       enroll.student,
        slotId,
        slotDate:      (() => {
          const [y, m, d] = String(slotId).split('-').map(Number);
          return new Date(y, m - 1, d);
        })(),
        status,
        note:          status === 'Absent' ? 'Vắng không phép' : status === 'Late' ? 'Đi trễ 5 phút' : '',
        absenceWarning: status === 'Absent',
      });
    }
  }

  if (attDocs.length > 0) {
    await AttendanceModel.insertMany(attDocs, { ordered: false });
  }
  console.log(`✅ Attendance: ${attDocs.length} bản ghi điểm danh HK1 (3–4 buổi/lớp)\n`);
  }

  // ⚠️  KHÔNG tạo EnrollmentSnapshot — để test luồng auto-enrollment thực tế
  // Nếu muốn tạo snapshot, chạy API auto-enrollment từ trang /admin/semesters

  // ── 10. Tóm tắt ────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         TÓM TẮT DỮ LIỆU  K26 SE  (2026 – 2030)                ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  • Học kỳ:         9 kỳ (HK1–HK9)                                ║`);
  console.log(`║  • Môn học:        27 môn                                        ║`);
  console.log(`║  • Tổng tín chỉ:   ${totalCredits} tín chỉ                                 ║`);
  console.log(`║  • Giảng viên:     ${TEACHERS.length} GV                                      ║`);
  console.log(`║  • Phòng học:      ${ROOMS.length} phòng                                   ║`);
  console.log(`║  • Sinh viên K26:  ${STUDENTS_COUNT} SV (${CLASS_GROUP})                           ║`);
  console.log(`║  • HK1 bắt đầu:    01/03/2026                                     ║`);
  console.log(`║  • HK1 ClassEnrollment: ${PRESEED_HK1_ENROLLMENTS ? 'có (PRESEED=1)' : 'KHÔNG — chờ auto-enrollment'}     ║`);
  console.log(`║  • EnrollmentSnapshot: KHÔNG tạo (test auto-enrollment)          ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  LỊCH HỌC HK1                                                     ║');
  for (const cs of hk1Sections) {
    const sc = await Schedule.find({ classSection: cs._id, status: 'active' }).lean();
    const days = sc.map(s => 'T' + s.dayOfWeek).sort().join('+');
    console.log(`║    ${cs.classCode.padEnd(20)} ${days} tiết ${sc[0]?.startPeriod}–${sc[0]?.endPeriod}          ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  TÀI KHOẢN MẪU (password: 123456)                                ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  GIẢNG VIÊN                                                      ║');
  TEACHERS.slice(0, 6).forEach(t => {
    console.log(`║    ${t.code}  ${t.name.padEnd(16)}  ${t.email.padEnd(30)}  ║`);
  });
  console.log('║  SINH VIÊN                                                        ║');
  for (let i = 1; i <= 5; i++) {
    const sc = `${CLASS_GROUP}${pad(i, 3)}`;
    console.log(`║    ${sc}  SV K26 số ${pad(i, 3)}     ${sc.toLowerCase()}@fpt.edu.vn         ║`);
  }
  console.log(`║    ... (tổng ${STUDENTS_COUNT} SV: SE2601001 → SE26010${STUDENTS_COUNT})              ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
  console.log('\n✅ Seed hoàn tất! (KHÔNG có EnrollmentSnapshot)');
}

main().catch(err => { console.error(err); process.exit(1); });
