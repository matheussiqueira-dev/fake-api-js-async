const { ValidationError } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
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
  const name = normalizeString(input?.name);
  const email = normalizeString(input?.email).toLowerCase();

  if (!isPartial || Object.prototype.hasOwnProperty.call(input ?? {}, 'name')) {
    if (name.length < 2 || name.length > 80) {
      throw new ValidationError('Name must have between 2 and 80 characters.');
    }
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(input ?? {}, 'email')) {
    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('Email format is invalid.');
    }
  }

  const result = {};
  if (!isPartial || Object.prototype.hasOwnProperty.call(input ?? {}, 'name')) {
    result.name = name;
  }
  if (!isPartial || Object.prototype.hasOwnProperty.call(input ?? {}, 'email')) {
    result.email = email;
  }

  return result;
}

function validateListQuery(query, defaults) {
  const search = normalizeString(query?.search);
  const sortBy = normalizeString(query?.sortBy) || 'name';
  const sortOrder = normalizeString(query?.sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';

  const page = Number.parseInt(String(query?.page ?? defaults.page), 10);
  const limit = Number.parseInt(String(query?.limit ?? defaults.limit), 10);

  const safePage = Number.isInteger(page) && page > 0 ? page : defaults.page;
  const safeLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, defaults.maxLimit)
    : defaults.limit;

  const allowedSortBy = new Set(['id', 'name', 'email', 'createdAt']);
  const safeSortBy = allowedSortBy.has(sortBy) ? sortBy : 'name';

  return {
    search,
    sortBy: safeSortBy,
    sortOrder,
    page: safePage,
    limit: safeLimit
  };
}

module.exports = {
  validateId,
  validateUserPayload,
  validateListQuery
};