/**
 * Seed script: Auto-Enrollment Prerequisite Testing
 *
 * Scenario:
 *   PRF192  (HK1) - không có prerequisite
 *   OOP192  (HK2) - prerequisite: PRF192
 *   PRO192  (HK3) - prerequisite: PRF192, OOP192
 *
 * Test cases:
 *   SE-HE180801 : Đã pass PRF192 + OOP192 → enroll PRO192
 *   SE-HE180802 : Đã pass PRF192          → enroll OOP192, waitlist PRO192
 *   SE-HE180803 : Chưa pass gì            → waitlist OOP192 + PRO192
 *   SE-HE180804 : Đã pass PRF192 + OOP192 → enroll PRO192
 *   SE-HE180805 : Đã pass PRF192          → enroll OOP192, waitlist PRO192
 *   SE-HE180811 : HK2, đã pass PRF192     → enroll OOP192
 *   SE-HE180812 : HK2, chưa pass gì       → waitlist OOP192
 *
 * Run: node seed-prerequisite-auto-enrollment.js
 *
 * Ghi chú:
 * - Tạo CurriculumSemester + CurriculumCourse để Admin UI map HK hệ thống ↔ kỳ trong khung
 *   và Auto Enrollment (theo khung CT) thấy môn theo kỳ.
 * - Gắn ClassSection.curriculum + curriculumSemesterOrder + classGroup để dropdown
 *   "Nhóm lớp học phần" có dữ liệu (lọc theo curriculumId).
 * - student.classSection = CLASS_GROUP để khớp classGroup trên lớp.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';
const PASSWORD = '123456';

/** Phải trùng classGroup trên ClassSection — BE ưu tiên lớp cùng nhóm với SV */
const CLASS_GROUP = 'SE1808-01';

const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const Subject = require('./src/models/subject.model');
const Teacher = require('./src/models/teacher.model');
const Room = require('./src/models/room.model');
const Timeslot = require('./src/models/timeslot.model');
const Curriculum = require('./src/models/curriculum.model');
const CurriculumSemester = require('./src/models/curriculumSemester.model');
const CurriculumCourse = require('./src/models/curriculumCourse.model');
const Semester = require('./src/models/semester.model');
const ClassSection = require('./src/models/classSection.model');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const Waitlist = require('./src/models/waitlist.model');

const SUBJECTS = [
  {
    subjectCode: 'PRF192', subjectName: 'Programming Fundamentals',
    credits: 3, suggestedSemester: 1, prerequisites: [],
  },
  {
    subjectCode: 'OOP192', subjectName: 'Object-Oriented Programming',
    credits: 3, suggestedSemester: 2,
    prerequisites: [{ code: 'PRF192', name: 'Programming Fundamentals' }],
  },
  {
    subjectCode: 'PRO192', subjectName: 'Programming Project',
    credits: 4, suggestedSemester: 3,
    prerequisites: [
      { code: 'PRF192', name: 'Programming Fundamentals' },
      { code: 'OOP192', name: 'Object-Oriented Programming' },
    ],
  },
];

