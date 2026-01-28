require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { fakerVI } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../../configs/db.config');
const User = require('../../models/user.model');
const Student = require('../../models/student.model');
const Teacher = require('../../models/teacher.model');
const Room = require('../../models/room.model');
const Device = require('../../models/device.model');
const Subject = require('../../models/subject.model');
const Curriculum = require('../../models/curriculum.model');
const Major = require('../../models/major.model');

const faker = fakerVI;

faker.seed(20250127);

const MAJORS = [
  { 
    code: 'SE', 
    name: 'Kỹ thuật phần mềm', 
    nameEn: 'Software Engineering', 
    faculty: 'Khoa Công nghệ thông tin',
    studentCount: 1245
  },
  { 
    code: 'AI', 
    name: 'Trí tuệ nhân tạo', 
    nameEn: 'Artificial Intelligence', 
    faculty: 'Khoa Công nghệ thông tin',
    studentCount: 450
  },
  { 
    code: 'IB', 
    name: 'Kinh doanh quốc tế', 
    nameEn: 'International Business', 
    faculty: 'Khoa Kinh tế và Luật',
    studentCount: 890
  },
  { 
    code: 'GD', 
    name: 'Thiết kế đồ họa', 
    nameEn: 'Graphic Design', 
    faculty: 'Khoa Ngôn ngữ anh',
    studentCount: 320
  },
  { 
    code: 'OLD_IT', 
    name: 'Tin học ứng dụng (Cũ)', 
    nameEn: 'Applied Informatics', 
    faculty: 'Khoa Công nghệ thông tin',
    studentCount: 0
  },
];

// Dữ liệu mẫu cho các khóa sau này
const COHORTS = [16, 17, 18, 19, 20];

const DOMAIN = 'fpt.edu.vn';
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const BCRYPT_REGEX = /^\$2[aby]\$/;

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

function buildStudentEmail(fullName, majorCode, cohort, suffixNumber) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = normalizeText(parts[parts.length - 1]);
  const initials = normalizeText(parts.slice(0, -1).map((p) => p[0]).join(''));
  const major = majorCode.toLowerCase();
  const cohortText = String(cohort);
  const suffix = String(suffixNumber).padStart(4, '0');
  return `${firstName}${initials}${major}${cohortText}${suffix}@${DOMAIN}`;
}

function buildStudentCode(majorCode, cohort, suffixNumber) {
  return `${majorCode}${cohort}${String(suffixNumber).padStart(4, '0')}`;
}

function buildTeacherEmail(fullName, suffixNumber) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = normalizeText(parts[parts.length - 1]);
  const initials = normalizeText(parts.slice(0, -1).map((p) => p[0]).join(''));
  return `${firstName}${initials}gv${String(suffixNumber).padStart(4, '0')}@${DOMAIN}`;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function parseDiagramTables(xmlContent) {
  const cells = xmlContent.match(/<mxCell[^>]*>/g) || [];
  const parsed = cells.map((cell) => {
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match = attrRegex.exec(cell);
    while (match) {
      attrs[match[1]] = match[2];
      match = attrRegex.exec(cell);
    }
    return {
      id: attrs.id,
      parent: attrs.parent,
      style: attrs.style || '',
      value: attrs.value || '',
    };
  });

  const tableCells = parsed.filter((cell) => cell.style.includes('swimlane') && cell.value);
  const tableIdMap = new Map(tableCells.map((cell) => [cell.id, cell.value]));
  const tables = {};

  parsed.forEach((cell) => {
    if (!cell.parent || !tableIdMap.has(cell.parent)) return;
    if (!cell.value || !cell.value.includes(':')) return;

    const rawField = cell.value.split(':')[0];
    const fieldName = rawField.replace(/[^\w]+/g, '').replace(/^_+|_+$/g, '');
    if (!fieldName) return;

    const tableName = tableIdMap.get(cell.parent);
    if (!tables[tableName]) {
      tables[tableName] = [];
    }

    tables[tableName].push({
      name: fieldName,
      raw: cell.value,
    });
  });

  return tables;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date) {
  return date.toTimeString().slice(0, 8);
}

