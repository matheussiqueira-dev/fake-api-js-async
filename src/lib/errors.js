class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.details = options.details ?? null;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: details ?? null
    });
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND'
    });
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT'
    });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Permission denied.') {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN'
    });
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests.') {
    super(message, {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS'
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError
};
