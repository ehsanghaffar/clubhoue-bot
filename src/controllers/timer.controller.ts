/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response } from 'express'
import { timerService } from '../services/timer.service.js'

interface StartTimerBody {
  channel: string
  emoji: string
}

export const startTimer = (req: Request<unknown, unknown, StartTimerBody>, res: Response): void => {
  const { channel, emoji } = req.body
  timerService.startBaseTimer(channel, emoji)
  res.sendStatus(200)
}
