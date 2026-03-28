/**
 * seed-NguyenVanRot.js
 * ======================
 * Tạo đầy đủ khung chương trình SEK25 + sinh viên "Nguyễn Văn Rớt".
 *
 * Kịch bản:
 *   • SV nhập học K25 (2025), khung chương trình SEK25 (2025-2026 → 2029-2030)
 *   • Rớt SE101 ở Học kỳ 1 (grade = 3.5 < 5.0)
 *   • Đang học Học kỳ 2 với 4 môn Kỳ 2 + lớp học lại SE101
 *   • Chưa thanh toán học phí → TKB bị BLOCK
 *
 * Đặc điểm:
 *   • Hoàn toàn idempotent — chạy lại nhiều lần không ảnh hưởng dữ liệu khác.
 *   • KHÔNG xóa collection nào (giữ nguyên SEK26 và dữ liệu hiện có).
 *   • Tự tạo SEK25 curriculum + subject + CurriculumSemester + CurriculumCourse.
 *
 * Chạy:  node scripts/seed-NguyenVanRot.js
 *         npm run seed:nguyen-van-rot
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { connectDB } = require('../src/configs/db.config');

// --- Models ---
const User = require('../src/models/user.model');
const Student = require('../src/models/student.model');
const Major = require('../src/models/major.model');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');
const CurriculumCourse = require('../src/models/curriculumCourse.model');
const Semester = require('../src/models/semester.model');
const Subject = require('../src/models/subject.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const Schedule = require('../src/models/schedule.model');
const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Payment = require('../src/models/payment.model');
const Wallet = require('../src/models/wallet.model');
const Timeslot = require('../src/models/timeslot.model');
const Room = require('../src/models/room.model');
const Teacher = require('../src/models/teacher.model');

// =====================================================================
// CẤU HÌNH
// =====================================================================

const CFG = {
  // --- Sinh viên ---
  studentCode: 'SE250001',
  studentName: 'Nguyễn Văn Rớt',
  email: 'rot.se250001@fpt.edu.vn',
  password: 'Rot@123456',

  // --- Cohort / năm nhập học
  cohort: 25,
  enrollmentYear: 2025,       // nhập học năm 2025 → K25

  // --- Chương trình — SEK25 RIÊNG (không dùng SEK26)
  curriculumCode: 'SEK25',
  majorCode: 'SE',

  // --- Môn bị rớt → nằm ở Học kỳ 1 trong khung SEK25
  failedSubjectCode: 'SE101',
  semester1Grade: 3.5,        // < 5.0 → rớt

  // --- Học kỳ hiện tại: Kỳ 2 (2025-2026_2)
  currentSemesterCode: '2025-2026_2',

  /** Đơn giá / tín chỉ (VNĐ) — Subject.tuitionFee = credits × giá này */
  pricePerCreditVnd: 100,
};

// =====================================================================
// DANH SÁCH MÔN HỌC SEK25 (9 học kỳ, 27 môn)
// =====================================================================

/**
 * Mỗi học kỳ 4 tháng. Kỳ 1 bắt đầu 01/09/2025.
 * HK1: 01/09/2025 → 31/12/2025
 * HK2: 01/01/2026 → 30/04/2026
 * HK3: 01/05/2026 → 30/08/2026
 * HK4: 01/09/2026 → 31/12/2026
 * ...
 */
