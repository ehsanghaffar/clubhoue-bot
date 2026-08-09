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
import { findClientToken } from './channel.controller.js'

interface GetChannelInfoBody {
  channel: string
  username: string
}

export const getChannelInfo = async (
  req: Request<unknown, unknown, GetChannelInfoBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { channel, username } = req.body
  try {
    const client = await findClientToken(username)
    if (typeof client === 'string') {
      res.status(400).send({ error: client })
      return
    }

    // Switching the token here intentionally makes subsequent calls act as the
    // selected client until the active profile is changed again.
    clubService.setProfileToken(client.token)

    const channelInfo = await clubService.getChannelMessages({ channel })
    res.send(channelInfo)
  } catch (err) {
    logger.error('Error getting channel info:', { error: err })
    next(createInternalError('Failed to get channel info'))
  }
}
