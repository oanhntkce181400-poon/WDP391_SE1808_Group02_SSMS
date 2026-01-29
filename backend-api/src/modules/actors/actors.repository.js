const mongoose = require('mongoose');
const Role = require('../../models/role.model');
const Permission = require('../../models/permission.model');
const RolePermission = require('../../models/rolePermission.model');

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

async function listRoles() {
  return Role.find({ isActive: true }).sort({ roleCode: 1 }).lean();
}

async function listPermissions() {
  return Permission.find({ isActive: true }).sort({ module: 1, action: 1 }).lean();
}

async function findRoleById(roleId) {
  const _id = toObjectId(roleId);
  if (!_id) return null;
  return Role.findById(_id);
}

async function createRole(data) {
  return Role.create(data);
}

async function updateRole(roleId, updates) {
  const _id = toObjectId(roleId);
  if (!_id) return null;
  return Role.findByIdAndUpdate(_id, updates, { new: true, runValidators: true });
}

async function createPermission(data) {
  return Permission.create(data);
}

async function updatePermission(permissionId, updates) {
  const _id = toObjectId(permissionId);
  if (!_id) return null;
  return Permission.findByIdAndUpdate(_id, updates, { new: true, runValidators: true });
}

async function findPermissionsByIds(ids = []) {
  const objectIds = ids.map(toObjectId).filter(Boolean);
  if (objectIds.length === 0) return [];
  return Permission.find({ _id: { $in: objectIds }, isActive: true });
}

async function findPermissionsByCodes(codes = []) {
  const normalizedCodes = codes
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter(Boolean);
  if (normalizedCodes.length === 0) return [];
  return Permission.find({ permCode: { $in: normalizedCodes }, isActive: true });
}

async function listRolePermissions(roleIds = []) {
  const objectIds = roleIds.map(toObjectId).filter(Boolean);
  if (objectIds.length === 0) return [];

  return RolePermission.find({ role: { $in: objectIds } })
    .populate({ path: 'permission', match: { isActive: true } })
    .lean();
}

async function replaceRolePermissions(roleId, permissionIds = [], actorUserId) {
  const roleObjectId = toObjectId(roleId);
  if (!roleObjectId) return { created: 0 };

  const dedupedPermissionIds = Array.from(
    new Set(permissionIds.map((id) => String(id)).filter(Boolean)),
  )
    .map(toObjectId)
    .filter(Boolean);

  if (!dedupedPermissionIds.length) {
    await RolePermission.deleteMany({ role: roleObjectId });
    return { created: 0 };
  }

  try {
    const ops = dedupedPermissionIds.map((permId) => ({
      updateOne: {
        filter: { role: roleObjectId, permission: permId },
        update: {
          $setOnInsert: {
            role: roleObjectId,
            permission: permId,
            createdBy: toObjectId(actorUserId),
          },
        },
        upsert: true,
      },
    }));

    const result = await RolePermission.bulkWrite(ops, { ordered: false });
    await RolePermission.deleteMany({
      role: roleObjectId,
      permission: { $nin: dedupedPermissionIds },
    });

    const created = result?.upsertedCount ?? result?.nUpserted ?? 0;
    return { created };
  } catch (err) {
    return { created: err?.result?.nUpserted ?? 0, warning: err.message };
  }
}

module.exports = {
  listRoles,
  listPermissions,
  findRoleById,
  createRole,
  updateRole,
  createPermission,
  updatePermission,
  findPermissionsByIds,
  findPermissionsByCodes,
  listRolePermissions,
  replaceRolePermissions,
  toObjectId,
};
