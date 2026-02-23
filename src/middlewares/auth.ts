/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ERROR_TYPES } from '../utils/errors';
import logger from '../utils/logger';
import type { AuthenticatedRequest, DecodedToken } from '../types/express';

const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
if (!jwtPrivateKey) {
  throw new Error('JWT_PRIVATE_KEY environment variable is required');
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      const error = new AppError(
        ERROR_TYPES.UNAUTHORIZED,
        401,
        'Access denied. No token provided.'
      );
      return next(error);
    }

    const decoded = jwt.verify(token, jwtPrivateKey) as DecodedToken;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, 'Invalid token.');
      return next(authError);
    }
    if (error instanceof jwt.TokenExpiredError) {
      const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, 'Token expired.');
      return next(authError);
    }
    next(error as Error);
  }
};

export default authMiddleware;

export const errorHandler = (
  err: Error & { code?: number; name?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (!req || !res) {
    logger.error('Error handler called with invalid arguments:', { err });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        type: err.type,
        message: err.message,
      },
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: (err as Error & { errors?: unknown }).errors,
      },
    });
    return;
  }

  if (err.code === 11000) {
    res.status(409).json({
      error: {
        type: 'DUPLICATE_ERROR',
        message: 'Duplicate entry found',
      },
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        type: 'UNAUTHORIZED',
        message: err.message,
      },
    });
    return;
  }

  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message;

  res.status(statusCode).json({
    error: {
      type: 'INTERNAL_ERROR',
      message,
    },
  });
};
