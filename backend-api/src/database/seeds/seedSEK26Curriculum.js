// backend-api/src/database/seeds/seedSEK26Curriculum.js
// Seed: Teachers + Subjects + Curriculum + Students + ClassSections + Enrollments
// Faculty & Major da co san — chi lookup

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDB } = require('../../configs/db.config');

const User = require('../../models/user.model');
const Student = require('../../models/student.model');
const Teacher = require('../../models/teacher.model');
const Subject = require('../../models/subject.model');
const Major = require('../../models/major.model');
const Curriculum = require('../../models/curriculum.model');
const CurriculumSemester = require('../../models/curriculumSemester.model');
const CurriculumCourse = require('../../models/curriculumCourse.model');
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Schedule = require('../../models/schedule.model');
const Timeslot = require('../../models/timeslot.model');
const Room = require('../../models/room.model');

// ===== CONSTANTS =====
const COHORT = 26;
const ACADEMIC_YEAR = '2026-2027';
const CURRENT_SEMESTER = 1;
const MAJOR_CODE = 'SE';
const DOMAIN = 'fpt.edu.vn';
const PASSWORD = 'Student@123';
const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const PRICE_PER_CREDIT = 350000;

// Khoi HK1 bat dau 5/4/2026; moi ky 4 thang; ngay ket thuc = ngay truoc ngay bat dau ky sau
const CURRICULUM_SEMESTER_START_DAY = { y: 2026, m: 4, d: 5 };
const MONTHS_PER_CURRICULUM_SEMESTER = 4;

// Xen ke: Thu 2,4,6 roi 3,5,7 (Sat)
const SCHEDULE_DOW_PATTERN = [1, 3, 5, 2, 4, 6];
const SCHEDULE_CA_PERIODS = [
  { startPeriod: 1, endPeriod: 2 },
  { startPeriod: 3, endPeriod: 4 },
  { startPeriod: 5, endPeriod: 6 },
  { startPeriod: 7, endPeriod: 8 },
  { startPeriod: 9, endPeriod: 10 },
];

const TIMESLOT_DEFS = [
  { groupName: 'CA1', description: 'Ca 1 - Sang', startTime: '07:30', endTime: '09:00', startPeriod: 1, endPeriod: 2 },
  { groupName: 'CA2', description: 'Ca 2 - Sang', startTime: '09:30', endTime: '11:00', startPeriod: 3, endPeriod: 4 },
  { groupName: 'CA3', description: 'Ca 3 - Chieu', startTime: '12:30', endTime: '14:00', startPeriod: 5, endPeriod: 6 },
  { groupName: 'CA4', description: 'Ca 4 - Chieu', startTime: '14:30', endTime: '16:00', startPeriod: 7, endPeriod: 8 },
  { groupName: 'CA5', description: 'Ca 5 - Toi', startTime: '17:00', endTime: '18:30', startPeriod: 9, endPeriod: 10 },
];

// ===== 1. TEACHERS =====
const teachersData = [
  { teacherCode: 'GVK26001', fullName: 'Nguyen Van An',     specialization: 'Ky thuat phan mem',    degree: 'phd' },
  { teacherCode: 'GVK26002', fullName: 'Tran Thi Lan',      specialization: 'Ky thuat phan mem',    degree: 'masters' },
  { teacherCode: 'GVK26003', fullName: 'Le Minh Hoang',     specialization: 'Tri tue nhan tao',      degree: 'phd' },
  { teacherCode: 'GVK26004', fullName: 'Pham Thu Ha',       specialization: 'Khoa hoc du lieu',     degree: 'masters' },
  { teacherCode: 'GVK26005', fullName: 'Vo Quoc Bao',       specialization: 'Co so du lieu',        degree: 'masters' },
  { teacherCode: 'GVK26006', fullName: 'Nguyen Thi Hong',   specialization: 'Mang may tinh',        degree: 'masters' },
  { teacherCode: 'GVK26007', fullName: 'Tran Quoc Tuan',    specialization: 'An ninh mang',         degree: 'phd' },
  { teacherCode: 'GVK26008', fullName: 'Le Thi Mai',        specialization: 'Phat trien Web',        degree: 'masters' },
  { teacherCode: 'GVK26009', fullName: 'Phan Van Duc',      specialization: 'DevOps & Cloud',        degree: 'masters' },
  { teacherCode: 'GVK26010', fullName: 'Nguyen Thi Trang',  specialization: 'Kiem thu phan mem',   degree: 'masters' },
];

