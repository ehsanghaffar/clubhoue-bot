/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type Joi from 'joi'
import { AppError, ErrorTypes } from '../utils/errors.js'

/**
 * Express middleware that validates `req.body` against a Joi schema before the
 * controller runs. On failure it forwards an `AppError` (400 VALIDATION_ERROR)
 * to the global error handler; on success it replaces `req.body` with the
 * validated/coerced value so controllers always receive typed, validated input.
 */
export const validateBody = (schema: Joi.ObjectSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false })
    if (error != null) {
      const message = error.details.map((detail) => detail.message).join('; ')
      next(new AppError(ErrorTypes.VALIDATION, 400, message))
      return
    }
    req.body = value
    next()
  }
}