const SEK25_SUBJECTS = [
  // HỌC KỲ 1 (01/09/2025 – 31/12/2025)
  { subjectCode: 'SE101', subjectName: 'Nhập môn Kỹ thuật phần mềm',  credits: 3, suggestedSemester: 1, teacherCode: 'GVK26001' },
  { subjectCode: 'SE102', subjectName: 'Lập trình cơ bản',             credits: 4, suggestedSemester: 1, teacherCode: 'GVK26002' },
  { subjectCode: 'SE103', subjectName: 'Toán rời rạc',                 credits: 3, suggestedSemester: 1, teacherCode: 'GVK26003' },
  { subjectCode: 'SE104', subjectName: 'Triết học đại cương',          credits: 2, suggestedSemester: 1, teacherCode: 'GVK26001' },
  // HỌC KỲ 2 (01/01/2026 – 30/04/2026)
  { subjectCode: 'SE201', subjectName: 'Cấu trúc dữ liệu',             credits: 4, suggestedSemester: 2, teacherCode: 'GVK26002' },
  { subjectCode: 'SE202', subjectName: 'Kiến trúc máy tính',           credits: 3, suggestedSemester: 2, teacherCode: 'GVK26003' },
  { subjectCode: 'SE203', subjectName: 'Tiếng Anh chuyên ngành 1',     credits: 2, suggestedSemester: 2, teacherCode: 'GVK26001' },
  { subjectCode: 'SE204', subjectName: 'Giáo dục thể chất',           credits: 1, suggestedSemester: 2, teacherCode: 'GVK26010' },
  // HỌC KỲ 3
  { subjectCode: 'SE301', subjectName: 'Lập trình hướng đối tượng',   credits: 4, suggestedSemester: 3, teacherCode: 'GVK26002', prerequisites: ['SE102'] },
  { subjectCode: 'SE302', subjectName: 'Cơ sở dữ liệu',               credits: 3, suggestedSemester: 3, teacherCode: 'GVK26005', prerequisites: ['SE201'] },
  { subjectCode: 'SE303', subjectName: 'Mạng máy tính',               credits: 3, suggestedSemester: 3, teacherCode: 'GVK26006', prerequisites: ['SE202'] },
  // HỌC KỲ 4
  { subjectCode: 'SE401', subjectName: 'Phân tích thiết kế hệ thống', credits: 3, suggestedSemester: 4, teacherCode: 'GVK26001', prerequisites: ['SE301'] },
  { subjectCode: 'SE402', subjectName: 'Phát triển Web',              credits: 3, suggestedSemester: 4, teacherCode: 'GVK26008', prerequisites: ['SE301'] },
  { subjectCode: 'SE403', subjectName: 'Kiểm thử phần mềm',           credits: 3, suggestedSemester: 4, teacherCode: 'GVK26010', prerequisites: ['SE301'] },
  { subjectCode: 'SE404', subjectName: 'Tiếng Anh chuyên ngành 2',     credits: 2, suggestedSemester: 4, teacherCode: 'GVK26001', prerequisites: ['SE203'] },
  // HỌC KỲ 5
  { subjectCode: 'SE501', subjectName: 'Kiến trúc phần mềm',          credits: 3, suggestedSemester: 5, teacherCode: 'GVK26001', prerequisites: ['SE401'] },
  { subjectCode: 'SE502', subjectName: 'Phát triển ứng dụng di động', credits: 3, suggestedSemester: 5, teacherCode: 'GVK26002', prerequisites: ['SE301'] },
  { subjectCode: 'SE503', subjectName: 'Lập trình Backend',            credits: 3, suggestedSemester: 5, teacherCode: 'GVK26008', prerequisites: ['SE402'] },
  // HỌC KỲ 6
  { subjectCode: 'SE601', subjectName: 'DevOps',                      credits: 3, suggestedSemester: 6, teacherCode: 'GVK26009', prerequisites: ['SE503'] },
  { subjectCode: 'SE602', subjectName: 'Điện toán đám mây',           credits: 3, suggestedSemester: 6, teacherCode: 'GVK26009', prerequisites: ['SE501'] },
  { subjectCode: 'SE603', subjectName: 'Bảo mật ứng dụng',            credits: 3, suggestedSemester: 6, teacherCode: 'GVK26007', prerequisites: ['SE303'] },
  // HỌC KỲ 7
  { subjectCode: 'SE701', subjectName: 'Quản lý dự án phần mềm',      credits: 3, suggestedSemester: 7, teacherCode: 'GVK26001', prerequisites: ['SE401'] },
  { subjectCode: 'SE702', subjectName: 'Kiến trúc Microservices',     credits: 3, suggestedSemester: 7, teacherCode: 'GVK26008', prerequisites: ['SE501'] },
  { subjectCode: 'SE703', subjectName: 'Học máy cho phần mềm',        credits: 3, suggestedSemester: 7, teacherCode: 'GVK26003', prerequisites: ['SE201', 'SE103'] },
  // HỌC KỲ 8
  { subjectCode: 'SE801', subjectName: 'Thực tập doanh nghiệp',       credits: 4, suggestedSemester: 8, teacherCode: 'GVK26001', prerequisites: ['SE701'] },
  { subjectCode: 'SE802', subjectName: 'Đề xuất đồ án',               credits: 2, suggestedSemester: 8, teacherCode: 'GVK26001', prerequisites: ['SE703'] },
  // HỌC KỲ 9
  { subjectCode: 'SE901', subjectName: 'Đồ án tốt nghiệp',            credits: 6, suggestedSemester: 9, teacherCode: 'GVK26001', prerequisites: ['SE801'] },
];

