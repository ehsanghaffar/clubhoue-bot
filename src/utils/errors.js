/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

// Error types enum
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST'
};

// AppError class for consistent error handling
class AppError extends Error {
  constructor(type, statusCode, message, isOperational = true) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Create specific error types
const createValidationError = (message) => new AppError(ERROR_TYPES.VALIDATION, 400, message);
const createNotFoundError = (message) => new AppError(ERROR_TYPES.NOT_FOUND, 404, message);
const createUnauthorizedError = (message) => new AppError(ERROR_TYPES.UNAUTHORIZED, 401, message);
const createForbiddenError = (message) => new AppError(ERROR_TYPES.FORBIDDEN, 403, message);
const createInternalError = (message) => new AppError(ERROR_TYPES.INTERNAL, 500, message);
const createBadRequestError = (message) => new AppError(ERROR_TYPES.BAD_REQUEST, 400, message);

module.exports = {
  AppError,
  ERROR_TYPES,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createInternalError,
  createBadRequestError
};