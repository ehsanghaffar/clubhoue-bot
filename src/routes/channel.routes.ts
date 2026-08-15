/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import { startTimer } from '../controllers/timer.controller.js'
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
router.post('/start-timer', validateBody(startTimerSchema), startTimer)

export default router