// =====================================================================
// HELPERS
// =====================================================================

function dateUtcNoon(y, month, day) {
  return new Date(Date.UTC(y, month - 1, day, 12, 0, 0));
}

function buildCurriculumSemesterWindows(startDate) {
  const windows = [];
  const MONTHS = 4;
  let cur = new Date(startDate);
  for (let i = 0; i < 9; i++) {
    const next = new Date(cur);
    next.setUTCMonth(next.getUTCMonth() + MONTHS);
    const end = new Date(next.getTime() - 86400000);
    windows.push({ startDate: cur, endDate: end });
    cur = next;
  }
  return windows;
}

function formatYmd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

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

/** Đủ trừ học phí học lại (SE101 ~ 3×350k) + dư; tránh chặn “Insufficient balance” khi demo */
async function ensureWallet(userId, initialBalance = 5_000_000) {
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
    wallet.balance = initialBalance;
    wallet.totalEarned = initialBalance;
    await wallet.save();
  }
  return wallet;
}

// =====================================================================
// SEED STEPS
// =====================================================================

async function seedStep0_Major() {
  console.log('\n📋 STEP 0: Major (tìm SE)');
  const major = await Major.findOne({ majorCode: CFG.majorCode });
  if (!major) {
    throw new Error(`Major ${CFG.majorCode} không tồn tại — chạy seedFacultiesAndMajors.js trước.`);
  }
  console.log(`   ✅ Major: ${major.majorCode} — ${major.majorName}`);
  return major;
}

