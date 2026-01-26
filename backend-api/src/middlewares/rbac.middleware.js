// Check Role Admin/Staff
module.exports = function rbacMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    // TODO: implement role-based access control
    next();
  };
};
