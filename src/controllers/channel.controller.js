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
const clubService = require("../services/clubApiService");
const ClientModel = require("../models/token");
const { createInternalError } = require('../utils/errors');
const { startPingLoop, stopPingLoop } = require('../utils/pingManager');
const { constants } = require('../config');
const channelService = require('../services/channelService');


exports.findClientToken = async (clientName) => {
  try {
    const client = await ClientModel.findOne({ name: clientName }).lean();
    return client;
  } catch (err) {
    return `Error: ${err}`;
  }
};

exports.getFeed = async (req, res) => {
  try {
    const feed = await channelService.getChannelFeed();
    res.send(feed);
  } catch (error) {
    console.error('Error getting channel feed:', error);
    res.status(500).send('Error getting channel feed');
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { channel } = req.body;
    const result = await channelService.joinChannelWithInviteHandling(channel);

    if (result) {
      startPingLoop(channel);
    }

    res.send(result);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).send('Error joining room');
  }
};

// leave from room
exports.leaveRoom = async (req, res) => {
  try {
    const { channel } = req.body;
    stopPingLoop(channel);
    const result = await clubService.leaveChannel({ channel: channel });
    res.send(result);
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).send('Error leaving room');
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { channel } = req.body;
    const result = await clubService.acceptSpeakerInvite({ channel });
    res.send(result);
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).send(error);
  }
};

exports.getChannelMsgs = async (req, res) => {
  try {
    const { channel, order } = req.body;
    const result = await channelService.getChannelMessages({ channel, order });
    res.send(result);
  } catch (error) {
    console.error('Error getting channel messages:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

exports.sendMessageToRoom = async (req, res) => {
  try {
    const { channel, message } = req.body;
    const result = await channelService.sendChannelMessage({ channel, message });
    res.send(result);
  } catch (error) {
    console.error('Error sending message to room:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

exports.myProfile = async (req, res) => {
  try {
    const profile = await channelService.getUserProfile();
    res.send(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

exports.getCurrentChannel = async (req, res) => {
  try {
    const { channel } = req.body;
    const current = await channelService.getCurrentChannel(channel);
    res.send(current);
  } catch (error) {
    console.error('Error getting current channel:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

exports.emojiReaction = async (req, res) => {
  try {
    const { channel, emoji } = req.body;
    const reaction = await clubService.emojiReaction({ channel, emoji });
    res.send(reaction);
  } catch (error) {
    console.error('Error sending emoji reaction:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};