// ===== 2. SUBJECTS (27 subjects, 9 semesters, 3-4 subjects each) =====
const subjectsData = [
  // HOC KY 1
  { subjectCode: 'SE101', subjectName: 'Nhap mon Ky thuat phan mem',  credits: 3, suggestedSemester: 1, teacherCode: 'GVK26001', prerequisites: [] },
  { subjectCode: 'SE102', subjectName: 'Lap trinh co ban',             credits: 4, suggestedSemester: 1, teacherCode: 'GVK26002', prerequisites: [] },
  { subjectCode: 'SE103', subjectName: 'Toan roi rac',                  credits: 3, suggestedSemester: 1, teacherCode: 'GVK26003', prerequisites: [] },
  { subjectCode: 'SE104', subjectName: 'Triet hoc dai cuong',           credits: 2, suggestedSemester: 1, teacherCode: 'GVK26001', prerequisites: [] },
  // HOC KY 2
  { subjectCode: 'SE201', subjectName: 'Cau truc du lieu',             credits: 4, suggestedSemester: 2, teacherCode: 'GVK26002', prerequisites: ['SE102'] },
  { subjectCode: 'SE202', subjectName: 'Kien truc may tinh',           credits: 3, suggestedSemester: 2, teacherCode: 'GVK26003', prerequisites: [] },
  { subjectCode: 'SE203', subjectName: 'Tieng Anh chuyen nganh 1',      credits: 2, suggestedSemester: 2, teacherCode: 'GVK26001', prerequisites: [] },
  { subjectCode: 'SE204', subjectName: 'Giao duc the chat',             credits: 1, suggestedSemester: 2, teacherCode: 'GVK26010', prerequisites: [] },
  // HOC KY 3
  { subjectCode: 'SE301', subjectName: 'Lap trinh huong doi tuong',     credits: 4, suggestedSemester: 3, teacherCode: 'GVK26002', prerequisites: ['SE201'] },
  { subjectCode: 'SE302', subjectName: 'Co so du lieu',                 credits: 3, suggestedSemester: 3, teacherCode: 'GVK26005', prerequisites: ['SE201'] },
  { subjectCode: 'SE303', subjectName: 'Mang may tinh',                 credits: 3, suggestedSemester: 3, teacherCode: 'GVK26006', prerequisites: ['SE202'] },
  // HOC KY 4
  { subjectCode: 'SE401', subjectName: 'Phan tich thiet ke he thong',   credits: 3, suggestedSemester: 4, teacherCode: 'GVK26001', prerequisites: ['SE301'] },
  { subjectCode: 'SE402', subjectName: 'Phat trien Web',                credits: 3, suggestedSemester: 4, teacherCode: 'GVK26008', prerequisites: ['SE301'] },
  { subjectCode: 'SE403', subjectName: 'Kiem thu phan mem',             credits: 3, suggestedSemester: 4, teacherCode: 'GVK26010', prerequisites: ['SE301'] },
  { subjectCode: 'SE404', subjectName: 'Tieng Anh chuyen nganh 2',      credits: 2, suggestedSemester: 4, teacherCode: 'GVK26001', prerequisites: ['SE203'] },
  // HOC KY 5
  { subjectCode: 'SE501', subjectName: 'Kien truc phan mem',             credits: 3, suggestedSemester: 5, teacherCode: 'GVK26001', prerequisites: ['SE401'] },
  { subjectCode: 'SE502', subjectName: 'Phat trien ung dung di dong',    credits: 3, suggestedSemester: 5, teacherCode: 'GVK26002', prerequisites: ['SE301'] },
  { subjectCode: 'SE503', subjectName: 'Lap trinh Backend',              credits: 3, suggestedSemester: 5, teacherCode: 'GVK26008', prerequisites: ['SE402'] },
  // HOC KY 6
  { subjectCode: 'SE601', subjectName: 'DevOps',                         credits: 3, suggestedSemester: 6, teacherCode: 'GVK26009', prerequisites: ['SE503'] },
  { subjectCode: 'SE602', subjectName: 'Dien toan dam may',              credits: 3, suggestedSemester: 6, teacherCode: 'GVK26009', prerequisites: ['SE501'] },
  { subjectCode: 'SE603', subjectName: 'Bao mat ung dung',                credits: 3, suggestedSemester: 6, teacherCode: 'GVK26007', prerequisites: ['SE303'] },
  // HOC KY 7
  { subjectCode: 'SE701', subjectName: 'Quan ly du an phan mem',          credits: 3, suggestedSemester: 7, teacherCode: 'GVK26001', prerequisites: ['SE401'] },
  { subjectCode: 'SE702', subjectName: 'Kien truc Microservices',         credits: 3, suggestedSemester: 7, teacherCode: 'GVK26008', prerequisites: ['SE501'] },
  { subjectCode: 'SE703', subjectName: 'Hoc may cho phan mem',           credits: 3, suggestedSemester: 7, teacherCode: 'GVK26003', prerequisites: ['SE201', 'SE103'] },
  // HOC KY 8
  { subjectCode: 'SE801', subjectName: 'Thuc tap doanh nghiep',           credits: 4, suggestedSemester: 8, teacherCode: 'GVK26001', prerequisites: ['SE701'] },
  { subjectCode: 'SE802', subjectName: 'De xuat do an',                   credits: 2, suggestedSemester: 8, teacherCode: 'GVK26001', prerequisites: ['SE703'] },
  // HOC KY 9
  { subjectCode: 'SE901', subjectName: 'Do an tot nghiep',                credits: 6, suggestedSemester: 9, teacherCode: 'GVK26001', prerequisites: ['SE801'] },
];

