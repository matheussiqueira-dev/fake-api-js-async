const { ForbiddenError } = require('../lib/errors');

const ROLE_HIERARCHY = Object.freeze({
  viewer: 1,
  editor: 2,
  admin: 3
});

function assertRole(user, minimumRole) {
  const required = ROLE_HIERARCHY[minimumRole] ?? 0;
  const current = ROLE_HIERARCHY[user?.role] ?? 0;

  if (current < required) {
    throw new ForbiddenError(`Role ${minimumRole} or higher is required.`);
  }
}

module.exports = {
  assertRole,
  ROLE_HIERARCHY
};