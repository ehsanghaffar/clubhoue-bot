/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router, type Request, type Response } from 'express'
import { chatbotService } from '../services/chatbot.service.js'
import { validateBody } from '../middlewares/validate.js'
import { startChatbotSchema } from '../validation/schemas.js'

const router: Router = Router()

/**
 * @openapi
 * /chatbot/start:
 *   post:
 *     summary: Start the chatbot for a channel
 *     tags:
 *       - Chatbot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to run chatbot on
 *     responses:
 *       200:
 *         description: Chatbot started
 */
router.post('/start', validateBody(startChatbotSchema), (req: Request, res: Response) => {
  const { channel } = req.body as { channel: string }
  chatbotService.start(channel)
  res.send('Ok')
})

/**
 * @openapi
 * /chatbot/stop:
 *   post:
 *     summary: Stop the running chatbot
 *     tags:
 *       - Chatbot
 *     responses:
 *       200:
 *         description: Chatbot stopped
 */
router.post('/stop', (_req: Request, res: Response) => {
  chatbotService.stop()
  res.send('Loop stopped')
})

export default router