// ===== 3. CLASS GROUPS =====
const CLASS_GROUPS = [
  { groupCode: 'SE26-01', studentsPerGroup: 10 },
  { groupCode: 'SE26-02', studentsPerGroup: 10 },
  { groupCode: 'SE26-03', studentsPerGroup: 10 },
];

// ===== 4. 30 STUDENT NAMES =====
const studentNames = [
  // Nhom SE26-01
  'Nguyen Hoang Nam',     'Tran Minh Anh',      'Le Thu Phuong',     'Pham Quang Huy',
  'Vo Thi Huong Giang',  'Dang Van Minh',      'Bui Thi Lan Chi',  'Ngo Duc Thang',
  'Huynh Thi Ngoc Mai',  'Trinh Gia Bao',
  // Nhom SE26-02
  'Phan Thi Thu Ha',     'Ly Van Quang',       'Truong Ngoc Anh',  'Vu Thi Mai Linh',
  'Do Minh Duc',         'Nguyen Thi Thanh',   'Le Hoang Son',     'Pham Van Dat',
  'Tran Thi Hong Nhung', 'Nguyen Gia Minh',
  // Nhom SE26-03
  'Vo Quoc Khanh',       'Le Thi Thuy Ha',     'Tran Hoang Anh',   'Pham Thi Mai Anh',
  'Dang Minh Tuan',      'Nguyen Thi Bao Ngoc','Ly Van Tien',     'Trinh Thi Lan',
  'Bui Hoang Long',      'Phan Van Duc Anh',
];

// ===== HELPERS =====
function normalizeText(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
}

function buildStudentEmail(fullName, studentIndex) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = normalizeText(parts[parts.length - 1]);
  const initials = normalizeText(parts.slice(0, -1).map(p => p[0]).join(''));
  return `${firstName}${initials}se26${String(studentIndex + 1).padStart(3, '0')}@${DOMAIN}`;
}

function dateUtcNoon(y, month, day) {
  return new Date(Date.UTC(y, month - 1, day, 12, 0, 0));
}

