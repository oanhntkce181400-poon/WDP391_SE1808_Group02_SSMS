const UserRole = require('../models/userRole.model');
const RolePermission = require('../models/rolePermission.model');
const User = require('../models/user.model');
const { normalizeRole } = require('../utils/role.util');

function normalizePermissionKey(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase();
}

function normalizeRoleKey(value) {
  if (!value || typeof value !== 'string') return null;
  return normalizeRole(value).replace(/[\s_-]+/g, '');
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

      const currentUser = await User.findById(userId).select('role').lean();
      const userRole = normalizeRole(currentUser?.role || req.auth?.role, '');
      
      // Enhanced logging for debugging
      console.log('🔐 RBAC Check:');
      console.log('   User ID:', userId);
      console.log('   User Role:', userRole);
      console.log('   Auth Payload:', JSON.stringify(req.auth));
      console.log('   Required Permissions:', required);

      // Quick bypass for system admin role stored on the user document.
      if (userRole === 'admin') {
        console.log('   ✅ Result: ADMIN BYPASS');
        return next();
      }

      // Check if required permissions include a direct role match (e.g., 'student', 'staff')
      // This allows routes to use rbacMiddleware(['student']) instead of complex permission lookups
      if (required.length > 0) {
        const directRoleMatches = required.filter((perm) => !perm.includes(':'));
        
        // If all required permissions are direct role matches, check them against user role
        if (directRoleMatches.length > 0 && directRoleMatches.length === required.length) {
          const normalizedUserRole = normalizeRoleKey(userRole);
          const normalizedRequiredRoles = directRoleMatches
            .map((perm) => normalizeRoleKey(perm))
            .filter(Boolean);
          console.log('   📋 Direct Role Match Check:');
          console.log('      Direct Matches:', directRoleMatches);
          console.log('      User Role Match:', normalizedRequiredRoles.includes(normalizedUserRole));
          
          if (normalizedRequiredRoles.includes(normalizedUserRole)) {
            console.log('   ✅ Result: ROLE MATCHED');
            return next();
          } else {
            console.log('   ❌ Result: ROLE NOT MATCHED');
            return res.status(403).json({
              message: 'Forbidden. Missing required role.',
              requiredRoles: directRoleMatches,
              userRole: userRole
            });
          }
        }
      }

      const { roles, permissions } = await resolvePermissionsForUser(userId);

      req.rbac = {
        roles,
        permissions: Array.from(permissions),
      };

      if (required.length === 0) {
        console.log('   ✅ Result: NO PERMISSIONS REQUIRED');
        return next();
      }

      const missing = required.filter((perm) => !permissions.has(perm));
      if (missing.length > 0) {
        console.log('   📋 Permission Check:');
        console.log('      User Roles:', roles);
        console.log('      User Permissions:', Array.from(permissions));
        console.log('      Missing Permissions:', missing);
        console.log('   ❌ Result: MISSING PERMISSIONS');
        return res.status(403).json({
          message: 'Forbidden. Missing required permissions.',
          missingPermissions: missing,
        });
      }

      console.log('   ✅ Result: PERMISSIONS VALIDATED');
      return next();
    } catch (err) {
      console.log('   ❌ Error:', err.message);
      return res.status(500).json({ message: err.message || 'RBAC check failed.' });
    }
  };
};
 
