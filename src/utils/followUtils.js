/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

const agent = require('../helper/agent');

/**
 * Generic follow/unfollow operation
 * @param {string} action - 'follow' or 'unfollow'
 * @param {string} type - 'user' or 'club'
 * @param {Object} profile - User profile
 * @param {Object|Number} opts - Options or ID
 * @returns {Promise<Object>} API response
 */
const followOperation = async (action, type, profile, opts) => {
  'use strict';

  if (typeof opts === 'number') {
    opts = type === 'user' ? { userId: opts } : { clubId: opts };
  }

  opts = opts || {};

  const endpoint = `/${action}`;
  const body = {
    source: 9, // NOTE: unknown; (approx) search
    source_topic_id: null
  };

  if (type === 'user') {
    body.user_id = opts.userId || -1;
    body.user_ids = null;
  } else if (type === 'club') {
    body.club_id = opts.clubId || -1;
  }

  const response = await agent(endpoint, { body }, profile);
  const data = await response.json();

  return data;
};

/**
 * Follow a user
 * @param {Object} profile - User profile
 * @param {Object|Number} opts - User ID or options object
 * @returns {Promise<Object>} API response
 */
const followUser = async (profile, opts) => {
  return followOperation('follow', 'user', profile, opts);
};

/**
 * Unfollow a user
 * @param {Object} profile - User profile
 * @param {number} userId - User ID to unfollow
 * @returns {Promise<Object>} API response
 */
const unfollowUser = async (profile, userId) => {
  return followOperation('unfollow', 'user', profile, userId);
};

/**
 * Follow a club
 * @param {Object} profile - User profile
 * @param {Object|Number} opts - Club ID or options object
 * @returns {Promise<Object>} API response
 */
const followClub = async (profile, opts) => {
  return followOperation('follow', 'club', profile, opts);
};

/**
 * Unfollow a club
 * @param {Object} profile - User profile
 * @param {Object|Number} opts - Club ID or options object
 * @returns {Promise<Object>} API response
 */
const unfollowClub = async (profile, opts) => {
  return followOperation('unfollow', 'club', profile, opts);
};

module.exports = {
  followUser,
  unfollowUser,
  followClub,
  unfollowClub,
  followOperation
};