/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Request, Response, NextFunction } from 'express'
import { clubService } from '../services/club-api.service.js'
import { createInternalError } from '../utils/errors.js'
import logger from '../utils/logger.js'

interface GetNotificationsBody {
  size?: number
  page?: number
}

export const getNotifications = async (
  req: Request<unknown, unknown, GetNotificationsBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { size, page } = req.body
    const notifications = await clubService.getNotifications({ size, page })
    res.send(notifications)
  } catch (error) {
    logger.error('Error getting notifications:', { error })
    next(createInternalError('Failed to get notifications'))
  }
}

export const getActionableNotifications = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notifications = await clubService.getActionableNotifications()
    res.send(notifications)
  } catch (error) {
    logger.error('Error getting actionable notifications:', { error })
    next(createInternalError('Failed to get actionable notifications'))
  }
}
