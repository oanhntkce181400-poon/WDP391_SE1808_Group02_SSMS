const VALID_USER_ROLES = ['admin', 'staff', 'student', 'lecturer'];

const ROLE_ALIASES = {
  teacher: 'lecturer',
};

function normalizeRole(value, fallback = '') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return ROLE_ALIASES[normalized] || normalized;
}

function isValidUserRole(value) {
  return VALID_USER_ROLES.includes(normalizeRole(value));
}

function isLecturerRole(value) {
  return normalizeRole(value) === 'lecturer';
}

module.exports = {
  VALID_USER_ROLES,
  normalizeRole,
  isValidUserRole,
  isLecturerRole,
};
