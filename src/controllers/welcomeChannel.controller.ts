/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import { clubService } from '../platforms/clubhouse/index.js'
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

    // Act as the selected client for this request only, without mutating
    // shared service state.
    const channelInfo = await clubService.getChannelMessages({
      channel,
      token: client.token
    })
    res.send(channelInfo)
  } catch (err) {
    logger.error('Error getting channel info:', { error: err })
    next(createInternalError('Failed to get channel info'))
  }
}
