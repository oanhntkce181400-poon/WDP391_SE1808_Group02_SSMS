/**
 * seed-repeat-enrollment-test.js
 * =============================
 * Tạo dữ liệu test cho kịch bản:
 *   - SV rớt 1 môn ở Kỳ 1 (grade < 5.0)
 *   - Đang học Kỳ 2
 *   - Admin mở lớp học lại ở Kỳ 2
 *   - SV đăng ký học lại (pending payment)
 *   - Sau thanh toán mới xem được TKB
 *
 * Chạy: npm run seed:repeat-enrollment-test
 * Nếu chưa có script trong package.json, chạy trực tiếp:
 *   node scripts/seed-repeat-enrollment-test.js
 *
 * Tài khoản test:
 *   - Admin : admin@example.com / 123456
 *   - SV    : repeat-student@fpt.edu.vn / 123456
 *   - GV    : repeat-teacher@fpt.edu.vn / Teacher@123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { connectDB } = require('../src/configs/db.config');

// --- Models ---
const User = require('../src/models/user.model');
const Student = require('../src/models/student.model');
const Teacher = require('../src/models/teacher.model');
const Subject = require('../src/models/subject.model');
const Faculty = require('../src/models/faculty.model');
const Major = require('../src/models/major.model');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');
const CurriculumCourse = require('../src/models/curriculumCourse.model');
const Semester = require('../src/models/semester.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Payment = require('../src/models/payment.model');
const Wallet = require('../src/models/wallet.model');
const WalletTransaction = require('../src/models/walletTransaction.model');
const Schedule = require('../src/models/schedule.model');
const Room = require('../src/models/room.model');
const Timeslot = require('../src/models/timeslot.model');

// =====================================================================
// CẤU HÌNH TEST
// =====================================================================

const CFG = {
  // Học kỳ
  academicYear: '2025-2026',
  semester1: { num: 1, name: 'Kỳ 1 - 2025/2026', startDate: new Date('2026-01-05'), endDate: new Date('2026-05-31') },
  semester2: { num: 2, name: 'Kỳ 2 - 2025/2026', startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30') },

  // Curriculum
  curriculumCode: 'SEK26',
  curriculumName: 'Kỹ thuật phần mềm K26',
  majorCode: 'SE',
  majorName: 'Kỹ thuật phần mềm',
  facultyCode: 'CNTT',
  facultyName: 'Công nghệ thông tin',
  cohort: 26,
  // PHẢI khớp năm bắt đầu của học kỳ hệ thống đang dùng (2025-2026 → 2025).
  // Nếu để 2026 trong khi current semester là 2025-2026, BE tính resolveDisplayedCurriculumSemester = 1
  // → mọi môn Kỳ 2 bị coi là overload → Overload 3/2 và chặn đăng ký.
  enrollmentYear: 2025,

  // Môn học rớt (nằm ở Kỳ 1 trong khung CT)
  failedSubject: {
    subjectCode: 'SE101',
    subjectName: 'Lập trình Python cơ bản',
    credits: 3,
    tuitionFee: 300,
  },

  // Các môn khác trong Kỳ 1 (để SV có enrollment Kỳ 1)
  semester1Subjects: [
    { subjectCode: 'SE101', subjectName: 'Lập trình Python cơ bản', credits: 3 },
    { subjectCode: 'SE102', subjectName: 'Cấu trúc dữ liệu và giải thuật', credits: 4 },
    { subjectCode: 'MA101', subjectName: 'Toán rời rạc', credits: 3 },
    { subjectCode: 'EN101', subjectName: 'Tiếng Anh học thuật 1', credits: 3 },
  ],

  // Các môn Kỳ 2 (SV đang học)
  semester2Subjects: [
    { subjectCode: 'SE201', subjectName: 'Lập trình Web', credits: 3 },
    { subjectCode: 'SE202', subjectName: 'Cơ sở dữ liệu', credits: 4 },
    { subjectCode: 'MA201', subjectName: 'Xác suất thống kê', credits: 3 },
  ],

  // Timeslot mẫu
  timeslots: [
    { groupName: 'Ca 1', startTime: '07:00', endTime: '09:30', startPeriod: 1, endPeriod: 2 },
    { groupName: 'Ca 2', startTime: '09:30', endTime: '12:00', startPeriod: 3, endPeriod: 4 },
    { groupName: 'Ca 3', startTime: '13:00', endTime: '15:30', startPeriod: 5, endPeriod: 6 },
    { groupName: 'Ca 4', startTime: '15:30', endTime: '18:00', startPeriod: 7, endPeriod: 8 },
  ],

  // Phòng mẫu
  rooms: [
    { roomCode: 'A101', roomName: 'Phòng A101', roomType: 'Lecture', capacity: 50 },
    { roomCode: 'A102', roomName: 'Phòng A102', roomType: 'Lecture', capacity: 50 },
    { roomCode: 'A103', roomName: 'Phòng A103', roomType: 'Lab', capacity: 40 },
  ],
};

// =====================================================================
// HELPERS
// =====================================================================

async function upsertUser(email, password, fullName, role = 'student') {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        email,
        password: passwordHash,
        fullName,
        role,
        authProvider: 'local',
        isActive: true,
        status: 'active',
        mustChangePassword: false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function ensureWallet(userId, initialBalance = 10000) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      balance: initialBalance,
      totalEarned: initialBalance,
      totalSpent: 0,
      status: 'active',
    });
  } else if (wallet.balance < initialBalance) {
    // Nạp thêm tiền cho đủ
    wallet.balance = initialBalance;
    wallet.totalEarned = initialBalance;
    await wallet.save();
  }
  return wallet;
}

async function cleanCollections() {
  const collections = [
    WalletTransaction,
    Wallet,
    Payment,
    RegistrationPeriod,
    ClassEnrollment,
    Schedule,
    ClassSection,
    CurriculumCourse,
    CurriculumSemester,
    Student,
    Teacher,
    Subject,
    Curriculum,
    Major,
    Faculty,
    User,
    Timeslot,
    Room,
  ];
  for (const Col of collections) {
    await Col.deleteMany({});
  }
  console.log('  ✅ Đã clean collections');
}

// =====================================================================
// SEED STEPS
// =====================================================================

async function seedStep1_FacultyMajor() {
  console.log('\n📋 STEP 1: Faculty & Major');
  const faculty = await Faculty.create({
    facultyCode: CFG.facultyCode,
    facultyName: CFG.facultyName,
    isActive: true,
  });
  console.log(`   ✅ Faculty: ${CFG.facultyCode}`);

  const major = await Major.create({
    majorCode: CFG.majorCode,
    majorName: CFG.majorName,
    faculty: faculty._id,
    isActive: true,
  });
  console.log(`   ✅ Major: ${CFG.majorCode} (${CFG.majorName})`);

  return { faculty, major };
}

async function seedStep2_Curriculum(major) {
  console.log('\n📋 STEP 2: Curriculum SEK26');
  const curriculum = await Curriculum.create({
    code: CFG.curriculumCode,
    name: CFG.curriculumName,
    major: CFG.majorName,
    majorId: major._id,
    academicYear: `${CFG.enrollmentYear}-${CFG.enrollmentYear + 1}`,
    version: 1,
    status: 'active',
    totalCredits: 0,
    totalCourses: 0,
    useRelationalStructure: true,
  });
  console.log(`   ✅ Curriculum: ${CFG.curriculumCode}`);

  // Tạo CurriculumSemester Kỳ 1 và Kỳ 2
  const sem1 = await CurriculumSemester.create({
    curriculum: curriculum._id,
    name: 'Học kỳ 1',
    semesterOrder: 1,
    credits: CFG.semester1Subjects.reduce((s, c) => s + c.credits, 0),
    startDate: CFG.semester1.startDate,
    endDate: CFG.semester1.endDate,
  });
  console.log(`   ✅ CurriculumSemester Kỳ 1 (startDate: ${CFG.semester1.startDate.toISOString().slice(0,10)})`);

  const sem2 = await CurriculumSemester.create({
    curriculum: curriculum._id,
    name: 'Học kỳ 2',
    semesterOrder: 2,
    credits: CFG.semester2Subjects.reduce((s, c) => s + c.credits, 0),
    startDate: CFG.semester2.startDate,
    endDate: CFG.semester2.endDate,
  });
  console.log(`   ✅ CurriculumSemester Kỳ 2 (startDate: ${CFG.semester2.startDate.toISOString().slice(0,10)})`);

  // Gắn môn vào Kỳ 1
  const allSubjects = [...CFG.semester1Subjects, ...CFG.semester2Subjects];
  const subjectMap = {};

  for (const sub of allSubjects) {
    let subject = await Subject.findOne({ subjectCode: sub.subjectCode });
    if (!subject) {
      subject = await Subject.create({
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits,
        tuitionFee: sub.credits * 100,
        majorCode: CFG.majorCode,
      });
    }
    subjectMap[sub.subjectCode] = subject;
    console.log(`   ✅ Subject: ${sub.subjectCode} - ${sub.subjectName} (${sub.credits} TC)`);
  }

  // CurriculumCourse cho Kỳ 1
  for (const sub of CFG.semester1Subjects) {
    await CurriculumCourse.create({
      semester: sem1._id,
      subject: subjectMap[sub.subjectCode]._id,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      credits: sub.credits,
      hasPrerequisite: false,
    });
  }

  // CurriculumCourse cho Kỳ 2
  for (const sub of CFG.semester2Subjects) {
    await CurriculumCourse.create({
      semester: sem2._id,
      subject: subjectMap[sub.subjectCode]._id,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      credits: sub.credits,
      hasPrerequisite: false,
    });
  }

  console.log(`   ✅ CurriculumCourses: ${CFG.semester1Subjects.length} môn Kỳ 1, ${CFG.semester2Subjects.length} môn Kỳ 2`);

  return { curriculum, sem1, sem2, subjectMap };
}

async function seedStep3_Semesters() {
  console.log('\n📋 STEP 3: Học kỳ hệ thống (Semester)');

  // Kỳ 1 - đã hoàn thành
  const sem1 = await Semester.findOneAndUpdate(
    { code: `${CFG.academicYear}_1` },
    {
      $set: {
        name: CFG.semester1.name,
        semesterType: 'regular',
        semesterNum: CFG.semester1.num,
        academicYear: CFG.academicYear,
        startDate: CFG.semester1.startDate,
        endDate: CFG.semester1.endDate,
        isCurrent: false,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`   ✅ Semester Kỳ 1: ${sem1.code} (${CFG.semester1.startDate.toISOString().slice(0,10)} → ${CFG.semester1.endDate.toISOString().slice(0,10)})`);

  // Kỳ 2 - hiện tại
  const sem2 = await Semester.findOneAndUpdate(
    { code: `${CFG.academicYear}_2` },
    {
      $set: {
        name: CFG.semester2.name,
        semesterType: 'regular',
        semesterNum: CFG.semester2.num,
        academicYear: CFG.academicYear,
        startDate: CFG.semester2.startDate,
        endDate: CFG.semester2.endDate,
        isCurrent: true,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`   ✅ Semester Kỳ 2: ${sem2.code} (isCurrent: true, startDate: ${CFG.semester2.startDate.toISOString().slice(0,10)})`);

  return { sem1, sem2 };
}

async function seedStep4_Teacher() {
  console.log('\n📋 STEP 4: Giảng viên');
  const user = await upsertUser('repeat-teacher@fpt.edu.vn', 'Teacher@123', 'Th.S Nguyễn Văn Giảng', 'lecturer');
  const teacher = await Teacher.create({
    teacherCode: 'GVREPEAT',
    fullName: 'Th.S Nguyễn Văn Giảng',
    email: 'repeat-teacher@fpt.edu.vn',
    department: CFG.majorName,
    specialization: CFG.majorName,
    degree: 'masters',
    userId: user._id,
    isActive: true,
  });
  console.log(`   ✅ Teacher: GVREPEAT - Nguyễn Văn Giảng`);
  console.log(`   📧 Email: repeat-teacher@fpt.edu.vn / Teacher@123`);

  return { teacher };
}

async function seedStep5_Student(curriculum) {
  console.log('\n📋 STEP 5: Sinh viên test');
  const user = await upsertUser('repeat-student@fpt.edu.vn', '123456', 'Nguyễn Văn Rớt', 'student');

  const student = await Student.create({
    studentCode: 'SE260001',
    fullName: 'Nguyễn Văn Rớt',
    email: 'repeat-student@fpt.edu.vn',
    majorCode: CFG.majorCode,
    majorId: curriculum.majorId,
    cohort: CFG.cohort,
    enrollmentYear: CFG.enrollmentYear,
    curriculumId: curriculum._id,
    currentCurriculumSemester: 2, // Đang học Kỳ 2
    academicStatus: 'enrolled',
    classSection: 'SE2601',
    userId: user._id,
    isActive: true,
  });
  console.log(`   ✅ Student: SE260001 - Nguyễn Văn Rớt`);
  console.log(`   📧 Email: repeat-student@fpt.edu.vn / 123456`);
  console.log(`   📌 Cohort: K${CFG.cohort}, enrollmentYear: ${CFG.enrollmentYear}, Curriculum: ${CFG.curriculumCode}, currentSemester: 2`);

  // Tạo ví với số dư đủ thanh toán
  const wallet = await ensureWallet(user._id, 10000);
  console.log(`   ✅ Wallet: balance = ${wallet.balance} VNĐ`);

  return { student, user, wallet };
}

async function seedStep6_ClassSections(curriculum, teacher, semester1, semester2, subjectMap) {
  console.log('\n📋 STEP 6: ClassSection (lớp học phần)');

  // --- Kỳ 1: Tạo lớp cho tất cả môn Kỳ 1 ---
  const classSem1 = {};
  const timeslot1 = await Timeslot.findOne({ groupName: 'Ca 1' });
  const room1 = await Room.findOne({ roomCode: 'A101' });

  for (const sub of CFG.semester1Subjects) {
    const classCode = `${sub.subjectCode}-K${CFG.cohort}-01`;
    const cls = await ClassSection.create({
      classCode,
      className: `${sub.subjectCode} - ${sub.subjectName}`,
      subject: subjectMap[sub.subjectCode]._id,
      teacher: teacher._id,
      room: room1 ? room1._id : undefined,
      timeslot: timeslot1 ? timeslot1._id : undefined,
      semester: semester1.semesterNum,
      academicYear: CFG.academicYear,
      maxCapacity: 50,
      currentEnrollment: 0,
      status: 'completed',
      classGroup: `SE${CFG.cohort}01`,
      groupIndex: 0,
      curriculum: curriculum._id,
      curriculumSemesterOrder: 1,
      startDate: semester1.startDate,
      endDate: semester1.endDate,
      dayOfWeek: 2, // Thứ 3
    });
    classSem1[sub.subjectCode] = cls;
    console.log(`   ✅ Class Kỳ 1: ${classCode} (status: completed)`);
  }

  // --- Kỳ 1: Tạo Enrollment RỚT cho SE101 ---
  const failedSubject = subjectMap[CFG.failedSubject.subjectCode];
  const classFailedSem1 = classSem1[CFG.failedSubject.subjectCode];

  const enrollmentFailed = await ClassEnrollment.create({
    classSection: classFailedSem1._id,
    student: (await Student.findOne({ studentCode: 'SE260001' }))._id,
    status: 'completed',
    midtermScore: 3.0,
    finalScore: 2.5,
    assignmentScore: 3.5,
    grade: 3.0, // < 5.0 → RỚT
    isFinalized: true,
  });
  console.log(`   ✅ ClassEnrollment RỚT: SE101, grade = 3.0 (< 5.0)`);

  // --- Kỳ 1: Tạo Enrollment PASS cho các môn khác ---
  const student = await Student.findOne({ studentCode: 'SE260001' });
  for (const sub of CFG.semester1Subjects) {
    if (sub.subjectCode === CFG.failedSubject.subjectCode) continue;
    const cls = classSem1[sub.subjectCode];
    await ClassEnrollment.create({
      classSection: cls._id,
      student: student._id,
      status: 'completed',
      midtermScore: 7.0,
      finalScore: 7.5,
      assignmentScore: 8.0,
      grade: 7.5,
      isFinalized: true,
    });
  }
  console.log(`   ✅ ClassEnrollment PASS: ${CFG.semester1Subjects.length - 1} môn còn lại Kỳ 1 (grade ~7.5)`);

  // --- Kỳ 2: Tạo lớp cho môn Kỳ 2 (KHÁC ca / khác thứ → tránh Schedule conflict) ---
  const k2Layout = [
    { timeslotGroup: 'Ca 2', dayOfWeek: 2, roomCode: 'A102' },
    { timeslotGroup: 'Ca 3', dayOfWeek: 3, roomCode: 'A102' },
    { timeslotGroup: 'Ca 4', dayOfWeek: 4, roomCode: 'A103' },
  ];

  for (let i = 0; i < CFG.semester2Subjects.length; i += 1) {
    const sub = CFG.semester2Subjects[i];
    const layout = k2Layout[i] || k2Layout[0];
    const ts = await Timeslot.findOne({ groupName: layout.timeslotGroup });
    const roomDoc = await Room.findOne({ roomCode: layout.roomCode });

    const classCode = `${sub.subjectCode}-K${CFG.cohort}-01`;
    const cls = await ClassSection.create({
      classCode,
      className: `${sub.subjectCode} - ${sub.subjectName}`,
      subject: subjectMap[sub.subjectCode]._id,
      teacher: teacher._id,
      room: roomDoc ? roomDoc._id : undefined,
      timeslot: ts ? ts._id : undefined,
      semester: semester2.semesterNum,
      academicYear: CFG.academicYear,
      maxCapacity: 50,
      currentEnrollment: 0,
      status: 'published',
      classGroup: `SE${CFG.cohort}01`,
      groupIndex: 0,
      curriculum: curriculum._id,
      curriculumSemesterOrder: 2,
      startDate: semester2.startDate,
      endDate: semester2.endDate,
      dayOfWeek: layout.dayOfWeek,
    });
    console.log(
      `   ✅ Class Kỳ 2: ${classCode} (status: published, ${layout.timeslotGroup}, thứ ${layout.dayOfWeek})`,
    );

    if (ts && roomDoc) {
      await Schedule.create({
        classSection: cls._id,
        room: roomDoc._id,
        dayOfWeek: layout.dayOfWeek,
        startPeriod: ts.startPeriod,
        endPeriod: ts.endPeriod,
        startDate: semester2.startDate,
        endDate: semester2.endDate,
        status: 'active',
      });
    }

    // Enrollment Kỳ 2 (SV đang học)
    await ClassEnrollment.create({
      classSection: cls._id,
      student: student._id,
      status: 'enrolled',
    });
    cls.currentEnrollment += 1;
    await cls.save();
  }
  console.log(`   ✅ ${CFG.semester2Subjects.length} ClassEnrollment Kỳ 2 cho SE260001 (enrolled)`);

  // --- Kỳ 2: Tạo lớp HỌC LẠI cho SE101 (ca/phòng khác 3 lớp Kỳ 2) ---
  const repeatTimeslot = await Timeslot.findOne({ groupName: 'Ca 1' });
  const repeatRoom = await Room.findOne({ roomCode: 'A101' });
  const repeatClassCode = `${CFG.failedSubject.subjectCode}-K${CFG.cohort}-R1`;
  const repeatClass = await ClassSection.create({
    classCode: repeatClassCode,
    className: `${CFG.failedSubject.subjectCode} - Học lại`,
    subject: failedSubject._id,
    teacher: teacher._id,
    room: repeatRoom ? repeatRoom._id : undefined,
    timeslot: repeatTimeslot ? repeatTimeslot._id : undefined,
    semester: semester2.semesterNum,
    academicYear: CFG.academicYear,
    maxCapacity: 30,
    currentEnrollment: 0,
    status: 'published', // Mở cho SV đăng ký
    classGroup: `SE${CFG.cohort}01`,
    groupIndex: 0,
    curriculum: curriculum._id,
    curriculumSemesterOrder: 1, // Môn này thuộc Kỳ 1 trong khung
    startDate: semester2.startDate,
    endDate: semester2.endDate,
    dayOfWeek: 5, // Thứ 6 — không trùng thứ 2–4 của Kỳ 2
  });
  console.log(`   ✅ Class HỌC LẠI: ${repeatClassCode} (status: published, maxCapacity: 30)`);

  return { repeatClass, repeatTimeslot, repeatRoom, classSem1, failedSubject, classFailedSem1 };
}

async function seedStep7_RegistrationPeriod(semester2) {
  console.log('\n📋 STEP 7: RegistrationPeriod (đợt đăng ký học lại)');

  // QUAN TRỌNG: isRegistrationOpen() bắt buộc startDate <= now <= endDate (theo server).
  // Không gắn theo ngày bắt đầu HK trong CFG (vd 1/6/2026) — nếu "hôm nay" là 3/2026 thì không có đợt nào khớp.
  const now = Date.now();
  const startDate = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now + 120 * 24 * 60 * 60 * 1000);

  const period = await RegistrationPeriod.create({
    periodName: `Đăng ký học lại Kỳ 2 ${CFG.academicYear}`,
    requestType: 'repeat',
    semester: semester2._id,
    startDate,
    endDate,
    allowedCohorts: [CFG.cohort],
    status: 'active',
  });
  console.log(`   ✅ RegistrationPeriod: ${period.periodName}`);
  console.log(`   📌 requestType: repeat, allowedCohorts: K${CFG.cohort}, status: active`);
  console.log(`   📌 Mở đăng ký (theo ngày chạy seed): ${period.startDate.toISOString().slice(0,10)} → ${period.endDate.toISOString().slice(0,10)}`);

  return period;
}

async function seedStep8_Schedule(repeatClass, semester2, repeatTimeslot, repeatRoom) {
  console.log('\n📋 STEP 8: Schedule (lịch học cho lớp học lại)');

  if (repeatTimeslot && repeatRoom) {
    await Schedule.create({
      classSection: repeatClass._id,
      room: repeatRoom._id,
      dayOfWeek: 5, // khớp ClassSection.repeat
      startPeriod: repeatTimeslot.startPeriod,
      endPeriod: repeatTimeslot.endPeriod,
      startDate: semester2.startDate,
      endDate: semester2.endDate,
      status: 'active',
    });
    console.log(
      `   ✅ Schedule học lại: Thứ 6, Ca ${repeatTimeslot.startPeriod}-${repeatTimeslot.endPeriod}, Phòng ${repeatRoom.roomCode}`,
    );
  } else {
    console.log('   ⚠️ Bỏ qua Schedule học lại (chưa có Timeslot/Room)');
  }
}

async function seedStep9_PendingPayment(student) {
  console.log('\n📋 STEP 9: Payment PENDING (chưa thanh toán Kỳ 2)');

  const paymentCode = `K2_${CFG.curriculumCode}`;

  const payment = await Payment.create({
    student: student._id,
    semesterCode: paymentCode,
    amount: 0, // Chưa thanh toán
    status: 'pending',
    method: 'bank_transfer',
    note: 'Chờ thanh toán - SV chưa nộp học phí Kỳ 2',
  });
  console.log(`   ✅ Payment PENDING: ${paymentCode} (status: pending)`);
  console.log(`   ⚠️ SV chưa thanh toán → Thời khóa biểu bị BLOCK`);

  return payment;
}

async function seedStep10_Admin() {
  console.log('\n📋 STEP 10: Admin account');
  await upsertUser('admin@example.com', '123456', 'System Admin', 'admin');
  console.log(`   ✅ Admin: admin@example.com / 123456`);
}

// =====================================================================
// MAIN
// =====================================================================

async function seed() {
  console.log('='.repeat(70));
  console.log('🔧 SEED: Repeat Enrollment Test Scenario');
  console.log('='.repeat(70));
  console.log('\n🎯 Kịch bản:');
  console.log('   1. SV Nguyễn Văn Rớt rớt SE101 (grade=3.0) ở Kỳ 1');
  console.log('   2. SV đang học Kỳ 2 (currentSemester=2)');
  console.log('   3. Admin mở lớp học lại SE101 ở Kỳ 2 (published)');
  console.log('   4. SV đăng ký học lại SE101 → enrollment (enrolled)');
  console.log('   5. SV CHƯA thanh toán Kỳ 2 → TKB bị BLOCK');
  console.log('   6. Sau khi thanh toán → xem được TKB');
  console.log('');

  await connectDB();
  await cleanCollections();

  // Seed Timeslot & Room trước (cần cho ClassSection)
  console.log('\n📋 SETUP: Timeslots & Rooms');
  for (const ts of CFG.timeslots) {
    await Timeslot.findOneAndUpdate(
      { groupName: ts.groupName },
      { $setOnInsert: ts },
      { new: true, upsert: true },
    );
  }
  for (const rm of CFG.rooms) {
    await Room.findOneAndUpdate(
      { roomCode: rm.roomCode },
      { $setOnInsert: rm },
      { new: true, upsert: true },
    );
  }
  console.log(`   ✅ ${CFG.timeslots.length} Timeslots, ${CFG.rooms.length} Rooms`);

  const { major } = await seedStep1_FacultyMajor();
  const { curriculum, sem1, sem2, subjectMap } = await seedStep2_Curriculum(major);
  const { sem1: semester1, sem2: semester2 } = await seedStep3_Semesters();
  const { teacher } = await seedStep4_Teacher();
  const { student, wallet } = await seedStep5_Student(curriculum);

  const { repeatClass, repeatTimeslot, repeatRoom } = await seedStep6_ClassSections(
    curriculum, teacher,
    { semesterNum: semester1.semesterNum, startDate: semester1.startDate, endDate: semester1.endDate },
    { semesterNum: semester2.semesterNum, startDate: semester2.startDate, endDate: semester2.endDate },
    subjectMap,
  );
  const period = await seedStep7_RegistrationPeriod(semester2);
  await seedStep8_Schedule(repeatClass, semester2, repeatTimeslot, repeatRoom);
  const payment = await seedStep9_PendingPayment(student);
  await seedStep10_Admin();

  // =====================================================================
  // TÓM TẮT
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('✅ SEED HOÀN TẤT!');
  console.log('='.repeat(70));
  console.log('\n📊 Dữ liệu đã tạo:');
  console.log(`   • Faculty      : ${CFG.facultyCode} - ${CFG.facultyName}`);
  console.log(`   • Major        : ${CFG.majorCode} - ${CFG.majorName}`);
  console.log(`   • Curriculum   : ${CFG.curriculumCode}`);
  console.log(`   • Semester Kỳ 1: ${semester1.code} (${semester1.startDate.toISOString().slice(0,10)} → completed)`);
  console.log(`   • Semester Kỳ 2: ${semester2.code} (${semester2.startDate.toISOString().slice(0,10)} → isCurrent)`);
  console.log(`   • CurriculumSemester Kỳ 1 startDate: ${CFG.semester1.startDate.toISOString().slice(0,10)}`);
  console.log(`   • CurriculumSemester Kỳ 2 startDate: ${CFG.semester2.startDate.toISOString().slice(0,10)}`);
  console.log(`   • Môn rớt      : ${CFG.failedSubject.subjectCode} (grade=3.0, < 5.0)`);
  console.log(`   • Lớp học lại  : ${repeatClass.classCode} (status: published)`);
  console.log(`   • RegistrationPeriod: requestType=repeat, status=active`);
  console.log(`   • Payment Kỳ 2 : ${payment.semesterCode} (status: PENDING → chưa thanh toán)`);
  console.log(`   • Wallet balance: ${wallet.balance} VNĐ`);

  console.log('\n🔐 Tài khoản test:');
  console.log(`   Admin : admin@example.com        / 123456`);
  console.log(`   SV     : repeat-student@fpt.edu.vn / 123456`);
  console.log(`   GV     : repeat-teacher@fpt.edu.vn / Teacher@123`);

  console.log('\n📌 Cách test:');
  console.log('   1. Đăng nhập SV repeat-student@fpt.edu.vn');
  console.log('   2. Vào trang Đăng ký học phần (Registration)');
  console.log('   3. Tìm lớp học lại SE101-K26-R1 → Đăng ký');
  console.log('   4. Vào trang Thời khóa biểu → THẤY BANNER BLOCK (chưa thanh toán)');
  console.log('   5. Vào trang Tài chính → Thanh toán Kỳ 2');
  console.log('   6. Quay lại Thời khóa biểu → XEM ĐƯỢC TKB');

  console.log('\n💡 Lưu ý về deadline thanh toán:');
  console.log(`   Kỳ 2 bắt đầu : ${CFG.semester2.startDate.toISOString().slice(0,10)}`);
  console.log(`   Deadline (-7d): ${new Date(CFG.semester2.startDate.getTime() - 7 * 86400000).toISOString().slice(0,10)}`);
  console.log('   Nếu test sau ngày trên → hệ thống sẽ BLOCK ngay lập tức');
  console.log('');
}

seed()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ SEED FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
