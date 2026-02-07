const { ValidationError } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
}

function validateId(value) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError('Invalid id. Expected a positive integer.');
  }

  return parsed;
}

function validateUserPayload(input, options = {}) {
  const isPartial = options.partial === true;
  const payload = input ?? {};
  const name = normalizeString(payload.name);
  const email = normalizeString(payload.email).toLowerCase();

  if (!isPartial || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    if (name.length < 2 || name.length > 80) {
      throw new ValidationError('Name must have between 2 and 80 characters.');
    }
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(payload, 'email')) {
    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('Email format is invalid.');
    }
  }

  const result = {};
  if (!isPartial || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    result.name = name;
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(payload, 'email')) {
    result.email = email;
  }

  return result;
}

function validateBulkUserPayload(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ValidationError('Bulk input must be a non-empty array of users.');
  }

  if (input.length > 500) {
    throw new ValidationError('Bulk input supports up to 500 users per request.');
  }

  return input.map((item, index) => {
    try {
      return validateUserPayload(item);
    } catch (error) {
      throw new ValidationError(`Invalid user at position ${index + 1}: ${error.message}`);
    }
  });
}

function validateListQuery(query, defaults) {
  const search = normalizeString(query?.search);
  const sortBy = normalizeString(query?.sortBy) || 'name';
  const sortOrder = normalizeString(query?.sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';
  const includeDeleted = normalizeBoolean(query?.includeDeleted, false);

  const page = Number.parseInt(String(query?.page ?? defaults.page), 10);
  const limit = Number.parseInt(String(query?.limit ?? defaults.limit), 10);

  const safePage = Number.isInteger(page) && page > 0 ? page : defaults.page;
  const safeLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, defaults.maxLimit)
    : defaults.limit;

  const allowedSortBy = new Set(['id', 'name', 'email', 'createdAt', 'updatedAt', 'deletedAt']);
  const safeSortBy = allowedSortBy.has(sortBy) ? sortBy : 'name';

  return {
    search,
    sortBy: safeSortBy,
    sortOrder,
    page: safePage,
    limit: safeLimit,
    includeDeleted
  };
}

function parseDateFilter(value, label) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw new ValidationError(`${label} must be a valid ISO date.`);
  }

  return new Date(timestamp).toISOString();
}

function validateAuditQuery(query, defaults) {
  const page = Number.parseInt(String(query?.page ?? defaults.page), 10);
  const limit = Number.parseInt(String(query?.limit ?? defaults.limit), 10);

  const safePage = Number.isInteger(page) && page > 0 ? page : defaults.page;
  const safeLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, defaults.maxLimit)
    : defaults.limit;

  const search = normalizeString(query?.search);
  const action = normalizeString(query?.action);
  const actor = normalizeString(query?.actor);
  const status = normalizeString(query?.status);
  const requestId = normalizeString(query?.requestId);
  const since = parseDateFilter(query?.since, 'since');
  const until = parseDateFilter(query?.until, 'until');

  if (since && until && Date.parse(since) > Date.parse(until)) {
    throw new ValidationError('since must be earlier than until.');
  }

  return {
    page: safePage,
    limit: safeLimit,
    search,
    action,
    actor,
    status,
    requestId,
    since,
    until
  };
}

function validateLoginPayload(input) {
  const username = normalizeString(input?.username);
  const password = typeof input?.password === 'string' ? input.password : '';

  if (!USERNAME_PATTERN.test(username)) {
    throw new ValidationError('Username must contain 3-40 characters [a-zA-Z0-9._-].');
  }

  if (password.length < 8 || password.length > 128) {
    throw new ValidationError('Password must contain 8-128 characters.');
  }

  return {
    username,
    password
  };
}

function validateRefreshTokenPayload(input) {
  const refreshToken = normalizeString(input?.refreshToken);

  if (!refreshToken || refreshToken.split('.').length !== 3) {
    throw new ValidationError('refreshToken is required and must be a valid JWT string.');
  }

  return { refreshToken };
}

function validateIdempotencyKey(value) {
  const key = normalizeString(value);
  if (!key) {
    return null;
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new ValidationError('Idempotency-Key header must contain 8-128 valid characters.');
  }

  return key;
}

module.exports = {
  validateId,
  validateUserPayload,
  validateBulkUserPayload,
  validateListQuery,
  validateAuditQuery,
  validateLoginPayload,
  validateRefreshTokenPayload,
  validateIdempotencyKey,
  normalizeBoolean
};
