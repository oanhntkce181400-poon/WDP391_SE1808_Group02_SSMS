const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
const RolePermission = require('../../models/rolePermission.model');

const ACTOR_PERMISSIONS = [
  {
    permCode: 'actors:read',
    permName: 'View roles and permissions',
    module: 'actors',
    action: 'read',
    description: 'Allow viewing actor (role/permission) data.',
  },
  {
    permCode: 'actors:write',
    permName: 'Manage roles and permissions',
    module: 'actors',
    action: 'write',
    description: 'Allow creating and updating roles/permissions.',
  },
];

function findAdminRole() {
  return Role.findOne({
    roleCode: { $in: ['ADMIN', 'admin'] },
    isActive: true,
  });
}

async function up() {
  const createdPermissions = [];

  for (const perm of ACTOR_PERMISSIONS) {
    // Upsert keeps the migration idempotent across the team.
    // eslint-disable-next-line no-await-in-loop
    const doc = await Permission.findOneAndUpdate(
      { permCode: perm.permCode },
      {
        $set: {
          permName: perm.permName,
          module: perm.module,
          action: perm.action,
          description: perm.description,
          isActive: true,
        },
        $setOnInsert: {
          permCode: perm.permCode,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    createdPermissions.push(doc);
  }

  const adminRole = await findAdminRole();
  if (!adminRole) {
    // No admin role yet; skip linking. This is safe for fresh databases.
    return;
  }

  for (const perm of createdPermissions) {
    // eslint-disable-next-line no-await-in-loop
    await RolePermission.updateOne(
      {
        role: adminRole._id,
        permission: perm._id,
      },
      {
        $setOnInsert: {
          createdBy: null,
        },
      },
      { upsert: true },
    );
  }
}

async function down() {
  const permCodes = ACTOR_PERMISSIONS.map((p) => p.permCode);
  const permissions = await Permission.find({ permCode: { $in: permCodes } });
  const permIds = permissions.map((p) => p._id);

  if (permIds.length > 0) {
    await RolePermission.deleteMany({ permission: { $in: permIds } });
  }

  await Permission.deleteMany({ permCode: { $in: permCodes } });
}

module.exports = {
  id: '20260127-actors-permissions',
  description: 'Seed base actors permissions for RBAC.',
  up,
  down,
};

