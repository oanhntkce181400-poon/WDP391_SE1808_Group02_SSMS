const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('../src/models/teacher.model');
const Student = require('../src/models/student.model');
const User = require('../src/models/user.model');
const { normalizeRole } = require('../src/utils/role.util');

const DEFAULT_PASSWORDS = {
  lecturer: 'Teacher@123',
  student: '123456',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function desiredStatus(isActive) {
  return isActive === false ? 'inactive' : 'active';
}

async function createUserForProfile(profile, role, actorId = null) {
  const email = normalizeEmail(profile.email);
  const password = DEFAULT_PASSWORDS[role] || '123456';
  const hashedPassword = await bcrypt.hash(password, 12);

  return User.create({
    email,
    password: hashedPassword,
    fullName: profile.fullName,
    authProvider: 'local',
    role,
    isActive: profile.isActive !== false,
    status: desiredStatus(profile.isActive),
    mustChangePassword: true,
    ...(actorId ? { updatedBy: actorId, createdBy: actorId } : {}),
  });
}

async function findConflictingProfile(Model, currentProfileId, userId) {
  return Model.findOne({
    _id: { $ne: currentProfileId },
    userId,
  })
    .select('_id')
    .lean();
}

async function synchronizeProfile(Model, profile, role, orphanCandidates) {
  const email = normalizeEmail(profile.email);
  const result = {
    code: profile.teacherCode || profile.studentCode || String(profile._id),
    email,
    role,
    createdUser: false,
    relinkedUser: false,
    updatedUser: false,
    updatedProfile: false,
    error: null,
  };

  let linkedUser = profile.userId ? await User.findById(profile.userId) : null;
  const emailUser = email ? await User.findOne({ email }) : null;

  if (emailUser && normalizeRole(emailUser.role) !== role) {
    result.error = `email belongs to another role: ${emailUser.role}`;
    return result;
  }

  if (emailUser && (!linkedUser || String(emailUser._id) !== String(linkedUser._id))) {
    const conflictingProfile = await findConflictingProfile(Model, profile._id, emailUser._id);
    if (conflictingProfile) {
      result.error = `email user already linked to another ${role} profile`;
      return result;
    }

    if (linkedUser) {
      orphanCandidates.add(String(linkedUser._id));
    }

    linkedUser = emailUser;
    profile.userId = emailUser._id;
    result.relinkedUser = true;
    result.updatedProfile = true;
  }

  if (!linkedUser) {
    linkedUser = await createUserForProfile(profile, role);
    profile.userId = linkedUser._id;
    result.createdUser = true;
    result.updatedProfile = true;
  }

  const userPatch = {};
  if (email && normalizeEmail(linkedUser.email) !== email) userPatch.email = email;
  if (normalizeRole(linkedUser.role) !== role) userPatch.role = role;
  if (String(linkedUser.fullName || '') !== String(profile.fullName || '')) {
    userPatch.fullName = profile.fullName;
  }

  const expectedIsActive = profile.isActive !== false;
  if (Boolean(linkedUser.isActive) !== expectedIsActive) {
    userPatch.isActive = expectedIsActive;
  }

  const expectedStatus = desiredStatus(profile.isActive);
  if (String(linkedUser.status || '') !== expectedStatus) {
    userPatch.status = expectedStatus;
  }

  if (Object.keys(userPatch).length > 0) {
    await User.findByIdAndUpdate(linkedUser._id, { $set: userPatch });
    result.updatedUser = true;
  }

  if (profile.isModified()) {
    await profile.save();
    result.updatedProfile = true;
  }

  return result;
}

async function deactivateDisplacedUsers(userIds) {
  let deactivated = 0;

  for (const userId of userIds) {
    const [teacherRef, studentRef] = await Promise.all([
      Teacher.findOne({ userId }).select('_id').lean(),
      Student.findOne({ userId }).select('_id').lean(),
    ]);

    if (teacherRef || studentRef) {
      continue;
    }

    const user = await User.findById(userId);
    if (!user) continue;

    if (normalizeRole(user.role) === 'lecturer' && user.isActive !== false) {
      user.isActive = false;
      user.status = 'inactive';
      await user.save();
      deactivated += 1;
    }
  }

  return deactivated;
}

async function auditIntegrity() {
  const [teachers, students, users] = await Promise.all([
    Teacher.find({}).select('teacherCode email userId').lean(),
    Student.find({}).select('studentCode email userId').lean(),
    User.find({}).select('_id email role').lean(),
  ]);

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const userByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user]).filter(([email]) => Boolean(email)),
  );

  const teacherIssues = teachers.reduce(
    (acc, teacher) => {
      const linkedUser = teacher.userId ? userById.get(String(teacher.userId)) : null;
      const emailUser = userByEmail.get(normalizeEmail(teacher.email));
      if (!teacher.userId) acc.missingUserId += 1;
      if (teacher.userId && !linkedUser) acc.brokenUserId += 1;
      if (!emailUser) acc.missingUserByEmail += 1;
      if (linkedUser && normalizeRole(linkedUser.role) !== 'lecturer') acc.wrongRole += 1;
      if (
        linkedUser &&
        emailUser &&
        String(linkedUser._id) !== String(emailUser._id)
      ) {
        acc.emailMismatch += 1;
      }
      return acc;
    },
    { missingUserId: 0, brokenUserId: 0, missingUserByEmail: 0, wrongRole: 0, emailMismatch: 0 },
  );

  const studentIssues = students.reduce(
    (acc, student) => {
      const linkedUser = student.userId ? userById.get(String(student.userId)) : null;
      const emailUser = userByEmail.get(normalizeEmail(student.email));
      if (!student.userId) acc.missingUserId += 1;
      if (student.userId && !linkedUser) acc.brokenUserId += 1;
      if (!emailUser) acc.missingUserByEmail += 1;
      if (linkedUser && normalizeRole(linkedUser.role) !== 'student') acc.wrongRole += 1;
      if (
        linkedUser &&
        emailUser &&
        String(linkedUser._id) !== String(emailUser._id)
      ) {
        acc.emailMismatch += 1;
      }
      return acc;
    },
    { missingUserId: 0, brokenUserId: 0, missingUserByEmail: 0, wrongRole: 0, emailMismatch: 0 },
  );

  const usersWithoutTeacherProfile = users.filter(
    (user) =>
      normalizeRole(user.role) === 'lecturer' &&
      !teachers.some((teacher) => String(teacher.userId || '') === String(user._id)),
  ).length;

  const usersWithoutStudentProfile = users.filter(
    (user) =>
      normalizeRole(user.role) === 'student' &&
      !students.some((student) => String(student.userId || '') === String(user._id)),
  ).length;

  return {
    teacherIssues,
    studentIssues,
    usersWithoutTeacherProfile,
    usersWithoutStudentProfile,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
    appName: process.env.MONGODB_APP_NAME,
  });

  const before = await auditIntegrity();
  const orphanCandidates = new Set();

  const teachers = await Teacher.find({});
  const teacherResults = [];
  for (const teacher of teachers) {
    teacherResults.push(await synchronizeProfile(Teacher, teacher, 'lecturer', orphanCandidates));
  }

  const students = await Student.find({});
  const studentResults = [];
  for (const student of students) {
    studentResults.push(await synchronizeProfile(Student, student, 'student', orphanCandidates));
  }

  const deactivatedDisplacedLecturerUsers = await deactivateDisplacedUsers(orphanCandidates);
  const after = await auditIntegrity();

  const summary = {
    before,
    actions: {
      teacherCreatedUsers: teacherResults.filter((item) => item.createdUser).length,
      teacherRelinkedUsers: teacherResults.filter((item) => item.relinkedUser).length,
      teacherUpdatedUsers: teacherResults.filter((item) => item.updatedUser).length,
      teacherUpdatedProfiles: teacherResults.filter((item) => item.updatedProfile).length,
      teacherErrors: teacherResults.filter((item) => item.error).length,
      studentCreatedUsers: studentResults.filter((item) => item.createdUser).length,
      studentRelinkedUsers: studentResults.filter((item) => item.relinkedUser).length,
      studentUpdatedUsers: studentResults.filter((item) => item.updatedUser).length,
      studentUpdatedProfiles: studentResults.filter((item) => item.updatedProfile).length,
      studentErrors: studentResults.filter((item) => item.error).length,
      deactivatedDisplacedLecturerUsers,
    },
    after,
    teacherErrors: teacherResults.filter((item) => item.error),
    studentErrors: studentResults.filter((item) => item.error),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
