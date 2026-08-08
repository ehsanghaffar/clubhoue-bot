/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from '../services/club-api.service'
import logger from './logger'

interface ChannelMessage {
  message_id: string
  message?: string
  user_profile?: {
    user_id: number | string
  }
}

interface ChannelMessagesResult {
  messages?: ChannelMessage[]
}

export const fetchChannelMessages = async (
  channel: string,
  order = 0
): Promise<ChannelMessage[]> => {
  try {
    const result = (await clubService.getChannelMessages({
      channel,
      order
    })) as ChannelMessagesResult
    return result.messages ?? []
  } catch (error) {
    logger.error('Error fetching channel messages:', { error })
    return []
  }
}

export const fetchFilteredMessages = async (
  channel: string,
  filterFn: (message: ChannelMessage) => boolean,
  order = 0
): Promise<ChannelMessage[]> => {
  const messages = await fetchChannelMessages(channel, order)
  return messages.filter(filterFn)
}

export const fetchInviteMessages = async (
  channel: string
): Promise<ChannelMessage[]> => {
  return await fetchFilteredMessages(channel, (message) =>
    Boolean(message.message?.startsWith('/invite'))
  )
}

export const fetchQuestionMessages = async (
  channel: string
): Promise<ChannelMessage[]> => {
  return await fetchFilteredMessages(channel, (message) =>
    Boolean(message.message?.startsWith('#'))
  )
}
