/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

const clubService = require('../services/clubApiService');

/**
 * Fetch channel messages with consistent error handling
 * @param {string} channel - Channel ID
 * @param {number} order - Message order (default: 0)
 * @returns {Promise<Array>} Array of messages
 */
const fetchChannelMessages = async (channel, order = 0) => {
  try {
    const result = await clubService.getChannelMessages({ channel, order });
    return result.messages || [];
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    return [];
  }
};

/**
 * Fetch messages with a specific filter
 * @param {string} channel - Channel ID
 * @param {Function} filterFn - Filter function for messages
 * @param {number} order - Message order (default: 0)
 * @returns {Promise<Array>} Filtered messages
 */
const fetchFilteredMessages = async (channel, filterFn, order = 0) => {
  const messages = await fetchChannelMessages(channel, order);
  return messages.filter(filterFn);
};

/**
 * Fetch invite messages from channel
 * @param {string} channel - Channel ID
 * @returns {Promise<Array>} Invite messages
 */
const fetchInviteMessages = async (channel) => {
  return fetchFilteredMessages(
    channel,
    (message) => message.message && message.message.startsWith("/invite")
  );
};

/**
 * Fetch question messages from channel
 * @param {string} channel - Channel ID
 * @returns {Promise<Array>} Question messages
 */
const fetchQuestionMessages = async (channel) => {
  return fetchFilteredMessages(
    channel,
    (message) => message.message && message.message.startsWith("#")
  );
};

module.exports = {
  fetchChannelMessages,
  fetchFilteredMessages,
  fetchInviteMessages,
  fetchQuestionMessages
};