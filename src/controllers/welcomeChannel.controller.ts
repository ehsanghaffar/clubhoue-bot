/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Request, Response } from 'express'
import { clubService } from '../services/club-api.service.js'
import { findClientToken } from './channel.controller.js'

interface GetChannelInfoBody {
  channel: string
  username: string
}

export const getChannelInfo = async (
  req: Request<unknown, unknown, GetChannelInfoBody>,
  res: Response
): Promise<void> => {
  const ch = req.body.channel
  const clientName = req.body.username
  try {
    const client = await findClientToken(clientName)
    if (typeof client === 'string') {
      res.status(400).send({ error: client })
      return
    }

    clubService.setProfileToken(client.token)

    const channelInfo = await clubService.getChannelMessages({ channel: ch })
    res.send(channelInfo)
  } catch (err) {
    res.status(500).send(err)
  }
}
