/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError, ERROR_TYPES } from '../utils/errors.js'
import logger from '../utils/logger.js'
import type { AuthenticatedRequest, DecodedToken } from '../types/express.js'

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken
    }
  }
}

const getJwtPrivateKey = (): string | undefined => process.env.JWT_PRIVATE_KEY

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const jwtPrivateKey = getJwtPrivateKey()
    if (!jwtPrivateKey) {
      const error = new AppError(
        ERROR_TYPES.INTERNAL,
        500,
        'JWT_PRIVATE_KEY environment variable is not configured.'
      )
      next(error)
      return
    }

    const token = req.header('x-auth-token')
    if (!token) {
      const error = new AppError(
        ERROR_TYPES.UNAUTHORIZED,
        401,
        'Access denied. No token provided.'
      )
      next(error)
      return
    }

    const decoded = jwt.verify(token, jwtPrivateKey) as DecodedToken;
    (req as AuthenticatedRequest).user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, 'Invalid token.')
      next(authError)
      return
    }
    if (error instanceof jwt.TokenExpiredError) {
      const authError = new AppError(ERROR_TYPES.UNAUTHORIZED, 401, 'Token expired.')
      next(authError)
      return
    }
    next(error as Error)
  }
}

export default authMiddleware

export const errorHandler = (
  err: Error & { code?: number, name?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (!req || !res) {
    logger.error('Error handler called with invalid arguments:', { err })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        type: err.type,
        message: err.message
      }
    })
    return
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: (err as Error & { errors?: unknown }).errors
      }
    })
    return
  }

  if (err.code === 11000) {
    res.status(409).json({
      error: {
        type: 'DUPLICATE_ERROR',
        message: 'Duplicate entry found'
      }
    })
    return
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        type: 'UNAUTHORIZED',
        message: err.message
      }
    })
    return
  }

  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message

  if (statusCode >= 500) {
    logger.error('Unhandled error:', { error: err })
  }

  res.status(statusCode).json({
    error: {
      type: 'INTERNAL_ERROR',
      message
    }
  })
}