function addMonthsUtc(date, n) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

function buildCurriculumSemesterWindows(count) {
  const windows = [];
  let start = dateUtcNoon(
    CURRICULUM_SEMESTER_START_DAY.y,
    CURRICULUM_SEMESTER_START_DAY.m,
    CURRICULUM_SEMESTER_START_DAY.d,
  );
  for (let i = 0; i < count; i += 1) {
    const nextStart = addMonthsUtc(start, MONTHS_PER_CURRICULUM_SEMESTER);
    const end = new Date(nextStart.getTime() - 86400000);
    windows.push({ startDate: start, endDate: end });
    start = nextStart;
  }
  return windows;
}

function formatYmdUtc(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function ensureTimeslotsForSchedule() {
  for (const ts of TIMESLOT_DEFS) {
    await Timeslot.findOneAndUpdate(
      { groupName: ts.groupName },
      {
        $set: {
          groupName: ts.groupName,
          description: ts.description,
          startTime: ts.startTime,
          endTime: ts.endTime,
          startPeriod: ts.startPeriod,
          endPeriod: ts.endPeriod,
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function ensureRoomsSE26() {
  const codes = [];
  for (let i = 101; i <= 120; i += 1) {
    codes.push(`SE26-A${i}`);
  }
  const rooms = [];
  for (const roomCode of codes) {
    const r = await Room.findOneAndUpdate(
      { roomCode },
      {
        $setOnInsert: {
          roomCode,
          roomName: `Phong ${roomCode}`,
          roomType: 'Lecture',
          capacity: 40,
          status: 'available',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    rooms.push(r);
  }
  return rooms;
}

async function syncClassSectionPrimarySchedule(classSectionId) {
  const activeSchedules = await Schedule.find({
    classSection: classSectionId,
    status: 'active',
  })
    .sort({ dayOfWeek: 1, startPeriod: 1, endPeriod: 1, startDate: 1, _id: 1 })
    .lean();

  if (activeSchedules.length === 0) {
    await ClassSection.findByIdAndUpdate(classSectionId, {
      $unset: {
        room: '',
        timeslot: '',
        dayOfWeek: '',
        startDate: '',
        endDate: '',
      },
    });
    return;
  }

  const primarySchedule = activeSchedules[0];
  const matchedTimeslot = await Timeslot.findOne({
    startPeriod: primarySchedule.startPeriod,
    endPeriod: primarySchedule.endPeriod,
    status: 'active',
  })
    .select('_id')
    .lean();

  await ClassSection.findByIdAndUpdate(classSectionId, {
    room: primarySchedule.room || null,
    timeslot: matchedTimeslot ? matchedTimeslot._id : null,
    dayOfWeek: primarySchedule.dayOfWeek,
    startDate: primarySchedule.startDate,
    endDate: primarySchedule.endDate,
  });
}

async function seedAlternatingSchedules(curriculum) {
  await ensureTimeslotsForSchedule();
  const rooms = await ensureRoomsSE26();
  const windows = buildCurriculumSemesterWindows(9);

  const allClasses = await ClassSection.find({ curriculum: curriculum._id })
    .populate('teacher', '_id')
    .sort({ curriculumSemesterOrder: 1, classCode: 1 })
    .lean();

  const classIds = allClasses.map((c) => c._id);
  await Schedule.deleteMany({ classSection: { $in: classIds } });

  const bySemester = new Map();
  for (const cls of allClasses) {
    const ord = Number(cls.curriculumSemesterOrder);
    if (!Number.isFinite(ord) || ord < 1 || ord > 9) {
      continue;
    }
    if (!bySemester.has(ord)) {
      bySemester.set(ord, []);
    }
    bySemester.get(ord).push(cls);
  }

  for (let sem = 1; sem <= 9; sem += 1) {
    const list = bySemester.get(sem);
    if (!list || list.length === 0) {
      continue;
    }

    const win = windows[sem - 1];
    const startDate = win.startDate;
    const endDate = win.endDate;

    const teacherSlotKeys = new Set();
    const roomSlotKeys = new Set();
    let slotCursor = 0;

    console.log(
      `[SEK26] TKB HK${sem} (${formatYmdUtc(startDate)} -> ${formatYmdUtc(endDate)}): ${list.length} lop`,
    );

    for (const cls of list) {
      const teacherId = cls.teacher && cls.teacher._id ? String(cls.teacher._id) : '';
      let placed = false;

      for (let tries = 0; tries < 400 && !placed; tries += 1) {
        const attempt = slotCursor + tries;
        const dow = SCHEDULE_DOW_PATTERN[attempt % SCHEDULE_DOW_PATTERN.length];
        const ca =
          SCHEDULE_CA_PERIODS[
            Math.floor(attempt / SCHEDULE_DOW_PATTERN.length) % SCHEDULE_CA_PERIODS.length
          ];
        const room = rooms[attempt % rooms.length];

        const roomKey = `${String(room._id)}|${dow}|${ca.startPeriod}|${ca.endPeriod}`;
        if (roomSlotKeys.has(roomKey)) {
          continue;
        }

        const teacherKey = teacherId ? `${teacherId}|${dow}|${ca.startPeriod}|${ca.endPeriod}` : '';
        if (teacherKey && teacherSlotKeys.has(teacherKey)) {
          continue;
        }

        await Schedule.create({
          classSection: cls._id,
          room: room._id,
          dayOfWeek: dow,
          startPeriod: ca.startPeriod,
          endPeriod: ca.endPeriod,
          startDate,
          endDate,
          status: 'active',
        });

        roomSlotKeys.add(roomKey);
        if (teacherKey) {
          teacherSlotKeys.add(teacherKey);
        }

        slotCursor = attempt + 1;
        placed = true;
      }

      if (!placed) {
        throw new Error(`[SEK26] Khong xep duoc lich cho lop ${cls.classCode}`);
      }
    }
  }

  for (const id of classIds) {
    await syncClassSectionPrimarySchedule(id);
  }

  const n = await Schedule.countDocuments({ classSection: { $in: classIds }, status: 'active' });
  console.log(`[SEK26] Da tao ${n} Schedule (TKB xen ke) + dong bo ClassSection`);
}

// ===== SEED FUNCTIONS =====

async function seedTeachers() {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const teacherMap = {};

  for (const teacher of teachersData) {
    const normalizedEmail = `${normalizeText(teacher.fullName.replace(/\s/g, ''))}@${DOMAIN}`.toLowerCase();

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: {
          email: normalizedEmail,
          password: passwordHash,
          fullName: teacher.fullName,
          role: 'lecturer',
          authProvider: 'local',
          status: 'active',
          isActive: true,
          mustChangePassword: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const existing = await Teacher.findOne({ teacherCode: teacher.teacherCode });
    if (!existing) {
      const t = await Teacher.create({
        teacherCode: teacher.teacherCode,
        fullName: teacher.fullName,
        email: normalizedEmail,
        phone: `090${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        department: 'CNTT',
        specialization: teacher.specialization,
        degree: teacher.degree,
        gender: teacher.fullName.includes('Thi') ? 'female' : 'male',
        userId: user._id,
        isActive: true,
      });
      teacherMap[teacher.teacherCode] = t._id;
      console.log(`[SEK26] Teacher created: ${teacher.fullName} (${teacher.teacherCode})`);
    } else {
      teacherMap[teacher.teacherCode] = existing._id;
      console.log(`[SEK26] Teacher exists:  ${teacher.fullName} (${teacher.teacherCode})`);
    }
  }
  return teacherMap;
}

async function seedSubjects(teacherMap) {
  // Upsert subjects - update neu ton tai, insert neu chua co
  const bulkOps = subjectsData.map(subj => {
    const teacherId = teacherMap[subj.teacherCode];
    const prerequisites = subj.prerequisites.map(prereqCode => {
      const prereq = subjectsData.find(s => s.subjectCode === prereqCode);
      return { code: prereqCode, name: prereq ? prereq.subjectName : '' };
    });

    return {
      replaceOne: {
        filter: { subjectCode: subj.subjectCode },
        replacement: {
          subjectCode: subj.subjectCode,
          subjectName: subj.subjectName,
          credits: subj.credits,
          tuitionFee: subj.credits * PRICE_PER_CREDIT,
          majorCode: MAJOR_CODE,
          majorCodes: [MAJOR_CODE],
          facultyCode: 'CNTT',
          suggestedSemester: subj.suggestedSemester,
          teachers: teacherId ? [teacherId] : [],
          prerequisites,
          isCommon: false,
          gradingWeights: { GK: 30, CK: 50, BT: 20, PT: 0, QT: 0 },
        },
        upsert: true,
      },
    };
  });

  await Subject.bulkWrite(bulkOps);

  const subjectMap = {};
  for (const subj of subjectsData) {
    const doc = await Subject.findOne({ subjectCode: subj.subjectCode });
    subjectMap[subj.subjectCode] = doc._id;
    const sem = subj.suggestedSemester;
    const pre = subj.prerequisites.length > 0 ? ` [PREREQ: ${subj.prerequisites.join(', ')}]` : '';
    console.log(`[SEK26] [HK${sem}] ${subj.subjectCode} - ${subj.subjectName} (${subj.credits}TC)${pre}`);
  }
  return subjectMap;
}

async function seedCurriculum(subjectMap) {
  await Curriculum.deleteMany({ code: `SEK${COHORT}` });
  await CurriculumSemester.deleteMany({});
  await CurriculumCourse.deleteMany({});

  const major = await Major.findOne({ majorCode: MAJOR_CODE });
  const totalCredits = subjectsData.reduce((sum, s) => sum + s.credits, 0);

  const curriculum = await Curriculum.create({
    code: `SEK${COHORT}`,
    name: `Chuong trinh dao tao Ky thuat phan mem Khoi ${COHORT}`,
    major: 'Ky thuat phan mem',
    majorId: major?._id,
    academicYear: ACADEMIC_YEAR,
    version: 1,
    status: 'active',
    totalCredits,
    totalCourses: subjectsData.length,
    useRelationalStructure: true,
  });

  console.log(`\n[SEK26] Curriculum: SEK${COHORT} | ${totalCredits} tin chi | ${subjectsData.length} mon\n`);

  const semesterWindows = buildCurriculumSemesterWindows(9);
  const semesterMap = {};
  for (let i = 1; i <= 9; i++) {
    const semSubs = subjectsData.filter(s => s.suggestedSemester === i);
    const semCredits = semSubs.reduce((sum, s) => sum + s.credits, 0);
    const win = semesterWindows[i - 1];
    const sem = await CurriculumSemester.create({
      curriculum: curriculum._id,
      name: `Hoc ky ${i}`,
      semesterOrder: i,
      credits: semCredits,
      startDate: win.startDate,
      endDate: win.endDate,
    });
    semesterMap[i] = sem._id;

    for (const subj of semSubs) {
      await CurriculumCourse.create({
        semester: sem._id,
        subject: subjectMap[subj.subjectCode],
        subjectCode: subj.subjectCode,
        subjectName: subj.subjectName,
        credits: subj.credits,
        hasPrerequisite: subj.prerequisites.length > 0,
      });
    }
    console.log(
      `[SEK26]   HK${i} ${formatYmdUtc(win.startDate)} -> ${formatYmdUtc(win.endDate)} | ${semSubs.map(s => s.subjectCode).join(', ')} (${semCredits}TC)`,
    );
  }

  return { curriculum, semesterMap };
}

async function seedStudents(curriculum) {
  await Student.deleteMany({ majorCode: MAJOR_CODE, cohort: COHORT });
  await ClassEnrollment.deleteMany({});

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const major = await Major.findOne({ majorCode: MAJOR_CODE });
  const students = [];

  for (let groupIdx = 0; groupIdx < CLASS_GROUPS.length; groupIdx++) {
    const group = CLASS_GROUPS[groupIdx];
    for (let j = 0; j < group.studentsPerGroup; j++) {
      const idx = groupIdx * group.studentsPerGroup + j;
      const fullName = studentNames[idx];
      const studentCode = `${MAJOR_CODE}${COHORT}${String(idx + 1).padStart(4, '0')}`;
      const email = buildStudentEmail(fullName, idx);

      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            password: passwordHash,
            fullName,
            role: 'student',
            authProvider: 'local',
            status: 'active',
            isActive: true,
            mustChangePassword: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      const student = await Student.create({
        studentCode,
        fullName,
        email,
        majorCode: MAJOR_CODE,
        majorId: major?._id,
        cohort: COHORT,
        classSection: group.groupCode,
        academicStatus: 'enrolled',
        enrollmentYear: 2026,
        curriculumId: curriculum._id,
        currentCurriculumSemester: CURRENT_SEMESTER,
        dateOfBirth: new Date(2006, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: fullName.includes('Thi') ? 'female' : 'male',
        userId: user._id,
        initialSystemPassword: PASSWORD,
        isActive: true,
      });

      students.push({ student, groupCode: group.groupCode, groupIndex: groupIdx });
    }
    console.log(`[SEK26] Group ${group.groupCode}: ${group.studentsPerGroup} students`);
  }
  console.log(`[SEK26] Total: ${students.length} students | Code: SE${COHORT}0001 - SE${COHORT}0030\n`);
  return students;
}

async function seedClassSectionsAndEnrollments(curriculum, students, subjectMap) {
  // Mon chia 3 nhom nho (groupIndex 0,1,2)
  const SPLIT_SUBJECTS = new Set(['SE101', 'SE102', 'SE103']);

  const classCodesToReplace = [];
  for (const subj of subjectsData) {
    if (SPLIT_SUBJECTS.has(subj.subjectCode)) {
      for (let g = 1; g <= 3; g += 1) {
        classCodesToReplace.push(`${subj.subjectCode}-${g}`);
      }
    } else {
      classCodesToReplace.push(`${subj.subjectCode}-1`);
    }
  }

  const existingSections = await ClassSection.find({ classCode: { $in: classCodesToReplace } }).select('_id');
  const existingIds = existingSections.map((s) => s._id);
  if (existingIds.length > 0) {
    await Schedule.deleteMany({ classSection: { $in: existingIds } });
    await ClassEnrollment.deleteMany({ classSection: { $in: existingIds } });
    await ClassSection.deleteMany({ _id: { $in: existingIds } });
  }

  await ClassSection.deleteMany({ curriculum: curriculum._id });

  const allEnrollments = [];

  for (const subj of subjectsData) {
    const subjectId = subjectMap[subj.subjectCode];

    if (SPLIT_SUBJECTS.has(subj.subjectCode)) {
      // 3 nhom nho, moi nhom 10 SV (tuong ung classGroup)
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const classCode = `${subj.subjectCode}-${gIdx + 1}`;
        const groupCode = CLASS_GROUPS[gIdx].groupCode;
        const studentIds = students.filter(s => s.groupIndex === gIdx).map(s => s.student._id);

        const classSec = await ClassSection.create({
          classCode,
          className: `${subj.subjectName} - Nhom ${gIdx + 1}`,
          subject: subjectId,
          teacher: (await Teacher.findOne({ teacherCode: subj.teacherCode }))?._id,
          semester: subj.suggestedSemester,
          academicYear: ACADEMIC_YEAR,
          maxCapacity: 10,
          currentEnrollment: studentIds.length,
          status: 'published',
          classGroup: groupCode,
          groupIndex: gIdx,
          curriculum: curriculum._id,
          curriculumSemesterOrder: subj.suggestedSemester,
        });

        allEnrollments.push(...studentIds.map(sid => ({
          classSection: classSec._id, student: sid,
          enrollmentDate: new Date(), status: 'enrolled',
        })));

        console.log(`[SEK26] ClassSection: ${classCode} -> ${groupCode} (${studentIds.length} SV)`);
      }
    } else {
      // 1 lop gom 30 SV, classGroup = SE26-ALL
      const classCode = `${subj.subjectCode}-1`;
      const studentIds = students.map(s => s.student._id);

      const classSec = await ClassSection.create({
        classCode,
        className: subj.subjectName,
        subject: subjectId,
        teacher: (await Teacher.findOne({ teacherCode: subj.teacherCode }))?._id,
        semester: subj.suggestedSemester,
        academicYear: ACADEMIC_YEAR,
        maxCapacity: 30,
        currentEnrollment: studentIds.length,
        status: 'published',
        classGroup: 'SE26-ALL',
        groupIndex: 0,
        curriculum: curriculum._id,
        curriculumSemesterOrder: subj.suggestedSemester,
      });

      allEnrollments.push(...studentIds.map(sid => ({
        classSection: classSec._id, student: sid,
        enrollmentDate: new Date(), status: 'enrolled',
      })));

      console.log(`[SEK26] ClassSection: ${classCode} -> SE26-ALL (HK${subj.suggestedSemester}, ${studentIds.length} SV)`);
    }
  }

  await ClassEnrollment.insertMany(allEnrollments);
  console.log(`\n[SEK26] ${allEnrollments.length} enrollments created`);
}

// ===== MAIN =====
async function seed() {
  try {
    await connectDB();
    console.log('\n========================================');
    console.log('  SE K26 SEED SCRIPT');
    console.log('  Major: SE | Cohort: K26 | Year: 2026-2027');
    console.log('========================================\n');

    const major = await Major.findOne({ majorCode: MAJOR_CODE });
    if (!major) {
      console.error('[SEK26] Major SE not found! Please run seedFacultiesAndMajors.js first.');
      process.exit(1);
    }
    console.log(`[SEK26] Major found: ${major.majorName}\n`);

    // Step 1: Teachers
    console.log('--- TEACHERS ---');
    const teacherMap = await seedTeachers();
    console.log('');

    // Step 2: Subjects
    console.log('--- SUBJECTS ---');
    const subjectMap = await seedSubjects(teacherMap);
    console.log('');

    // Step 3: Curriculum
    console.log('--- CURRICULUM ---');
    const { curriculum } = await seedCurriculum(subjectMap);
    console.log('');

    // Step 4: Students
    console.log('--- STUDENTS ---');
    const students = await seedStudents(curriculum);
    console.log('');

    // Step 5: ClassSections + Enrollments
    console.log('--- CLASS SECTIONS + ENROLLMENTS ---');
    await seedClassSectionsAndEnrollments(curriculum, students, subjectMap);
    console.log('');

    // Step 6: Thoi khoa bieu xen ke + ngay theo tung ky khung CT
    console.log('--- SCHEDULES (TKB xen ke) ---');
    await seedAlternatingSchedules(curriculum);

    // Summary
    const classSections = await ClassSection.find({ curriculum: curriculum._id });
    const enrollments = await ClassEnrollment.countDocuments();
    const scheduleCount = await Schedule.countDocuments({
      classSection: { $in: classSections.map((c) => c._id) },
      status: 'active',
    });

    console.log('\n========================================');
    console.log('  SEED SUMMARY');
    console.log('========================================');
    console.log(`  Khoa:          CNTT - Cong nghe thong tin`);
    console.log(`  Nganh:         SE - Ky thuat phan mem`);
    console.log(`  Khoa hoc:      K${COHORT} (${ACADEMIC_YEAR})`);
    console.log(`  Hoc ky HT:     HK${CURRENT_SEMESTER}`);
    console.log(`  Tong mon:      ${subjectsData.length}`);
    console.log(`  Tong tin chi:  ${subjectsData.reduce((s, x) => s + x.credits, 0)}`);
    console.log(`  Tong GV:       ${teachersData.length}`);
    console.log(`  Tong SV:       ${students.length}`);
    console.log(`  Tong lop HP:   ${classSections.length}`);
    console.log(`  Tong enroll:   ${enrollments}`);
    console.log(`  Tong Schedule: ${scheduleCount}`);
    console.log(`  Default pass:  ${PASSWORD}`);
    console.log('========================================\n');
    console.log('[SEK26] Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n[SEK26] Seed failed:', err);
    process.exit(1);
  }
}

seed();
