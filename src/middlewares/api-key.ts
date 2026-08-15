/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import { AppError, ERROR_TYPES } from '../utils/errors.js'

const getApiKey = (): string | undefined => process.env.API_KEY

const requireApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = getApiKey()
  if (!apiKey) {
    const error = new AppError(
      ERROR_TYPES.INTERNAL,
      500,
      'API_KEY environment variable is not configured.'
    )
    next(error)
    return
  }

  const key = req.header('x-api-key')
  if (!key || key !== apiKey) {
    const error = new AppError(
      ERROR_TYPES.UNAUTHORIZED,
      401,
      'Access denied. Invalid API key.'
    )
    next(error)
    return
  }

  next()
}

export default requireApiKey
