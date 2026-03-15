const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const { connectDB } = require('../src/configs/db.config');
const User = require('../src/models/user.model');
const Teacher = require('../src/models/teacher.model');
const Role = require('../src/models/role.model');
const UserRole = require('../src/models/userRole.model');
const { VALID_USER_ROLES, normalizeRole } = require('../src/utils/role.util');

const CANONICAL_ROLES = [
  {
    roleCode: 'admin',
    roleName: 'Admin',
    description: 'System administrators',
  },
  {
    roleCode: 'staff',
    roleName: 'Staff',
    description: 'Administrative and academic operations staff',
  },
  {
    roleCode: 'student',
    roleName: 'Student',
    description: 'Students',
  },
  {
    roleCode: 'lecturer',
    roleName: 'Lecturer',
    description: 'Lecturers and teaching staff',
  },
];

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

async function summarize() {
  const [usersByRole, activeRoles, userRolesByCode, teacherStats] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Role.find({ isActive: true }, 'roleCode roleName isSystemRole isActive').sort({ roleCode: 1 }).lean(),
    UserRole.aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'roleDoc',
        },
      },
      { $unwind: '$roleDoc' },
      {
        $group: {
          _id: '$roleDoc.roleCode',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Teacher.aggregate([
      {
        $group: {
          _id: {
            hasUserId: {
              $cond: [{ $and: [{ $ne: ['$userId', null] }, { $ifNull: ['$userId', false] }] }, true, false],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    usersByRole,
    activeRoles,
    userRolesByCode,
    teacherStats,
  };
}

async function ensureCanonicalRoles() {
  const roleMap = new Map();

  for (const role of CANONICAL_ROLES) {
    const doc = await Role.findOneAndUpdate(
      { roleCode: role.roleCode },
      {
        $set: {
          roleName: role.roleName,
          description: role.description,
          isSystemRole: true,
          isActive: true,
        },
        $setOnInsert: {
          roleCode: role.roleCode,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    roleMap.set(role.roleCode, doc);
  }

  return roleMap;
}

async function normalizeTeacherLinkedUsers() {
  const teachers = await Teacher.find({}, 'email userId').lean();
  const teacherUserIds = teachers
    .map((teacher) => teacher.userId)
    .filter(Boolean);
  const teacherEmails = teachers
    .map((teacher) => normalizeEmail(teacher.email))
    .filter(Boolean);

  const filters = [];
  if (teacherUserIds.length > 0) {
    filters.push({ _id: { $in: teacherUserIds } });
  }
  if (teacherEmails.length > 0) {
    filters.push({ email: { $in: teacherEmails } });
  }

  if (filters.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const result = await User.updateMany(
    { $or: filters },
    { $set: { role: 'lecturer' } },
  );

  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
}

async function normalizeTeacherAliasUsers() {
  const result = await User.updateMany(
    { role: { $regex: /^teacher$/i } },
    { $set: { role: 'lecturer' } },
  );

  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
}

async function backfillTeacherUserLinks() {
  const teachersWithoutUserId = await Teacher.find({
    $or: [{ userId: null }, { userId: { $exists: false } }],
  });

  let linkedCount = 0;

  for (const teacher of teachersWithoutUserId) {
    const normalizedEmail = normalizeEmail(teacher.email);
    if (!normalizedEmail) continue;

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) continue;

    teacher.userId = user._id;
    await teacher.save();

    if (normalizeRole(user.role) !== 'lecturer') {
      user.role = 'lecturer';
      await user.save();
    }

    linkedCount += 1;
  }

  return {
    scanned: teachersWithoutUserId.length,
    linkedCount,
  };
}

async function normalizeRoleDocuments(roleMap) {
  const lecturerRole = roleMap.get('lecturer');
  const allRoles = await Role.find({});

  let teacherRoleDocsDisabled = 0;
  let userRolesRepointed = 0;
  let invalidRolesDisabled = 0;

  for (const role of allRoles) {
    const rawRoleCode = String(role.roleCode || '').trim();
    const normalizedRoleCode = normalizeRole(rawRoleCode);

    if (!rawRoleCode) {
      if (role.isActive !== false) {
        await Role.updateOne({ _id: role._id }, { $set: { isActive: false } });
        invalidRolesDisabled += 1;
      }
      continue;
    }

    if (rawRoleCode.toLowerCase() === 'teacher') {
      if (lecturerRole && String(role._id) !== String(lecturerRole._id)) {
        const result = await UserRole.updateMany(
          { role: role._id },
          { $set: { role: lecturerRole._id } },
        );
        userRolesRepointed += result.modifiedCount || 0;
      }

      if (role.isActive !== false) {
        await Role.updateOne(
          { _id: role._id },
          {
            $set: {
              isActive: false,
              description: role.description || 'Legacy teacher role merged into lecturer',
            },
          },
        );
        teacherRoleDocsDisabled += 1;
      }

      continue;
    }

    if (!VALID_USER_ROLES.includes(normalizedRoleCode) && role.isActive !== false) {
      await Role.updateOne({ _id: role._id }, { $set: { isActive: false } });
      invalidRolesDisabled += 1;
    }
  }

  return {
    teacherRoleDocsDisabled,
    userRolesRepointed,
    invalidRolesDisabled,
  };
}

async function main() {
  await connectDB();

  const before = await summarize();
  const roleMap = await ensureCanonicalRoles();
  const teacherLinkedUsers = await normalizeTeacherLinkedUsers();
  const teacherAliasUsers = await normalizeTeacherAliasUsers();
  const teacherLinks = await backfillTeacherUserLinks();
  const roleDocs = await normalizeRoleDocuments(roleMap);
  const invalidUsers = await User.find(
    {
      role: {
        $nin: VALID_USER_ROLES,
      },
    },
    'email fullName role',
  ).lean();
  const after = await summarize();

  console.log(
    JSON.stringify(
      {
        before,
        changes: {
          teacherLinkedUsers,
          teacherAliasUsers,
          teacherLinks,
          roleDocs,
          invalidUsers,
        },
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
