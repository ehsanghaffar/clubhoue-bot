/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
interface ChannelCache extends Map<string, number> {}

const messageCache = new Map<string, ChannelCache>()
const MESSAGE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface Message {
  message_id: string
}

export const addMessage = (channel: string, messageId: string): void => {
  if (!messageCache.has(channel)) {
    messageCache.set(channel, new Map())
  }
  const channelCache = messageCache.get(channel)!
  channelCache.set(messageId, Date.now())
}

export const isMessageNew = (channel: string, messageId: string): boolean => {
  const channelCache = messageCache.get(channel)
  if (channelCache == null) return true

  const timestamp = channelCache.get(messageId)
  if (!timestamp) return true

  if (Date.now() - timestamp > MESSAGE_TTL) {
    channelCache.delete(messageId)
    return true
  }
  return false
}

export const getNewMessages = <T extends Message>(
  channel: string,
  messages: T[]
): T[] => {
  return messages.filter((m) => isMessageNew(channel, m.message_id))
}

export const markMessagesSeen = <T extends Message>(
  channel: string,
  messages: T[]
): void => {
  messages.forEach((m) => { addMessage(channel, m.message_id) })
}

setInterval(() => {
  const now = Date.now()
  for (const [channel, channelCache] of messageCache.entries()) {
    for (const [messageId, timestamp] of channelCache.entries()) {
      if (now - timestamp > MESSAGE_TTL) {
        channelCache.delete(messageId)
      }
    }
    if (channelCache.size === 0) {
      messageCache.delete(channel)
    }
  }
}, 60 * 60 * 1000)
