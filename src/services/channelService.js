/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

const clubService = require('../services/clubApiService');
const { fetchChannelMessages } = require('../utils/messageUtils');

/**
 * Channel Service - Business logic for channel operations
 */
class ChannelService {
  constructor(clubServiceInstance = null) {
    this.clubService = clubServiceInstance || clubService;
  }

  /**
   * Join a channel and handle invite requests
   * @param {string} channelId - Channel ID to join
   * @returns {Promise<Object>} Join result
   */
  async joinChannelWithInviteHandling(channelId) {
    try {
      const result = await this.clubService.joinChannel({ channel: channelId });

      // Handle invite requests after joining
      if (result) {
        setTimeout(() => {
          this.handleInviteRequests(channelId);
        }, 3000); // 3 seconds delay
      }

      return result;
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  /**
   * Handle speaker invite requests for a channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<void>}
   */
  async handleInviteRequests(channelId) {
    try {
      const messages = await fetchChannelMessages(channelId);
      if (messages) {
        console.log("Processing invites for channel:", channelId);
        for (const invite of messages) {
          if (invite.user_profile && invite.user_profile.user_id) {
            console.log("Inviting user to speakers:", invite.user_profile.user_id);
            const result = await this.clubService.inviteToSpeakers({
              channel: channelId,
              user: invite.user_profile.user_id
            });
            console.log("Invite result:", result);
          }
        }
      }
    } catch (error) {
      console.error("Error handling invite requests:", error);
    }
  }

  /**
   * Get channel feed
   * @param {Object} options - Feed options
   * @returns {Promise<Array>} Channel feed
   */
  async getChannelFeed(options = {}) {
    try {
      return await this.clubService.getChannels();
    } catch (error) {
      console.error('Error getting channel feed:', error);
      throw error;
    }
  }

  /**
   * Get current channel info
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} Channel info
   */
  async getCurrentChannel(channelId) {
    try {
      return await this.clubService.getChannel({ channel: channelId });
    } catch (error) {
      console.error('Error getting current channel:', error);
      throw error;
    }
  }

  /**
   * Get channel messages
   * @param {Object} options - Message options
   * @returns {Promise<Array>} Messages
   */
  async getChannelMessages(options) {
    try {
      return await fetchChannelMessages(options.channel, options.order);
    } catch (error) {
      console.error('Error getting channel messages:', error);
      throw error;
    }
  }

  /**
   * Send message to channel
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendChannelMessage(options) {
    try {
      return await this.clubService.sendChannelMessage(options);
    } catch (error) {
      console.error('Error sending channel message:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    try {
      return await this.clubService.getProfile();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
}

// Create singleton instance
const channelService = new ChannelService();

module.exports = channelService;
module.exports.ChannelService = ChannelService;