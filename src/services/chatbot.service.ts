/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from '../platforms/clubhouse/index.js'
import { getOpenAIClient } from './openai.service.js'
import { getNewMessages as getNewMessagesFromCache, markMessagesSeen } from '../utils/messageCache.js'
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

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o'
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? '150', 10)
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.7')

export class ChatbotService {
  private intervalId: NodeJS.Timeout | null = null
  private activeChannel: string | null = null

  private async fetchChannelMessages (channel: string): Promise<MappedMessage[]> {
    try {
      const result = (await clubService.getChannelMessages({
        channel,
        order: 0
      })) as { messages?: ChannelMessage[] }
      const foundQuestions =
        result.messages?.filter((m) => m.message?.startsWith('#') ?? false) ?? []
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

  private async processMessages (
    messages: MappedMessage[],
    channelId: string
  ): Promise<void> {
    if (messages) {
      for (const msg of messages) {
        const sendingToGPT = await this.sendToOpenAI(msg)
        if (sendingToGPT != null) {
          await this.sendToClub(sendingToGPT, channelId)
        }
      }
    }
  }

  private async sendToOpenAI (
    prompt: MappedMessage
  ): Promise<OpenAIResponse | null> {
    const { message, user_name, message_id } = prompt
    try {
      const result = await getOpenAIClient().chat.completions.create({
        model: OPENAI_MODEL,
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
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE
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

  private async sendToClub (
    response: OpenAIResponse,
    channelId: string
  ): Promise<void> {
    try {
      await clubService.sendChannelMessage({
        channel: channelId,
        message: response.message
      })
    } catch (error) {
      logger.error('Club API error:', { error })
    }
  }

  private async getNewMessages (channelId: string): Promise<MappedMessage[]> {
    const chats = await this.fetchChannelMessages(channelId)
    if (chats.length > 0) {
      const newChats = getNewMessagesFromCache(channelId, chats)
      markMessagesSeen(channelId, newChats)
      return newChats
    }
    return []
  }

  /**
   * Starts the polling loop for a channel. Restarting clears any existing
   * loop so polling intervals never leak.
   */
  start (channel: string): void {
    this.stop()

    const loopFunc = async (): Promise<void> => {
      try {
        const newMessages = await this.getNewMessages(channel)
        await this.processMessages(newMessages, channel)
      } catch (error) {
        logger.error('Chatbot loop error:', { error })
      }
    }

    this.intervalId = setInterval(() => {
      void loopFunc()
    }, constants.TIME.FIFTEEN_SECONDS)
    this.activeChannel = channel
    logger.info('Chatbot started for channel:', { channel })
  }

  stop (): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.activeChannel != null) {
      logger.info('Chatbot loop stopped for channel:', { channel: this.activeChannel })
      this.activeChannel = null
    }
  }
}

export const chatbotService = new ChatbotService()
