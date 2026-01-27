const actorsService = require('./actors.service');

function mapErrorToStatus(err) {
  if (err?.code === 11000) return 409;
  const message = String(err?.message || '').toLowerCase();
  if (message.includes('not found')) return 404;
  if (message.includes('required')) return 400;
  return 400;
}

function handleError(res, err, fallbackMessage) {
  const status = mapErrorToStatus(err);
  return res.status(status).json({
    message: err?.message || fallbackMessage,
  });
}

async function viewRoles(req, res) {
  try {
    const roles = await actorsService.viewRoles();
    return res.json({ roles });
  } catch (err) {
    return handleError(res, err, 'Failed to load roles.');
  }
}

async function viewPermissions(req, res) {
  try {
    const permissions = await actorsService.viewPermissions();
    return res.json({ permissions });
  } catch (err) {
    return handleError(res, err, 'Failed to load permissions.');
  }
}

async function addPermission(req, res) {
  try {
    const permission = await actorsService.addPermission(req.body || {});
    return res.status(201).json({
      message: 'Permission created.',
      permission,
    });
  } catch (err) {
    return handleError(res, err, 'Failed to create permission.');
  }
}

async function updatePermission(req, res) {
  try {
    const permission = await actorsService.updatePermission(req.params.permissionId, req.body || {});
    return res.json({
      message: 'Permission updated.',
      permission,
    });
  } catch (err) {
    return handleError(res, err, 'Failed to update permission.');
  }
}

async function addRole(req, res) {
  try {
    const actorUserId = req.auth?.sub;
    const role = await actorsService.addRole(actorUserId, req.body || {});
    return res.status(201).json({
      message: 'Role created.',
      role,
    });
  } catch (err) {
    return handleError(res, err, 'Failed to create role.');
  }
}

async function updateRole(req, res) {
  try {
    const actorUserId = req.auth?.sub;
    const role = await actorsService.updateRole(actorUserId, req.params.roleId, req.body || {});
    return res.json({
      message: 'Role updated.',
      role,
    });
  } catch (err) {
    return handleError(res, err, 'Failed to update role.');
  }
}

module.exports = {
  viewRoles,
  viewPermissions,
  addPermission,
  updatePermission,
  addRole,
  updateRole,
};