const TEST_CASES = [
  { studentCode:'SE-HE180801', email:'se.he180801@fpt.edu.vn',
    fullName:'Tran Van An (da pass ca 2)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:3,
    passedSubjects:['PRF192','OOP192'],
    expected:{ enroll:['PRO192'], waitlist:[] } },
  { studentCode:'SE-HE180802', email:'se.he180802@fpt.edu.vn',
    fullName:'Le Thi Binh (chi pass PRF192)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:3,
    passedSubjects:['PRF192'],
    expected:{ enroll:['OOP192'], waitlist:['PRO192'] } },
  { studentCode:'SE-HE180803', email:'se.he180803@fpt.edu.vn',
    fullName:'Nguyen Van Cuong (chua pass gi)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:3,
    passedSubjects:[],
    expected:{ enroll:[], waitlist:['OOP192','PRO192'] } },
  { studentCode:'SE-HE180804', email:'se.he180804@fpt.edu.vn',
    fullName:'Pham Thi Dung (da pass ca 2)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:3,
    passedSubjects:['PRF192','OOP192'],
    expected:{ enroll:['PRO192'], waitlist:[] } },
  { studentCode:'SE-HE180805', email:'se.he180805@fpt.edu.vn',
    fullName:'Hoang Van Em (chi pass PRF192)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:3,
    passedSubjects:['PRF192'],
    expected:{ enroll:['OOP192'], waitlist:['PRO192'] } },
  { studentCode:'SE-HE180811', email:'se.he180811@fpt.edu.vn',
    fullName:'Vu Thi F (HK2, da pass PRF192)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:2,
    passedSubjects:['PRF192'],
    expected:{ enroll:['OOP192'], waitlist:[] } },
  { studentCode:'SE-HE180812', email:'se.he180812@fpt.edu.vn',
    fullName:'Dang Van G (HK2, chua pass gi)',
    cohort:18, enrollmentYear:2018, currentCurriculumSemester:2,
    passedSubjects:[],
    expected:{ enroll:[], waitlist:['OOP192'] } },
];