function fakeValue(fieldName, rawType) {
  const lower = fieldName.toLowerCase();

  if (lower.includes('email')) return faker.internet.email();
  if (lower.includes('phone')) return faker.phone.number('0#########');
  if (lower.includes('date')) return formatDate(faker.date.past({ years: 2 }));
  if (lower.includes('time')) return formatTime(faker.date.recent());
  if (lower.includes('name')) return faker.person.fullName();
  if (lower.includes('code')) return faker.string.alphanumeric({ length: 6, casing: 'upper' });
  if (lower.includes('status')) return randomFrom(['active', 'inactive', 'pending']);
  if (lower.startsWith('is_')) return faker.datatype.boolean();

  const type = rawType.toUpperCase();
  if (type.includes('BOOLEAN')) return faker.datatype.boolean();
  if (type.includes('DATE')) return formatDate(faker.date.past({ years: 3 }));
  if (type.includes('TIME')) return formatTime(faker.date.recent());
  if (type.includes('INT') || type.includes('SERIAL')) {
    return faker.number.int({ min: 1, max: 10000 });
  }
  if (type.includes('TEXT') || type.includes('VARCHAR')) {
    return faker.lorem.words({ min: 2, max: 5 });
  }

  return faker.lorem.word();
}

async function seedAdmin() {
  const adminEmail = 'admin@example.com';
  const adminPlainPassword = '123456';
  const adminPasswordHash = await bcrypt.hash(adminPlainPassword, PASSWORD_SALT_ROUNDS);

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      password: adminPasswordHash,
      fullName: 'System Admin',
      role: 'admin',
      authProvider: 'local',
      mustChangePassword: false,
    });
    console.log('Seeded admin user:', adminEmail);
    return;
  }

  const needsHashUpdate = existingAdmin.password && !BCRYPT_REGEX.test(String(existingAdmin.password));
  if (needsHashUpdate) {
    await User.updateOne(
      { _id: existingAdmin._id },
      {
        $set: {
          password: adminPasswordHash,
          authProvider: 'local',
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      },
    );
    console.log('Updated admin password to bcrypt hash.');
  } else {
    console.log('Admin user already exists, skip seeding.');
  }
}

async function seedCurriculums(subjects) {
  const curricula = [];
  for (const cohort of COHORTS) {
    const curriculumCode = `K${cohort}`;
    const pickedSubjects = faker.helpers.arrayElements(subjects, faker.number.int({ min: 20, max: 30 }));
    const curriculum = await Curriculum.create({
      curriculumCode,
      cohort,
      title: `Curriculum ${curriculumCode}`,
      subjects: pickedSubjects.map((s) => s._id),
    });
    curricula.push(curriculum);
  }
  return curricula;
}

async function seedSubjects() {
  const subjects = [];
  for (let i = 0; i < 50; i += 1) {
    const major = randomFrom(MAJORS);
    const subjectCode = `SUB${String(i + 1).padStart(3, '0')}`;
    const subjectName = `${faker.hacker.noun()} ${faker.hacker.verb()} ${faker.hacker.adjective()}`;
    const credits = faker.number.int({ min: 2, max: 5 });
    subjects.push({
      subjectCode,
      subjectName,
      credits,
      majorCode: major.code,
    });
  }
  return Subject.insertMany(subjects);
}

async function seedMajors() {
  await Major.deleteMany({});
  const majorsToSeed = MAJORS.map((major, index) => ({
    majorCode: major.code,
    majorName: major.name,
    majorNameEn: major.nameEn,
    faculty: major.faculty,
    studentCount: major.studentCount || 0,
    isActive: index < 4, // 4 ngành đầu đang đào tạo, ngành cuối ngừng tuyển sinh
  }));
  return Major.insertMany(majorsToSeed);
}

async function seedRooms() {
  const rooms = [];
  for (let i = 0; i < 50; i += 1) {
    const floor = faker.number.int({ min: 1, max: 5 });
    const roomNumber = faker.number.int({ min: 100, max: 599 });
    const roomCode = `R${floor}${roomNumber}`;
    rooms.push({
      roomCode,
      roomName: `Room ${roomCode}`,
      roomType: randomFrom(['Lab', 'Lecture', 'Meeting']),
      capacity: faker.number.int({ min: 20, max: 80 }),
    });
  }
  return Room.insertMany(rooms);
}

