/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

// Message cache with TTL per channel
const messageCache = new Map();
const MESSAGE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const addMessage = (channel, messageId) => {
  if (!messageCache.has(channel)) {
    messageCache.set(channel, new Map());
  }
  const channelCache = messageCache.get(channel);
  channelCache.set(messageId, Date.now());
};

const isMessageNew = (channel, messageId) => {
  const channelCache = messageCache.get(channel);
  if (!channelCache) return true;

  const timestamp = channelCache.get(messageId);
  if (!timestamp) return true;

  // Clean up old entries
  if (Date.now() - timestamp > MESSAGE_TTL) {
    channelCache.delete(messageId);
    return true;
  }
  return false;
};

const getNewMessages = (channel, messages) => {
  return messages.filter((m) => isMessageNew(channel, m.message_id));
};

const markMessagesSeen = (channel, messages) => {
  messages.forEach((m) => addMessage(channel, m.message_id));
};

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [channel, channelCache] of messageCache.entries()) {
    for (const [messageId, timestamp] of channelCache.entries()) {
      if (now - timestamp > MESSAGE_TTL) {
        channelCache.delete(messageId);
      }
    }
    // Remove empty channel caches
    if (channelCache.size === 0) {
      messageCache.delete(channel);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

module.exports = {
  addMessage,
  isMessageNew,
  getNewMessages,
  markMessagesSeen
};