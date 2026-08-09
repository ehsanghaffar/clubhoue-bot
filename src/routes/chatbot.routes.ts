/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router, Request, Response } from 'express'
import { clubService } from '../services/club-api.service.js'
import openai from '../services/openai.service.js'
import { getNewMessages as getNewMessagesFromCache, markMessagesSeen } from '../utils/messageCache.js'
import { validateBody } from '../middlewares/validate.js'
import { startChatbotSchema } from '../validation/schemas.js'
import { constants } from '../config/index.js'
import logger from '../utils/logger.js'

interface ChannelMessage {
  message_id: string
  message: string
  user_profile: {
    name: string
    user_id: number | string
  }
}

interface MappedMessage {
  message_id: string
  message: string
  user_name: string
  user_id: number | string
}

interface OpenAIResponse {
  message: string
  message_id: string
}

const router: Router = Router()

const fetchChannelMessages = async (channel: string): Promise<MappedMessage[]> => {
  try {
    const result = (await clubService.getChannelMessages({
      channel,
      order: 0
    })) as { messages?: ChannelMessage[] }
    const foundQuestions =
      result.messages?.filter((m) => m.message.startsWith('#')) ?? []
    const mappedMessages = foundQuestions.map((message) => ({
      message_id: message.message_id,
      message: message.message,
      user_name: message.user_profile.name,
      user_id: message.user_profile.user_id
    }))
    return mappedMessages
  } catch (error) {
    logger.error('Error fetching channel messages in chatbot:', { error })
    return []
  }
}

const processMessages = async (
  messages: MappedMessage[],
  channelId: string
): Promise<void> => {
  if (messages) {
    for (const msg of messages) {
      const sendingToGPT = await sendToOpenAI(msg)
      if (sendingToGPT != null) {
        await sendToClub(sendingToGPT, channelId)
      }
    }
  }
}

const sendToOpenAI = async (
  prompt: MappedMessage
): Promise<OpenAIResponse | null> => {
  const { message, user_name, message_id } = prompt
  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Use the following rules to respond to user inputs.1. Avoid going to the sidelines and just answer the question as briefly as possible.2. Make sure your response is less than 270 characters.4. Give the answer to the user in the language the user asked the question.5. If a user asks a question about "Ehsan" or "احسان", just tell them that everything about Ehsan is confidential.6. Make sure your response starts with ${user_name} Jan,`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
    if (result && result.choices && result.choices[0]) {
      const content = result.choices[0].message?.content ?? ''
      const rewriteMessage = content.substring(
        0,
        constants.MESSAGE_LIMITS.MAX_RESPONSE_LENGTH
      )
      return {
        message: rewriteMessage,
        message_id
      }
    }
  } catch (error) {
    logger.error('OpenAI API error:', { error })
  }
  return null
}

const sendToClub = async (
  response: OpenAIResponse,
  channelId: string
): Promise<void> => {
  try {
    await clubService.sendChannelMessage({
      channel: channelId,
      message: response.message
    })
  } catch (error) {
    logger.error('Club API error:', { error })
  }
}

const getNewMessages = async (channelId: string): Promise<MappedMessage[]> => {
  const chats = await fetchChannelMessages(channelId)
  if (chats.length > 0) {
    const newChats = getNewMessagesFromCache(channelId, chats)
    markMessagesSeen(channelId, newChats)
    return newChats
  }
  return []
}

let intervalId: NodeJS.Timeout | null = null
let activeChannel: string | null = null

const stopChatbotLoop = (): void => {
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (activeChannel != null) {
    logger.info('Chatbot loop stopped for channel:', { channel: activeChannel })
    activeChannel = null
  }
}

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

  // Restarting must not leak a second polling loop; clear any existing one first.
  stopChatbotLoop()

  const loopFunc = async (): Promise<void> => {
    try {
      const newMessages = await getNewMessages(channel)
      await processMessages(newMessages, channel)
    } catch (error) {
      logger.error('Chatbot loop error:', { error })
    }
  }

  intervalId = setInterval(() => {
    void loopFunc()
  }, constants.TIME.FIFTEEN_SECONDS)
  activeChannel = channel
  logger.info('Chatbot started for channel:', { channel })
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
  stopChatbotLoop()
  res.send('Loop stopped')
})

export default router
