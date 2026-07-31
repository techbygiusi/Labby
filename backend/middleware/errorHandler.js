const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error response
  let status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
  let message = err.message || ERROR_MESSAGES.SERVER_ERROR;
  let error = err.error || 'Internal Server Error';

  // Handle specific error types
  if (err.code === 'SQLITE_CONSTRAINT') {
    status = HTTP_STATUS.CONFLICT;
    message = 'Resource already exists';
    error = 'Conflict';
  }

  if (err.code === 'SQLITE_ERROR') {
    status = HTTP_STATUS.BAD_REQUEST;
    error = 'Database Error';
  }

  // Validation errors
  if (err.validationErrors) {
    status = HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({
      error: 'Validation Error',
      validationErrors: err.validationErrors
    });
  }

  // Send error response
  res.status(status).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Create custom error
 */
class AppError extends Error {
  constructor(message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.status = status;
    this.error = 'AppError';
  }
}

module.exports = {
  errorHandler,
  AppError
};
