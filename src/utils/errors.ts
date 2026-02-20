export enum ErrorTypes {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

export const ERROR_TYPES = ErrorTypes;

export interface AppErrorOptions {
  type: ErrorTypes | string;
  statusCode: number;
  message: string;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly type: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    type: ErrorTypes | string,
    statusCode: number,
    message: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createValidationError = (message: string): AppError =>
  new AppError(ErrorTypes.VALIDATION, 400, message);

export const createNotFoundError = (message: string): AppError =>
  new AppError(ErrorTypes.NOT_FOUND, 404, message);

export const createUnauthorizedError = (message: string): AppError =>
  new AppError(ErrorTypes.UNAUTHORIZED, 401, message);

export const createForbiddenError = (message: string): AppError =>
  new AppError(ErrorTypes.FORBIDDEN, 403, message);

export const createInternalError = (message: string): AppError =>
  new AppError(ErrorTypes.INTERNAL, 500, message);

export const createBadRequestError = (message: string): AppError =>
  new AppError(ErrorTypes.BAD_REQUEST, 400, message);
