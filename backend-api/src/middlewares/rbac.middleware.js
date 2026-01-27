const UserRole = require('../models/userRole.model');
const RolePermission = require('../models/rolePermission.model');

function normalizePermissionKey(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase();
}

function buildModuleActionKey(permission) {
  if (!permission?.module || !permission?.action) return null;
  return `${String(permission.module).trim().toLowerCase()}:${String(permission.action)
    .trim()
    .toLowerCase()}`;
}

async function resolvePermissionsForUser(userId) {
  const userRoles = await UserRole.find({
    user: userId,
    isActive: true,
  })
    .populate('role')
    .lean();

  const activeRoleIds = userRoles
    .map((ur) => ur.role)
    .filter((role) => role && role.isActive !== false)
    .map((role) => role._id);

  if (activeRoleIds.length === 0) {
    return {
      roles: [],
      permissions: new Set(),
    };
  }

  const rolePermissions = await RolePermission.find({
    role: { $in: activeRoleIds },
  })
    .populate('permission')
    .lean();

  const permissionSet = new Set();

  rolePermissions.forEach((rp) => {
    const perm = rp.permission;
    if (!perm || perm.isActive === false) return;

    const permCodeKey = normalizePermissionKey(perm.permCode);
    if (permCodeKey) permissionSet.add(permCodeKey);

    const moduleActionKey = buildModuleActionKey(perm);
    if (moduleActionKey) permissionSet.add(moduleActionKey);
  });

  return {
    roles: userRoles.map((ur) => ur.role).filter(Boolean),
    permissions: permissionSet,
  };
}

module.exports = function rbacMiddleware(requiredPermissions = []) {
  const required = requiredPermissions.map(normalizePermissionKey).filter(Boolean);

  return async (req, res, next) => {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      // Quick bypass for system admin role stored on the user document.
      if (String(req.auth?.role || '').toLowerCase() === 'admin') {
        return next();
      }

      const { roles, permissions } = await resolvePermissionsForUser(userId);

      req.rbac = {
        roles,
        permissions: Array.from(permissions),
      };

      if (required.length === 0) {
        return next();
      }

      const missing = required.filter((perm) => !permissions.has(perm));
      if (missing.length > 0) {
        return res.status(403).json({
          message: 'Forbidden. Missing required permissions.',
          missingPermissions: missing,
        });
      }

      return next();
    } catch (err) {
      return res.status(500).json({ message: err.message || 'RBAC check failed.' });
    }
  };
};
