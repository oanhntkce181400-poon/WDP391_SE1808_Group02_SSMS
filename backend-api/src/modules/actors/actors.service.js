const repo = require('./actors.repository');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatPermission(permissionDoc) {
  if (!permissionDoc) return null;
  return {
    id: String(permissionDoc._id),
    permCode: permissionDoc.permCode,
    permName: permissionDoc.permName,
    module: permissionDoc.module,
    action: permissionDoc.action,
    description: permissionDoc.description,
  };
}

function formatRole(roleDoc, permissions = []) {
  return {
    id: String(roleDoc._id),
    roleCode: roleDoc.roleCode,
    roleName: roleDoc.roleName,
    description: roleDoc.description,
    isSystemRole: Boolean(roleDoc.isSystemRole),
    isActive: roleDoc.isActive !== false,
    permissions,
    createdAt: roleDoc.createdAt,
    updatedAt: roleDoc.updatedAt,
  };
}

async function resolvePermissionsInput({ permissionIds, permissionCodes }) {
  const ids = Array.isArray(permissionIds) ? permissionIds : [];
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [];

  const [byIds, byCodes] = await Promise.all([
    repo.findPermissionsByIds(ids),
    repo.findPermissionsByCodes(codes),
  ]);

  const combined = [...byIds, ...byCodes];
  const seen = new Set();
  const deduped = [];

  combined.forEach((perm) => {
    const key = String(perm._id);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(perm);
  });

  return deduped;
}

async function buildRolePermissionsMap(roleIds) {
  const rolePermissions = await repo.listRolePermissions(roleIds);
  const map = new Map();

  rolePermissions.forEach((rp) => {
    const roleId = String(rp.role);
    const perm = rp.permission;
    if (!perm) return;

    if (!map.has(roleId)) {
      map.set(roleId, []);
    }

    map.get(roleId).push(formatPermission(perm));
  });

  return map;
}

async function viewRoles() {
  const roles = await repo.listRoles();
  const roleIds = roles.map((r) => r._id);
  const permissionsMap = await buildRolePermissionsMap(roleIds);

  return roles.map((role) => {
    const perms = permissionsMap.get(String(role._id)) || [];
    return formatRole(role, perms);
  });
}

async function viewPermissions() {
  const permissions = await repo.listPermissions();
  return permissions.map(formatPermission);
}

async function addPermission(payload) {
  const permCode = normalizeString(payload.permCode);
  const permName = normalizeString(payload.permName);
  const module = normalizeString(payload.module);
  const action = normalizeString(payload.action);

  if (!permCode || !permName || !module || !action) {
    throw new Error('permCode, permName, module, action are required.');
  }

  const permission = await repo.createPermission({
    permCode,
    permName,
    module,
    action,
    description: normalizeString(payload.description),
    isActive: payload.isActive !== false,
  });

  return formatPermission(permission);
}

async function updatePermission(permissionId, payload) {
  const updates = {};

  if (payload.permName !== undefined) {
    updates.permName = normalizeString(payload.permName);
  }
  if (payload.description !== undefined) {
    updates.description = normalizeString(payload.description);
  }
  if (payload.isActive !== undefined) {
    updates.isActive = Boolean(payload.isActive);
  }

  if (payload.module !== undefined) {
    updates.module = normalizeString(payload.module);
  }
  if (payload.action !== undefined) {
    updates.action = normalizeString(payload.action);
  }

  const updated = await repo.updatePermission(permissionId, updates);
  if (!updated) {
    throw new Error('Permission not found.');
  }
  return formatPermission(updated);
}

async function addRole(actorUserId, payload) {
  const roleCode = normalizeString(payload.roleCode);
  const roleName = normalizeString(payload.roleName);

  if (!roleCode || !roleName) {
    throw new Error('roleCode and roleName are required.');
  }

  const role = await repo.createRole({
    roleCode,
    roleName,
    description: normalizeString(payload.description),
    isSystemRole: Boolean(payload.isSystemRole),
    isActive: payload.isActive !== false,
  });

  const permissions = await resolvePermissionsInput({
    permissionIds: payload.permissionIds,
    permissionCodes: payload.permissionCodes,
  });

  if (permissions.length > 0) {
    const permissionIds = permissions.map((p) => p._id);
    await repo.replaceRolePermissions(role._id, permissionIds, actorUserId);
  }

  const formattedPermissions = permissions.map(formatPermission);
  return formatRole(role, formattedPermissions);
}

async function updateRole(actorUserId, roleId, payload) {
  const role = await repo.findRoleById(roleId);
  if (!role) {
    throw new Error('Role not found.');
  }

  const updates = {};

  if (payload.roleName !== undefined) {
    updates.roleName = normalizeString(payload.roleName);
  }
  if (payload.description !== undefined) {
    updates.description = normalizeString(payload.description);
  }
  if (payload.isActive !== undefined) {
    updates.isActive = Boolean(payload.isActive);
  }

  // Protect system roles from structural changes.
  if (!role.isSystemRole) {
    if (payload.roleCode !== undefined) {
      updates.roleCode = normalizeString(payload.roleCode);
    }
    if (payload.isSystemRole !== undefined) {
      updates.isSystemRole = Boolean(payload.isSystemRole);
    }
  }

  const updatedRole = await repo.updateRole(roleId, updates);
  if (!updatedRole) {
    throw new Error('Role not found after update.');
  }

  let permissions;
  const hasPermissionUpdate =
    payload.permissionIds !== undefined || payload.permissionCodes !== undefined;

  if (hasPermissionUpdate) {
    const resolved = await resolvePermissionsInput({
      permissionIds: payload.permissionIds,
      permissionCodes: payload.permissionCodes,
    });

    const permissionIds = resolved.map((p) => p._id);
    await repo.replaceRolePermissions(updatedRole._id, permissionIds, actorUserId);
    permissions = resolved.map(formatPermission);
  } else {
    const permissionsMap = await buildRolePermissionsMap([updatedRole._id]);
    permissions = permissionsMap.get(String(updatedRole._id)) || [];
  }

  return formatRole(updatedRole, permissions);
}

module.exports = {
  viewRoles,
  viewPermissions,
  addPermission,
  updatePermission,
  addRole,
  updateRole,
};