async function run() {
  console.log('========================================');
  console.log('  PREREQUISITE AUTO-ENROLLMENT TEST SEED');
  console.log('========================================\n');

  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('[OK] Connected to MongoDB\n');

  // Lay current semester
  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    throw new Error('Khong tim thay current semester. Chay seed-K26-2026.js truoc!');
  }
  console.log(`[OK] Current semester: ${currentSemester.code} (${currentSemester.academicYear})\n`);

  // Lay resources
  const [teacher, room, timeslot] = await Promise.all([
    Teacher.findOne({}).lean(),
    Room.findOne({}).lean(),
    Timeslot.findOne({ status: 'active' }).lean(),
  ]);
  if (!teacher || !room || !timeslot) {
    throw new Error('Thieu teacher/room/timeslot. Chay seed-K26-2026.js truoc!');
  }
  console.log(`[OK] Teacher: ${teacher.teacherCode} | Room: ${room.roomCode} | Timeslot: ${timeslot.groupName}\n`);

  // 1. Upsert subjects with prerequisites
  console.log('[1] Creating subjects with prerequisites...');
  const subjectMap = {};
  for (const sub of SUBJECTS) {
    subjectMap[sub.subjectCode] = await Subject.findOneAndUpdate(
      { subjectCode: sub.subjectCode },
      { $set: {
        subjectName: sub.subjectName,
        credits: sub.credits,
        tuitionFee: sub.credits * 100,
        majorCode: 'SE',
        majorCodes: ['SE', 'CE', 'CA'],
        suggestedSemester: sub.suggestedSemester,
        prerequisites: sub.prerequisites || [],
        status: 'active',
      }},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    const prereqs = sub.prerequisites.map(p => p.code).join(', ') || '(khong co)';
    console.log(`     ${sub.subjectCode} (HK${sub.suggestedSemester}) -> prerequisites: ${prereqs}`);
  }
  console.log('');

  const totalCredits = SUBJECTS.reduce((s, x) => s + x.credits, 0);

  // 2. Khung CT SE K18 (relational)
  console.log('[2] Creating curriculum CURR_SE_18 (relational)...');
  const curriculum = await Curriculum.findOneAndUpdate(
    { code: 'CURR_SE_18' },
    { $set: {
      name: 'Software Engineering K18 (2018-2023)',
      major: 'SE',
      academicYear: '2018-2023',
      status: 'active',
      useRelationalStructure: true,
      totalCredits,
      totalCourses: SUBJECTS.length,
    }},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  console.log(`     Curriculum: ${curriculum.code} (${totalCredits} TC)\n`);

  // HK hệ thống cùng niên khóa với current — UI map mỗi kỳ khung → 1 HK (không trùng id)
  const instByYear = await Semester.find({ academicYear: currentSemester.academicYear })
    .sort({ semesterNum: 1 })
    .lean();
  const instSlots = [1, 2, 3].map((n) => instByYear.find((s) => Number(s.semesterNum) === n));
  if (instSlots.some((s) => !s)) {
    console.warn(
      '[WARN] Trong DB thieu mot so HK (1–3) cho',
      currentSemester.academicYear,
      '— dropdown "Hoc ky" theo khung co the it lua chon. Nen co du HK1, HK2, HK3 cung nam hoc.\n',
    );
  }

  console.log('[3] CurriculumSemester + CurriculumCourse (3 ky)...');
  const curriculumSemesterByOrder = {};
  for (const sub of SUBJECTS) {
    const order = sub.suggestedSemester;
    const inst = instSlots[order - 1] || currentSemester;
    const startDate = inst.startDate || currentSemester.startDate;
    const endDate = inst.endDate || currentSemester.endDate;
    const creditsInOrder = SUBJECTS.filter((x) => x.suggestedSemester === order)
      .reduce((s, x) => s + x.credits, 0);

    if (!curriculumSemesterByOrder[order]) {
      const csDoc = await CurriculumSemester.findOneAndUpdate(
        { curriculum: curriculum._id, semesterOrder: order },
        { $set: {
          name: `Học kỳ ${order}`,
          semesterOrder: order,
          credits: creditsInOrder,
          startDate,
          endDate,
        }},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
      curriculumSemesterByOrder[order] = csDoc;
      console.log(
        `     HK${order} trong khung: ${csDoc._id} (dates theo ${inst.code || 'current'})`,
      );
    }

    const semDoc = curriculumSemesterByOrder[order];
    await CurriculumCourse.findOneAndUpdate(
      { semester: semDoc._id, subject: subjectMap[sub.subjectCode]._id },
      { $set: {
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits,
        hasPrerequisite: (sub.prerequisites || []).length > 0,
      }},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`     ${sub.subjectCode} -> CurriculumCourse (HK ${order})`);
  }
  console.log('');

  // 4. Lop hoc phan (cohort + nhom + kỳ trong khung)
  console.log('[4] Creating class sections (curriculum + classGroup)...');
  const classSectionMap = {};
  for (const [code, semOrder] of [['PRF192', 1], ['OOP192', 2], ['PRO192', 3]]) {
    const cs = await ClassSection.findOneAndUpdate(
      { classCode: `${code}-HK${semOrder}` },
      { $set: {
        className: `${subjectMap[code].subjectName} - HK${semOrder}`,
        subject: subjectMap[code]._id,
        teacher: teacher._id,
        room: room._id,
        timeslot: timeslot._id,
        semester: currentSemester.semesterNum,
        academicYear: currentSemester.academicYear,
        maxCapacity: 50,
        currentEnrollment: 0,
        status: 'published',
        startDate: currentSemester.startDate,
        endDate: currentSemester.endDate,
        dayOfWeek: semOrder + 1,
        curriculum: curriculum._id,
        curriculumSemesterOrder: semOrder,
        classGroup: CLASS_GROUP,
      }},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    classSectionMap[code] = cs;
    console.log(`     Class: ${cs.classCode} | group ${CLASS_GROUP} | curriculumOrder ${semOrder}`);
  }
  console.log('');

  // 5. Upsert students
  console.log('[5] Creating test students...');
  const studentIds = [];
  for (const tc of TEST_CASES) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    await User.findOneAndUpdate(
      { email: tc.email },
      { $set: {
        email: tc.email,
        fullName: tc.fullName,
        role: 'student',
        authProvider: 'local',
        status: 'active',
        isActive: true,
        mustChangePassword: false,
        password: hash,
      }},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const student = await Student.findOneAndUpdate(
      { studentCode: tc.studentCode },
      { $set: {
        studentCode: tc.studentCode,
        fullName: tc.fullName,
        email: tc.email,
        majorCode: 'SE',
        cohort: tc.cohort,
        enrollmentYear: tc.enrollmentYear,
        classSection: CLASS_GROUP,
        academicStatus: 'enrolled',
        isActive: true,
        curriculumId: curriculum._id,
        currentCurriculumSemester: tc.currentCurriculumSemester,
      }},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    studentIds.push(student._id);
    const passed = tc.passedSubjects.join(', ') || '(chua pass gi)';
    console.log(`     ${tc.studentCode} (HK${tc.currentCurriculumSemester}) | passed: [${passed}]`);
  }
  console.log('');

  // 6. Clean old enrollments
  console.log('[6] Cleaning old enrollments...');
  const allClassIds = Object.values(classSectionMap).map(c => c._id);
  await ClassEnrollment.deleteMany({ student: { $in: studentIds }, classSection: { $in: allClassIds } });
  await ClassSection.updateMany({ _id: { $in: allClassIds } }, { $set: { currentEnrollment: 0 } });
  await Waitlist.deleteMany({
    student: { $in: studentIds },
    subject: { $in: Object.values(subjectMap).map(s => s._id) },
  });
  console.log('     Done.\n');

  // 7. Create completed prerequisite enrollments
  console.log('[7] Creating completed prerequisite enrollments...');
  for (const tc of TEST_CASES) {
    const student = await Student.findOne({ studentCode: tc.studentCode }).lean();
    for (const code of tc.passedSubjects) {
      const cs = classSectionMap[code];
      if (!cs) continue;
      await ClassEnrollment.findOneAndUpdate(
        { student: student._id, classSection: cs._id },
        { $set: {
          status: 'completed',
          grade: 8.5,
          midtermScore: 8,
          finalScore: 9,
          assignmentScore: 8,
          continuousScore: 9,
          isFinalized: true,
          submittedAt: new Date(),
          isOverload: false,
          note: 'Seeded prerequisite test data',
        }},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      console.log(`     ✓ ${tc.studentCode} completed ${code} (grade: 8.5)`);
    }
  }
  console.log('');

  // 8. Sync enrollment counts
  console.log('[8] Syncing class enrollment counts...');
  for (const [code, cs] of Object.entries(classSectionMap)) {
    const count = await ClassEnrollment.countDocuments({
      student: { $in: studentIds },
      classSection: cs._id,
      status: 'completed',
    });
    await ClassSection.updateOne({ _id: cs._id }, { $set: { currentEnrollment: count } });
    console.log(`     ${cs.classCode}: ${count} completed`);
  }
  console.log('');

  // Summary
  console.log('========================================');
  console.log('  SEED COMPLETED');
  console.log('========================================\n');
  console.log('Prerequisite chain: PRF192 -> OOP192 -> PRO192\n');
  console.log('Test cases:');
  console.log('+-----------+------------------+------------------+------------------+');
  console.log('| Student   | Passed           | Enroll (expected)| Waitlist (expect)|');
  console.log('+-----------+------------------+------------------+------------------+');
  for (const tc of TEST_CASES) {
    const passed = tc.passedSubjects.join(',') || '-';
    const enroll = tc.expected.enroll.join(',') || '-';
    const wait = tc.expected.waitlist.join(',') || '-';
    console.log(`| ${tc.studentCode.padEnd(9)} | ${passed.padEnd(16)} | ${enroll.padEnd(16)} | ${wait.padEnd(16)} |`);
  }
  console.log('+-----------+------------------+------------------+------------------+\n');

  console.log('HUONG DAN TEST:');
  console.log('1. Admin -> Auto Enrollment: Che do "Theo khung CT", khung CURR_SE_18');
  console.log('2. Chon HK trong dropdown (da map Hoc ky 1/2/3 -> HK he thong neu du HK1-3 cung nam)');
  console.log('3. Nhom lop: ' + CLASS_GROUP);
  console.log('4. majorCodes: SE (hoac SE, CE, CA)');
  console.log('5. Dry Run / Run auto enrollment — xem Execution Logs\n');

  await mongoose.disconnect();
  console.log('[OK] Disconnected. Seed thanh cong!');
}

run().catch(e => {
  console.error('\n[ERROR]', e.message);
  console.error('Huong dan: Chay seed-K26-2026.js truoc de tao current semester, rooms, timeslots.');
  process.exit(1);
});
