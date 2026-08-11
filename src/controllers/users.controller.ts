/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import { clubService } from '../platforms/clubhouse/index.js'
import { createInternalError } from '../utils/errors.js'
import type { SearchUsersOptions } from '../platforms/clubhouse/types.js'
import logger from '../utils/logger.js'

export const searchUsers = async (
  req: Request<unknown, unknown, SearchUsersOptions>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await clubService.searchUsers(req.body)
    res.send(users)
  } catch (error) {
    logger.error('Error searching users:', { error })
    next(createInternalError('Failed to search users'))
  }
}
