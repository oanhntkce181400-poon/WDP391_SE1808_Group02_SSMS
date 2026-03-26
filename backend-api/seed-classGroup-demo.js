/**
 * Seed data for testing classGroup feature
 * 
 * Scenario: 180 SE1808 students divided into 4 class groups (45 each)
 * - SE1808-01: 45 students
 * - SE1808-02: 45 students
 * - SE1808-03: 45 students
 * - SE1808-04: 45 students
 * 
 * Each group has 6 subjects for Semester 1:
 * - PRJ301, WCD301, PRF192, IOT201, SWC301, PE201
 * 
 * Run: node seed-classGroup-demo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';

// ─── Constants ─────────────────────────────────────
const PASSWORD = '123456';
const MAJOR_CODE = 'SE';
const COHORT = 18;
const CLASS_PREFIX = 'SE1808';
const SEMESTER_NUM = 1;
const ACADEMIC_YEAR = '2025-2026';

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

// ─── Subjects ─────────────────────────────────────
const SUBJECTS = [
  { subjectCode: 'PRJ301', subjectName: 'Java Web Application Development', credits: 4 },
  { subjectCode: 'WCD301', subjectName: 'Web Client Development', credits: 3 },
  { subjectCode: 'PRF192', subjectName: 'Programming Fundamentals', credits: 3 },
  { subjectCode: 'IOT201', subjectName: 'Internet of Things', credits: 3 },
  { subjectCode: 'SWC301', subjectName: 'Software Construction', credits: 3 },
  { subjectCode: 'PE201', subjectName: 'Physical Education', credits: 1 },
];

// ─── Class Groups ──────────────────────────────────
const CLASS_GROUPS = ['SE1808-01', 'SE1808-02', 'SE1808-03', 'SE1808-04'];
const STUDENTS_PER_GROUP = 45;

// ─── Schedule Config ────────────────────────────────
const SCHEDULE_CONFIG = {
  dayOfWeek: [2, 3, 4, 5, 6], // Mon-Fri
  startPeriod: [1, 3, 5, 7, 9], // Periods: 1, 3, 5, 7, 9
  endPeriod: [2, 4, 6, 8, 10],
};

// ─── Helper Functions ──────────────────────────────
function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

function buildStudentCode(groupIndex, studentIndex) {
  const groupNum = pad(groupIndex + 1);
  const studentNum = pad(studentIndex + 1);
  return `${CLASS_PREFIX}${groupNum}${studentNum}`;
}

function buildStudentEmail(studentCode) {
  return `${studentCode.toLowerCase()}@fpt.edu.vn`;
}

function buildClassCode(subjectCode, groupIndex) {
  const groupNum = pad(groupIndex + 1);
  return `${subjectCode}-${groupNum}`;
}

async function upsertUser(payload, passwordHash) {
  return User.findOneAndUpdate(
    { email: payload.email },
    {
      $set: {
        ...payload,
        authProvider: 'local',
        status: 'active',
        isActive: true,
        mustChangePassword: false,
        password: passwordHash,
      },
    },
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
    { $set: { ...payload, status: 'active' } },
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
  console.log('🔄 Starting classGroup seed...\n');

  try {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // 1. Ensure current semester exists
    let semester = await Semester.findOne({ isCurrent: true }).lean();
    if (!semester) {
      semester = await Semester.create({
        code: 'HK1-2025-2026',
        name: 'Học kỳ 1 - 2025-2026',
        semesterNum: 1,
        academicYear: '2025-2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-31'),
        isCurrent: true,
        status: 'active',
      });
      console.log('📅 Created semester:', semester.code);
    } else {
      console.log('📅 Using existing semester:', semester.code);
    }

    // 2. Create rooms
    console.log('\n🏢 Creating rooms...');
    const rooms = [];
    for (let i = 1; i <= 8; i++) {
      const room = await upsertRoom({
        roomCode: `A${pad(i, 3)}`,
        roomName: `Phòng A${pad(i, 3)}`,
        capacity: 50,
        status: 'available',
        roomType: ' lecture',
      });
      rooms.push(room);
    }
    console.log(`   ✅ Created ${rooms.length} rooms`);

    // 3. Create timeslots
    console.log('\n⏰ Creating timeslots...');
    const timeslots = [];
    const timeSlotDefs = [
      { groupName: 'CA1', name: 'Ca 1 - Sáng', startPeriod: 1, endPeriod: 2, startTime: '07:30', endTime: '09:00' },
      { groupName: 'CA2', name: 'Ca 2 - Sáng', startPeriod: 3, endPeriod: 4, startTime: '09:30', endTime: '11:00' },
      { groupName: 'CA3', name: 'Ca 3 - Chiều', startPeriod: 5, endPeriod: 6, startTime: '12:30', endTime: '14:00' },
      { groupName: 'CA4', name: 'Ca 4 - Chiều', startPeriod: 7, endPeriod: 8, startTime: '14:30', endTime: '16:00' },
      { groupName: 'CA5', name: 'Ca 5 - Tối', startPeriod: 9, endPeriod: 10, startTime: '17:00', endTime: '18:30' },
    ];
    for (const def of timeSlotDefs) {
      const slot = await upsertTimeslot({
        ...def,
        status: 'active',
      });
      timeslots.push(slot);
    }
    console.log(`   ✅ Created ${timeslots.length} timeslots`);

    // 4. Create teachers
    console.log('\n👨‍🏫 Creating teachers...');
    const teachers = [];
    for (let i = 1; i <= 8; i++) {
      const teacher = await upsertTeacher({
        teacherCode: `GV${pad(i, 3)}`,
        fullName: `Giảng viên ${i}`,
        email: `gv${pad(i, 3)}@fpt.edu.vn`,
        department: 'Khoa Công nghệ Thông tin',
        isActive: true,
      });
      teachers.push(teacher);
    }
    console.log(`   ✅ Created ${teachers.length} teachers`);

    // 5. Create subjects
    console.log('\n📚 Creating subjects...');
    const subjects = [];
    for (const subj of SUBJECTS) {
      const subject = await upsertSubject({
        ...subj,
        majorCode: MAJOR_CODE,
        majorCodes: [MAJOR_CODE],
        teachers: teachers.map(t => t._id),
      });
      subjects.push(subject);
    }
    console.log(`   ✅ Created ${subjects.length} subjects`);

    // 6. Create curriculum
    console.log('\n📖 Creating curriculum...');
    const curriculum = await upsertCurriculum({
      code: `CURR_${MAJOR_CODE}_${COHORT}`,
      name: `Khung chương trình ${MAJOR_CODE} Khóa ${COHORT}`,
      major: MAJOR_CODE,
      academicYear: `${2020 + COHORT}-${2020 + COHORT + 4}`,
      status: 'active',
      useRelationalStructure: true,
    });
    console.log(`   ✅ Curriculum: ${curriculum.code}`);

    // 7. Create curriculum semester
    console.log('\n📗 Creating curriculum semester 1...');
    const curriculumSemester = await upsertCurriculumSemester({
      curriculum: curriculum._id,
      semesterOrder: 1,
      name: 'Học kỳ 1 - Năm 1',
      status: 'active',
    });
    console.log(`   ✅ CurriculumSemester: ${curriculumSemester.name}`);

    // 8. Link subjects to curriculum semester
    console.log('\n🔗 Linking subjects to curriculum semester...');
    for (const subject of subjects) {
      await upsertCurriculumCourse({
        semester: curriculumSemester._id,
        subject: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits,
        isRequired: true,
      });
    }
    console.log(`   ✅ Linked ${subjects.length} subjects`);

    // 9. Create class sections with classGroup
    console.log('\n🏫 Creating class sections with classGroup...');
    const classSections = [];
    let scheduleIndex = 0;

    for (let groupIndex = 0; groupIndex < CLASS_GROUPS.length; groupIndex++) {
      const classGroup = CLASS_GROUPS[groupIndex];

      for (let subjIndex = 0; subjIndex < subjects.length; subjIndex++) {
        const subject = subjects[subjIndex];
        const classCode = buildClassCode(subject.subjectCode, groupIndex);

        // Calculate schedule: each group on different day, same timeslot
        const dayOfWeek = SCHEDULE_CONFIG.dayOfWeek[subjIndex % SCHEDULE_CONFIG.dayOfWeek.length];
        const startPeriod = SCHEDULE_CONFIG.startPeriod[subjIndex % SCHEDULE_CONFIG.startPeriod.length];
        const endPeriod = SCHEDULE_CONFIG.endPeriod[subjIndex % SCHEDULE_CONFIG.endPeriod.length];
        const room = rooms[groupIndex % rooms.length];
        const timeslot = timeslots[subjIndex % timeslots.length];
        const teacher = teachers[(groupIndex * subjects.length + subjIndex) % teachers.length];

        const classSection = await upsertClassSection({
          classCode,
          className: `${subject.subjectName} - Nhóm ${groupIndex + 1}`,
          subject: subject._id,
          teacher: teacher._id,
          semester: SEMESTER_NUM,
          academicYear: ACADEMIC_YEAR,
          maxCapacity: STUDENTS_PER_GROUP,
          currentEnrollment: 0,
          status: 'published',
          room: room._id,
          timeslot: timeslot._id,
          dayOfWeek,
          startDate: semester.startDate,
          endDate: semester.endDate,
          classGroup,
          groupIndex,
        });

        classSections.push(classSection);
        scheduleIndex++;
      }

      console.log(`   ✅ Group ${classGroup}: ${subjects.length} class sections created`);
    }
    console.log(`   ✅ Total: ${classSections.length} class sections`);

    // 10. Create students
    console.log('\n👨‍🎓 Creating students...');
    const allStudents = [];

    for (let groupIndex = 0; groupIndex < CLASS_GROUPS.length; groupIndex++) {
      const classGroup = CLASS_GROUPS[groupIndex];

      for (let studentIndex = 0; studentIndex < STUDENTS_PER_GROUP; studentIndex++) {
        const studentCode = buildStudentCode(groupIndex, studentIndex);
        const email = buildStudentEmail(studentCode);

        // Create user account
        await upsertUser({
          email,
          fullName: `Sinh viên ${studentCode}`,
          role: 'student',
        });

        // Create student record
        const student = await upsertStudent({
          studentCode,
          fullName: `SV ${studentCode}`,
          email,
          majorCode: MAJOR_CODE,
          cohort: COHORT,
          enrollmentYear: 2020 + COHORT,
          classSection: classGroup, // This links student to classGroup!
          academicStatus: 'enrolled',
          isActive: true,
          curriculumId: curriculum._id,
          currentCurriculumSemester: 1,
        });

        allStudents.push(student);
      }

      console.log(`   ✅ Group ${classGroup}: ${STUDENTS_PER_GROUP} students created`);
    }
    console.log(`   ✅ Total: ${allStudents.length} students`);

    // 11. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLASSGROUP SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • Students: ${allStudents.length} (${STUDENTS_PER_GROUP} per group)`);
    console.log(`   • Class Groups: ${CLASS_GROUPS.join(', ')}`);
    console.log(`   • Subjects: ${subjects.length}`);
    console.log(`   • Class Sections: ${classSections.length} (4 groups × 6 subjects)`);
    console.log(`   • Curriculum: ${curriculum.code}`);
    console.log(`   • Semester: ${semester.code}`);

    console.log('\n📋 Class Sections by Group:');
    const sectionsByGroup = {};
    for (const cs of classSections) {
      if (!sectionsByGroup[cs.classGroup]) {
        sectionsByGroup[cs.classGroup] = [];
      }
      sectionsByGroup[cs.classGroup].push(cs.classCode);
    }
    for (const [group, codes] of Object.entries(sectionsByGroup)) {
      console.log(`   ${group}: ${codes.join(', ')}`);
    }

    console.log('\n🔐 Login Credentials:');
    console.log(`   Password for all users: ${PASSWORD}`);
    console.log(`   Example student: ${allStudents[0].studentCode}@fpt.edu.vn`);

    console.log('\n🧪 How to test:');
    console.log('   1. Login as admin');
    console.log('   2. Go to Auto Enrollment page');
    console.log('   3. Select semester: HK1-2025-2026');
    console.log('   4. Enter majorCodes: SE');
    console.log('   5. Click "Run Auto Enrollment"');
    console.log('   6. Verify each classGroup has ~45 students enrolled');

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Seed error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seed().catch(console.error);