async function seedStep1_Curriculum(major) {
  console.log('\n📋 STEP 1: Curriculum SEK25 (RIÊNG cho K25)');

  // Xóa curriculum SEK25 cũ nếu có (để seed sạch sẽ)
  const oldCurriculum = await Curriculum.findOne({ code: CFG.curriculumCode });
  if (oldCurriculum) {
    await CurriculumCourse.deleteMany({ semester: { $in: await CurriculumSemester.find({ curriculum: oldCurriculum._id }).distinct('_id') } });
    await CurriculumSemester.deleteMany({ curriculum: oldCurriculum._id });
    await Curriculum.deleteOne({ _id: oldCurriculum._id });
    console.log('   🗑️  Đã xóa SEK25 cũ (nếu có)');
  }

  const totalCredits = SEK25_SUBJECTS.reduce((s, sub) => s + sub.credits, 0);
  const curriculum = await Curriculum.create({
    code: CFG.curriculumCode,
    name: `Kỹ thuật phần mềm Khóa ${CFG.cohort} (SEK25)`,
    major: 'Kỹ thuật phần mềm',
    majorId: major._id,
    academicYear: `${CFG.enrollmentYear}-${CFG.enrollmentYear + 1}`,
    version: 1,
    status: 'active',
    totalCredits,
    totalCourses: SEK25_SUBJECTS.length,
    useRelationalStructure: true,
  });
  console.log(`   ✅ Curriculum SEK25: ${totalCredits} TC, ${SEK25_SUBJECTS.length} môn`);
  console.log(`   📌 academicYear: ${CFG.enrollmentYear}-${CFG.enrollmentYear + 1}`);

  // CurriculumSemester (9 kỳ)
  const semStartDate = dateUtcNoon(CFG.enrollmentYear, 9, 1); // 01/09/2025
  const windows = buildCurriculumSemesterWindows(semStartDate);
  const semesterMap = {};

  for (let i = 1; i <= 9; i++) {
    const subs = SEK25_SUBJECTS.filter(s => s.suggestedSemester === i);
    const credits = subs.reduce((s, sub) => s + sub.credits, 0);
    const win = windows[i - 1];

    const cs = await CurriculumSemester.create({
      curriculum: curriculum._id,
      name: `Học kỳ ${i}`,
      semesterOrder: i,
      credits,
      startDate: win.startDate,
      endDate: win.endDate,
    });
    semesterMap[i] = cs;
    console.log(
      `   ✅ HK${i}: ${formatYmd(win.startDate)} → ${formatYmd(win.endDate)} | ${subs.map(s => s.subjectCode).join(', ')} (${credits}TC)`,
    );
  }

  // CurriculumCourse (gắn môn vào từng học kỳ)
  let teacherMap = {};
  for (const sub of SEK25_SUBJECTS) {
    const prereqCodes = sub.prerequisites || [];
    const tuitionTotal = sub.credits * CFG.pricePerCreditVnd;

    // Upsert Subject — LUÔN cập nhật tuitionFee (môn đã có từ SEK26 trước đó vẫn 350k/TC nếu không ghi đè)
    let subject = await Subject.findOne({ subjectCode: sub.subjectCode });
    if (!subject) {
      const teacher = await Teacher.findOne({ teacherCode: sub.teacherCode }).lean();
      subject = await Subject.create({
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits,
        tuitionFee: tuitionTotal,
        majorCode: CFG.majorCode,
        majorCodes: [CFG.majorCode],
        facultyCode: 'CNTT',
        suggestedSemester: sub.suggestedSemester,
        teachers: teacher ? [teacher._id] : [],
        prerequisites: prereqCodes.map(code => ({ code, name: '' })),
        isCommon: false,
        gradingWeights: { GK: 30, CK: 50, BT: 20, PT: 0, QT: 0 },
      });
      console.log(`   ✅ Subject mới: ${sub.subjectCode} — ${tuitionTotal}đ (${sub.credits}TC × ${CFG.pricePerCreditVnd}đ)`);
    } else {
      await Subject.updateOne(
        { _id: subject._id },
        {
          $set: {
            tuitionFee: tuitionTotal,
            credits: sub.credits,
            subjectName: sub.subjectName,
            suggestedSemester: sub.suggestedSemester,
          },
        },
      );
      subject = await Subject.findById(subject._id);
      console.log(`   ↻ Subject cập nhật học phí: ${sub.subjectCode} → ${tuitionTotal}đ (${sub.credits}TC × ${CFG.pricePerCreditVnd}đ)`);
    }

    // CurriculumCourse
    const cs = semesterMap[sub.suggestedSemester];
    const existingCC = await CurriculumCourse.findOne({ semester: cs._id, subject: subject._id });
    if (!existingCC) {
      await CurriculumCourse.create({
        semester: cs._id,
        subject: subject._id,
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits,
        hasPrerequisite: prereqCodes.length > 0,
      });
    }
  }
  console.log(`   ✅ ${SEK25_SUBJECTS.length} CurriculumCourse đã tạo cho SEK25`);

  return { curriculum, semesterMap };
}

