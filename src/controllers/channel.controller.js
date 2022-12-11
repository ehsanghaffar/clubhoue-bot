const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const clubService = require("../services/clubApiService");
const ClientModel = require("../models/token");
const fetch = require('node-fetch');
const apiUrl = "https://www.clubhouseapi.com/api/accept_speaker_invite";


const findClientToken = async (clientName) => {
  try {
    const client = await ClientModel.findOne({ name: clientName }).lean();
    return client;
  } catch (err) {
    return `Error: ${err}`;
  }
};

const ActivePingNewMethod = (channelId) => {
  setInterval( async () => {
    await clubService.activePing({channelId})
  }, 1 * 60 * 1000);
}


// get loby feed
exports.getFeed = async (req, res) => {
  try {
    const feed = await clubService.getChannels();
    res.send(feed);
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Couldn't get feed ${error}`,
    });
  }
};

// join specify room
exports.joinRoom = async (req, res) => {
  const clientName = req.body.username;
  const channel = req.body.channel;
  try {
    const client = await findClientToken(clientName);
    clubService.profile.token = client.token;
    ActivePingNewMethod(channel)
    const result = await clubService.joinChannel({ channel: channel });
    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
};

// leave from room
exports.leaveRoom = async (req, res) => {
  const channel = req.body.channel;
  try {
    const result = await clubService.leaveChannel({ channel: channel });
    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.acceptInvite = async (req, res) => {
  const ch = req.body.channel
  try {
    const result = await clubService.acceptSpeakerInvite({channel: ch})
    res.send(result)
  } catch (error) {
    res.status(500).send(error)
  }
};

exports.getChannelMsgs = async = (req, res) => {
  const ch = req.body.channel
  const order = req.body.order
  try {
    const res = await clubService.getChannelMessages({channel: ch, order: order})
    res.send(res)
  } catch (error) {
    res.status(500).send(error)
  }
}