async function seedDevices(rooms) {
  const devices = [];
  for (let i = 0; i < 200; i += 1) {
    const room = randomFrom(rooms);
    const deviceCode = `DEV${String(i + 1).padStart(4, '0')}`;
    devices.push({
      deviceCode,
      deviceName: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      status: randomFrom(['available', 'in-use', 'maintenance']),
      room: room._id,
    });
  }
  return Device.insertMany(devices);
}

async function seedTeachers() {
  const teachers = [];
  for (let i = 0; i < 100; i += 1) {
    const fullName = faker.person.fullName();
    const department = randomFrom(MAJORS).name;
    const teacherCode = `GV${String(i + 1).padStart(4, '0')}`;
    teachers.push({
      teacherCode,
      fullName,
      email: buildTeacherEmail(fullName, i + 1),
      department,
    });
  }
  return Teacher.insertMany(teachers);
}

async function seedStudents(curriculums) {
  const curriculumMap = new Map(curriculums.map((c) => [c.cohort, c]));
  const students = [];
  const suffixCounters = new Map();

  function nextSuffix(majorCode, cohort) {
    const key = `${majorCode}-${cohort}`;
    const current = suffixCounters.get(key) || 999;
    const next = current + 1;
    suffixCounters.set(key, next);
    return next;
  }

  for (let i = 0; i < 1000; i += 1) {
    const major = randomFrom(MAJORS);
    const cohort = randomFrom(COHORTS);
    const fullName = faker.person.fullName();
    const suffixNumber = nextSuffix(major.code, cohort);
    const studentCode = buildStudentCode(major.code, cohort, suffixNumber);
    const email = buildStudentEmail(fullName, major.code, cohort, suffixNumber);
    const curriculum = curriculumMap.get(cohort);

    students.push({
      studentCode,
      fullName,
      email,
      majorCode: major.code,
      cohort,
      curriculum: curriculum._id,
    });
  }

  // Use ordered: false and tolerate duplicate key errors so the rest of seeding continues.
  try {
    return await Student.insertMany(students, { ordered: false });
  } catch (err) {
    if (err?.code === 11000) {
      console.warn('Duplicate student detected during seeding. Continuing...');
      return [];
    }
    throw err;
  }
}

async function seedMissingTablesFromDiagram() {
  const xmlPath = path.join(__dirname, '..', '..', '..', 'DATABASESeed.drawio.xml');
  if (!fs.existsSync(xmlPath)) {
    console.log('笞・・ DATABASESeed.drawio.xml not found, skip generic seeding.');
    return;
  }

  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const tables = parseDiagramTables(xmlContent);
  const skipTables = new Set([
    'users',
    'students',
    'teachers',
    'subjects',
    'devices',
    'rooms',
    'curriculums',
    'majors',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'refresh_tokens',
    'password_reset_otps',
    'device_sessions',
    'login_events',
    'audit_logs',
  ]);

  const tableNames = Object.keys(tables);
  for (const tableName of tableNames) {
    if (skipTables.has(tableName)) continue;
    const fields = tables[tableName] || [];
    if (fields.length === 0) continue;

    const docs = Array.from({ length: 20 }).map(() => {
      const doc = {};
      fields.forEach((field) => {
        doc[field.name] = fakeValue(field.name, field.raw);
      });
      doc._seededAt = new Date();
      return doc;
    });

    await mongoose.connection.collection(tableName).deleteMany({});
    await mongoose.connection.collection(tableName).insertMany(docs);
  }
}

async function seed() {
  await connectDB();

  await Promise.all([
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Room.deleteMany({}),
    Device.deleteMany({}),
    Subject.deleteMany({}),
    Curriculum.deleteMany({}),
    Major.deleteMany({}),
  ]);

  await seedMajors();
  const subjects = await seedSubjects();
  const curriculums = await seedCurriculums(subjects);
  const rooms = await seedRooms();

  await Promise.all([
    seedDevices(rooms),
    seedTeachers(),
    seedStudents(curriculums),
  ]);

  await seedAdmin();
  await seedMissingTablesFromDiagram();
}

seed()
  .then(() => {
    console.log('脂 Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('笶・Seeding failed:', err);
    process.exit(1);
  });

