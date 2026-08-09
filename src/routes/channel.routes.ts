/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router, Request, Response } from 'express'
import { timerService } from '../services/timer.service.js'
import { validateBody } from '../middlewares/validate.js'
import { startTimerSchema } from '../validation/schemas.js'

/**
 * Timer routes for pomodoro functionality
 */
const router: Router = Router()

/**
 * @openapi
 * /channel/start-timer:
 *   post:
 *     summary: Start a pomodoro timer for a channel
 *     tags:
 *       - Timer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *               - emoji
 *             properties:
 *               channel:
 *                 type: string
 *                 description: The channel ID to start timer for
 *               emoji:
 *                 type: string
 *                 description: Emoji to use for notifications
 *     responses:
 *       200:
 *         description: Timer started successfully
 *       400:
 *         description: Missing required parameters
 */
router.post('/start-timer', validateBody(startTimerSchema), (req: Request, res: Response) => {
  const { channel, emoji } = req.body as { channel: string, emoji: string }
  timerService.startBaseTimer(channel, emoji)
  res.sendStatus(200)
})

export default router