async function seedStep2_SemesterRecords() {
  console.log('\n📋 STEP 2: Semester records (học kỳ hệ thống)');

  const now = Date.now();

  // Kỳ 1 đã kết thúc
  const sem1 = await Semester.findOneAndUpdate(
    { code: '2025-2026_1' },
    {
      $set: {
        name: 'Kỳ 1 - 2025/2026',
        semesterType: 'regular',
        semesterNum: 1,
        academicYear: '2025-2026',
        startDate: dateUtcNoon(2025, 9, 1),
        endDate: dateUtcNoon(2025, 12, 31),
        isCurrent: false,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`   ✅ Semester 2025-2026_1: completed`);

  // Kỳ 2 hiện tại
  const sem2 = await Semester.findOneAndUpdate(
    { code: CFG.currentSemesterCode },
    {
      $set: {
        name: 'Kỳ 2 - 2025/2026',
        semesterType: 'regular',
        semesterNum: 2,
        academicYear: '2025-2026',
        startDate: dateUtcNoon(2026, 1, 5),
        endDate: dateUtcNoon(2026, 5, 31),
        isCurrent: true,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`   ✅ Semester ${CFG.currentSemesterCode}: isCurrent = true`);

  return { sem1, sem2 };
}

async function seedStep3_Student(curriculum) {
  console.log('\n📋 STEP 3: Sinh viên Nguyễn Văn Rớt + Wallet');

  const user = await upsertUser(CFG.email, CFG.password, CFG.studentName, 'student');
  console.log(`   ✅ User: ${CFG.email}`);

  const major = await Major.findOne({ majorCode: CFG.majorCode });
  const wallet = await ensureWallet(user._id, 5_000_000);

  const existing = await Student.findOne({ studentCode: CFG.studentCode });
  if (existing) {
    console.log(`   ⚠️  Student ${CFG.studentCode} đã tồn tại — cập nhật curriculumId → SEK25`);
    existing.curriculumId = curriculum._id;
    existing.majorId = major._id;
    existing.cohort = CFG.cohort;
    existing.enrollmentYear = CFG.enrollmentYear;
    existing.currentCurriculumSemester = 2;
    existing.email = CFG.email;
    if (!existing.userId) existing.userId = user._id;
    await existing.save();
    console.log(`   ✅ Student cập nhật: curriculumId = SEK25, currentSemester = 2`);
    return { student: existing, user, wallet };
  }

  const student = await Student.create({
    studentCode: CFG.studentCode,
    fullName: CFG.studentName,
    email: CFG.email,
    majorCode: CFG.majorCode,
    majorId: major._id,
    cohort: CFG.cohort,
    enrollmentYear: CFG.enrollmentYear,
    curriculumId: curriculum._id,
    currentCurriculumSemester: 2,   // đang ở HK2 trong khung
    academicStatus: 'enrolled',
    classSection: `SE${CFG.cohort}01`,
    userId: user._id,
    isActive: true,
  });

  console.log(`   ✅ Student: ${CFG.studentCode} — ${CFG.studentName}`);
  console.log(`   📌 curriculumId: ${CFG.curriculumCode} (${curriculum._id})`);
  console.log(`   📌 cohort: K${CFG.cohort}, enrollmentYear: ${CFG.enrollmentYear}, currentSemester: 2`);
  console.log(`   ✅ Wallet: ${wallet.balance} VNĐ`);

  return { student, user, wallet };
}

async function seedStep4_Enrollment_K1_Failed(student, curriculum) {
  console.log('\n📋 STEP 4: Enrollment Kỳ 1 — RỚT ' + CFG.failedSubjectCode);

  const subject = await Subject.findOne({ subjectCode: CFG.failedSubjectCode });
  if (!subject) throw new Error(`Subject ${CFG.failedSubjectCode} không tồn tại trong SEK25`);

  // CurriculumSemester Kỳ 1 của SEK25
  const csSem1 = await CurriculumSemester.findOne({ curriculum: curriculum._id, semesterOrder: 1 });
  if (!csSem1) throw new Error('CurriculumSemester Kỳ 1 không tìm thấy');

  // CurriculumCourse Kỳ 1 cho SE101
  const cc = await CurriculumCourse.findOne({ semester: csSem1._id, subject: subject._id });
  if (!cc) throw new Error(`CurriculumCourse SE101 Kỳ 1 không tìm thấy`);

  // ClassSection SE101-K25-01 (Kỳ 1 — completed)
  let classSec = await ClassSection.findOne({ classCode: `${CFG.failedSubjectCode}-K${CFG.cohort}-01` });
  if (!classSec) {
    classSec = await ClassSection.create({
      classCode: `${CFG.failedSubjectCode}-K${CFG.cohort}-01`,
      className: `${CFG.failedSubjectCode} - ${subject.subjectName}`,
      subject: subject._id,
      semester: 1,
      academicYear: '2025-2026',
      maxCapacity: 50,
      currentEnrollment: 1,
      status: 'completed',
      classGroup: `SE${CFG.cohort}01`,
      groupIndex: 0,
      curriculum: curriculum._id,
      curriculumSemesterOrder: 1,
      startDate: csSem1.startDate,
      endDate: csSem1.endDate,
      dayOfWeek: 2,
    });
    console.log(`   ✅ ClassSection mới: ${classSec.classCode} (Kỳ 1, completed)`);
  } else {
    console.log(`   ✅ ClassSection hiện có: ${classSec.classCode}`);
  }

  const existing = await ClassEnrollment.findOne({ classSection: classSec._id, student: student._id });
  if (existing) {
    existing.status = 'completed';
    existing.midtermScore = CFG.semester1Grade;
    existing.finalScore = CFG.semester1Grade - 0.5;
    existing.assignmentScore = CFG.semester1Grade + 0.5;
    existing.grade = CFG.semester1Grade;
    existing.isFinalized = true;
    await existing.save();
    console.log(`   ✅ Enrollment Kỳ 1 đã cập nhật: grade = ${CFG.semester1Grade} (< 5.0)`);
  } else {
    await ClassEnrollment.create({
      classSection: classSec._id,
      student: student._id,
      status: 'completed',
      midtermScore: CFG.semester1Grade,
      finalScore: CFG.semester1Grade - 0.5,
      assignmentScore: CFG.semester1Grade + 0.5,
      grade: CFG.semester1Grade,   // < 5.0 → RỚT
      isFinalized: true,
    });
    console.log(`   ✅ Enrollment RỚT: ${CFG.failedSubjectCode}, grade = ${CFG.semester1Grade}`);
  }

  return { classSec, subject, csSem1 };
}

async function seedStep5_Enrollment_K2(student, sem2, curriculum) {
  console.log('\n📋 STEP 5: Enrollments Kỳ 2 (4 môn đang học)');

  const k2Subs = SEK25_SUBJECTS.filter(s => s.suggestedSemester === 2);
  const csSem2 = await CurriculumSemester.findOne({ curriculum: curriculum._id, semesterOrder: 2 });

  const room = await Room.findOne({ roomCode: 'SE26-A101' }).lean();
  const timeslots = await Timeslot.find({ status: 'active' }).sort({ startPeriod: 1 }).limit(4).lean();

  for (let i = 0; i < k2Subs.length; i++) {
    const sub = k2Subs[i];
    const subject = await Subject.findOne({ subjectCode: sub.subjectCode });
    if (!subject) { console.log(`   ⚠️  ${sub.subjectCode} không tồn tại — bỏ qua`); continue; }

    let classSec = await ClassSection.findOne({ classCode: `${sub.subjectCode}-K${CFG.cohort}-01` });
    if (!classSec) {
      classSec = await ClassSection.create({
        classCode: `${sub.subjectCode}-K${CFG.cohort}-01`,
        className: `${sub.subjectCode} - ${sub.subjectName}`,
        subject: subject._id,
        semester: 2,
        academicYear: '2025-2026',
        maxCapacity: 50,
        currentEnrollment: 0,
        status: 'published',
        classGroup: `SE${CFG.cohort}01`,
        groupIndex: 0,
        curriculum: curriculum._id,
        curriculumSemesterOrder: 2,
        startDate: sem2.startDate,
        endDate: sem2.endDate,
        dayOfWeek: [2, 3, 4, 5][i],
        timeslot: timeslots[i]?._id,
        room: room?._id,
      });

      if (timeslots[i] && room) {
        await Schedule.create({
          classSection: classSec._id,
          room: room._id,
          dayOfWeek: [2, 3, 4, 5][i],
          startPeriod: timeslots[i].startPeriod,
          endPeriod: timeslots[i].endPeriod,
          startDate: sem2.startDate,
          endDate: sem2.endDate,
          status: 'active',
        });
      }
      console.log(`   ✅ ClassSection mới: ${classSec.classCode} (Kỳ 2)`);
    } else {
      console.log(`   ✅ ClassSection hiện có: ${classSec.classCode}`);
    }

    const existing = await ClassEnrollment.findOne({ classSection: classSec._id, student: student._id });
    if (!existing) {
      await ClassEnrollment.create({
        classSection: classSec._id,
        student: student._id,
        status: 'enrolled',
      });
      classSec.currentEnrollment += 1;
      await classSec.save();
    }
    console.log(`   ✅ Enrollment Kỳ 2: ${sub.subjectCode}`);
  }
}

async function seedStep6_RepeatClass(student, sem2, curriculum) {
  console.log('\n📋 STEP 6: Lớp học lại ' + CFG.failedSubjectCode + ' (Kỳ 2)');

  const subject = await Subject.findOne({ subjectCode: CFG.failedSubjectCode });
  if (!subject) { console.log(`   ⚠️  ${CFG.failedSubjectCode} không tồn tại`); return; }

  const repeatCode = `${CFG.failedSubjectCode}-K${CFG.cohort}-R1`;

  // CurriculumSemester Kỳ 2 của SEK25
  const csSem2 = await CurriculumSemester.findOne({ curriculum: curriculum._id, semesterOrder: 2 });

  let repeatClass = await ClassSection.findOne({ classCode: repeatCode });
  if (!repeatClass) {
    const teacher = await Teacher.findOne({}).lean();
    const timeslot = await Timeslot.findOne({ groupName: 'CA5' }).lean();
    const room = await Room.findOne({ roomCode: 'SE26-A101' }).lean();

    repeatClass = await ClassSection.create({
      classCode: repeatCode,
      className: `${CFG.failedSubjectCode} - Học lại`,
      subject: subject._id,
      semester: 2,
      academicYear: '2025-2026',
      maxCapacity: 30,
      currentEnrollment: 0,
      status: 'published',   // mở cho SV đăng ký
      classGroup: `SE${CFG.cohort}01`,
      groupIndex: 0,
      curriculum: curriculum._id,
      curriculumSemesterOrder: 1,  // thuộc Kỳ 1 trong khung (học lại)
      startDate: sem2.startDate,
      endDate: sem2.endDate,
      dayOfWeek: 6,  // Thứ 7 — không trùng Kỳ 2
      timeslot: timeslot?._id,
      room: room?._id,
    });

    if (timeslot && room) {
      await Schedule.create({
        classSection: repeatClass._id,
        room: room._id,
        dayOfWeek: 6,
        startPeriod: timeslot.startPeriod,
        endPeriod: timeslot.endPeriod,
        startDate: sem2.startDate,
        endDate: sem2.endDate,
        status: 'active',
      });
    }
    console.log(`   ✅ ClassSection học lại mới: ${repeatCode} (published, maxCapacity: 30)`);
  } else {
    console.log(`   ✅ ClassSection học lại hiện có: ${repeatCode}`);
  }

  const existing = await ClassEnrollment.findOne({ classSection: repeatClass._id, student: student._id });
  if (!existing) {
    await ClassEnrollment.create({
      classSection: repeatClass._id,
      student: student._id,
      status: 'enrolled',
      courseFeeCleared: false,  // chưa thanh toán học phần học lại
    });
    repeatClass.currentEnrollment += 1;
    await repeatClass.save();
    console.log(`   ✅ Enrollment học lại (courseFeeCleared = false)`);
  } else {
    console.log(`   ⚠️  Enrollment học lại đã tồn tại`);
  }
}

async function seedStep7_RegistrationPeriod(sem2) {
  console.log('\n📋 STEP 7: RegistrationPeriod (đợt đăng ký học lại)');

  const now = Date.now();
  const startDate = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now + 120 * 24 * 60 * 60 * 1000);

  await RegistrationPeriod.findOneAndUpdate(
    { requestType: 'repeat', semester: sem2._id },
    {
      $set: {
        periodName: `Đăng ký học lại Kỳ 2 ${sem2.academicYear}`,
        requestType: 'repeat',
        semester: sem2._id,
        startDate,
        endDate,
        allowedCohorts: [CFG.cohort],
        status: 'active',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`   ✅ RegistrationPeriod: requestType=repeat, status=active`);
  console.log(`   📌 Mở đăng ký: ${formatYmd(startDate)} → ${formatYmd(endDate)}`);
}

async function seedStep8_Payment(student) {
  console.log('\n📋 STEP 8: Payment (Kỳ 2 — PENDING)');

  const existing = await Payment.findOne({ student: student._id, semesterCode: CFG.currentSemesterCode });
  if (!existing) {
    await Payment.create({
      student: student._id,
      semesterCode: CFG.currentSemesterCode,
      amount: 0,
      status: 'pending',
      method: 'bank_transfer',
      note: 'Chờ thanh toán — SV chưa nộp học phí Kỳ 2',
    });
    console.log(`   ✅ Payment PENDING: ${CFG.currentSemesterCode}`);
    console.log(`   ⚠️  SV chưa thanh toán → TKB Kỳ 2 bị BLOCK`);
  } else {
    console.log(`   ⚠️  Payment đã tồn tại.`);
  }
}

// =====================================================================
// MAIN
// =====================================================================

async function seed() {
  console.log('='.repeat(70));
  console.log('🔧 SEED: Nguyễn Văn Rớt — Khung chương trình SEK25 đầy đủ');
  console.log('='.repeat(70));
  console.log('\n🎯 Kịch bản:');
  console.log('   1. SV nhập học K25 (2025) — khung SEK25 (2025-2026 → 2029-2030)');
  console.log(`   2. Rớt ${CFG.failedSubjectCode} ở HK1 (grade = ${CFG.semester1Grade} < 5.0)`);
  console.log('   3. Đang học HK2: SE201, SE202, SE203, SE204');
  console.log('   4. Lớp học lại SE101-K25-R1 mở ở HK2 (thứ 7)');
  console.log('   5. Enrollment học lại: courseFeeCleared = false (chưa thanh toán)');
  console.log('   6. Payment HK2: PENDING → TKB bị BLOCK');
  console.log('');

  await connectDB();

  const major = await seedStep0_Major();
  const { curriculum, semesterMap } = await seedStep1_Curriculum(major);
  const { sem1, sem2 } = await seedStep2_SemesterRecords();
  const { student, user, wallet } = await seedStep3_Student(curriculum);
  await seedStep4_Enrollment_K1_Failed(student, curriculum);
  await seedStep5_Enrollment_K2(student, sem2, curriculum);
  await seedStep6_RepeatClass(student, sem2, curriculum);
  await seedStep7_RegistrationPeriod(sem2);
  await seedStep8_Payment(student);

  console.log('\n' + '='.repeat(70));
  console.log('✅ SEED HOÀN TẤT!');
  console.log('='.repeat(70));
  console.log('\n📊 Dữ liệu đã tạo / cập nhật:');
  console.log(`   • Curriculum  : SEK25 — 27 môn, 9 HK, ${SEK25_SUBJECTS.reduce((s, x) => s + x.credits, 0)} TC`);
  console.log(`   • HK1         : SE101 rớt (grade = ${CFG.semester1Grade})`);
  console.log(`   • HK2         : SE201, SE202, SE203, SE204`);
  console.log(`   • Học lại     : ${CFG.failedSubjectCode}-K${CFG.cohort}-R1 (published)`);
  console.log(`   • Enrollment  : courseFeeCleared = false`);
  console.log(`   • Payment     : ${CFG.currentSemesterCode} (PENDING)`);
  console.log(`   • Wallet      : ${wallet.balance} VNĐ`);

  console.log('\n🔐 Tài khoản đăng nhập:');
  console.log(`   Email : ${CFG.email}`);
  console.log(`   Pass  : ${CFG.password}`);
  console.log('');
}

seed()
  .then(() => { console.log('🎉 Done!'); process.exit(0); })
  .catch((err) => { console.error('\n❌ SEED FAILED:', err.message); console.error(err.stack); process.exit(1); });
