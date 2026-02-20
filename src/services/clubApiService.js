/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Clubhouse API Service Class
 * Provides a unified interface for all Clubhouse API operations
 */
class ClubApiService {
  constructor(profile = null, agent = null) {
    this.profile = profile;
    this.agent = agent;
    this.debug = console.log; // Default debug function
  }

  /**
   * Set the user profile for API calls
   * @param {Object} profile - User profile object
   */
  setProfile(profile) {
    this.profile = profile;
  }

  /**
   * Set the HTTP agent for API calls
   * @param {Function} agent - HTTP agent function
   */
  setAgent(agent) {
    this.agent = agent;
  }

  /**
   * Set debug function
   * @param {Function} debugFn - Debug function
   */
  setDebug(debugFn) {
    this.debug = debugFn;
  }

  // Channel operations
  async getChannels() {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      this.debug('Getting channels...');
      const response = await this.agent(
        '/get_feed_v3?get_unconnected_rooms=true',
        { body: {} },
        { ...this.profile, userId: '(null)' }
      );
      return await response.json();
    } catch (error) {
      this.debug('Error getting channels:', error.message);
      return [];
    }
  }

  async joinChannel(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      opts.source = opts.source || 'feed';

      const attributions = {
        is_explore: opts.isExplore,
        rank: opts.rank
      };
      const body = {};

      if (opts.source === 'feed') {
        body.attribution_details = Buffer.from(JSON.stringify(attributions)).toString('base64');
        body.attribution_source = opts.source || 'feed';
      }

      body.channel = opts.channel;

      this.debug('Joining channel:', opts.channel);
      const response = await this.agent(
        '/join_channel',
        { body },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error joining channel:', error.message);
      return { success: false };
    }
  }

  async leaveChannel(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Leaving channel:', opts.channel);
      const response = await this.agent(
        '/leave_channel',
        { body: { channel: opts.channel } },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error leaving channel:', error.message);
      return { success: false };
    }
  }

  async getChannelMessages(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Getting channel messages:', opts.channel);
      const response = await this.agent(
        '/get_channel_messages',
        {
          query: {
            channel: opts.channel,
            is_chronological_order: Number(opts.order || 0)
          }
        },
        { ...this.profile, userId: '(null)' }
      );
      return await response.json();
    } catch (error) {
      this.debug('Error getting messages:', error.message);
      return { messages: [] };
    }
  }

  async sendChannelMessage(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Sending channel message');
      const response = await this.agent(
        '/add_channel_message',
        {
          body: {
            channel: opts.channel,
            body: opts.body
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error sending message:', error.message);
      return { success: false };
    }
  }

  // User operations
  async getUser(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Getting user:', opts.user_id);
      const response = await this.agent(
        '/get_profile',
        {
          body: {
            user_id: opts.user_id || opts.id
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error getting user:', error.message);
      return { user_profile: null };
    }
  }

  async searchUsers(query) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      let opts = query || {};
      if (typeof query === 'string') {
        opts = { query };
      }
      this.debug('Searching users:', opts.query);
      const response = await this.agent(
        '/search_users',
        {
          body: {
            cofollows_only: opts.onlyCoFollows || false,
            followers_only: opts.onlyFollowers || false,
            following_only: opts.onlyFollowing || false,
            query: opts.query || ''
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error searching users:', error.message);
      return { users: [] };
    }
  }

  async getProfile() {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      this.debug('Getting profile');
      return this.profile;
    } catch (error) {
      this.debug('Error getting profile:', error.message);
      return this.profile || {};
    }
  }

  // Speaker operations
  async acceptSpeakerInvite(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Accepting speaker invite:', opts.channel);
      const response = await this.agent(
        '/accept_speaker_invite',
        {
          body: {
            channel: opts.channel
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error accepting speaker invite:', error.message);
      return { success: false };
    }
  }

  async inviteToSpeakers(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Inviting to speakers:', opts.user_id);
      const response = await this.agent(
        '/invite_speaker',
        {
          body: {
            channel: opts.channel,
            user_id: opts.user_id
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error inviting speaker:', error.message);
      return { success: false };
    }
  }

  // Ping operations
  async activePing(opts) {
    if (!this.agent || !this.profile) throw new Error('Agent and profile not configured');
    try {
      opts = opts || {};
      this.debug('Active ping for channel:', opts.channel);
      const response = await this.agent(
        '/active_ping',
        {
          body: {
            channel: opts.channel
          }
        },
        this.profile
      );
      return await response.json();
    } catch (error) {
      this.debug('Error active ping:', error.message);
      return { success: false };
    }
  }
}

// Create singleton instance for backward compatibility
const clubService = new ClubApiService();

module.exports = clubService;
module.exports.clubService = clubService;
module.exports.ClubApiService = ClubApiService;

