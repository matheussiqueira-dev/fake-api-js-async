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

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError
};