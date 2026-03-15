require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('./src/configs/db.config');
const Teacher = require('./src/models/teacher.model');
const User = require('./src/models/user.model');

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const DEFAULT_TEACHER_PASSWORD = process.env.DEFAULT_TEACHER_PASSWORD || 'Teacher@123';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function findUserByEmailCaseInsensitive(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const exact = await User.findOne({ email: normalized });
  if (exact) return exact;

  return User.findOne({ email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
}

async function backfillTeacherAccounts() {
  await connectDB();

  const teachers = await Teacher.find({ $or: [{ userId: null }, { userId: { $exists: false } }] });
  if (teachers.length === 0) {
    console.log('No teachers missing userId. Nothing to do.');
    return;
  }

  const teacherPasswordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, PASSWORD_SALT_ROUNDS);

  let linkedExisting = 0;
  let createdNew = 0;
  let skipped = 0;

  for (const teacher of teachers) {
    const normalizedEmail = normalizeEmail(teacher.email);
    if (!normalizedEmail) {
      skipped += 1;
      continue;
    }

    let user = await findUserByEmailCaseInsensitive(normalizedEmail);
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        password: teacherPasswordHash,
        fullName: teacher.fullName,
        role: 'lecturer',
        authProvider: 'local',
        status: teacher.isActive === false ? 'inactive' : 'active',
        isActive: teacher.isActive !== false,
        mustChangePassword: true,
        avatarUrl: teacher.avatarUrl || undefined,
      });
      createdNew += 1;
    } else {
      linkedExisting += 1;
    }

    teacher.email = normalizedEmail;
    teacher.userId = user._id;
    await teacher.save();
  }

  console.log(`Backfill complete: ${teachers.length} teachers processed.`);
  console.log(`- Linked existing users: ${linkedExisting}`);
  console.log(`- Created new users: ${createdNew}`);
  console.log(`- Skipped (invalid email): ${skipped}`);
  console.log(`Default password for newly-created accounts: ${DEFAULT_TEACHER_PASSWORD}`);
}

backfillTeacherAccounts()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Backfill failed:', err);
    await mongoose.connection.close();
    process.exit(1);
  });
