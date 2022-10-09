const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const clubService = require("../services/clubApiService");
const ClientModel = require("../models/token");
const fetch = require('node-fetch');
const apiUrl = "https://www.clubhouseapi.com/api/accept_speaker_invite";
const customHeaders = {
  "Content-Type": "application/json",
  "Authorization": "Token 4c721c9c2f7d18b463c83a5e61df4d3d34e39d71"
};

const findClientToken = async (clientName) => {
  try {
    const client = await ClientModel.findOne({ name: clientName }).lean();
    return client;
  } catch (err) {
    return `Error: ${err}`;
  }
};




const pingingActive = async (ch) => {
setTimeout(async function run() {
  await clubService.activePing({ ch });
  setTimeout(run, 100000);
}, 100000);
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
    pingingActive(channel)
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
  const clientName = req.body.username
  const client = await findClientToken(clientName);

  const data = {
    channel: req.body.channel
  }
  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Token " + client.token
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      res.send(data)
    });
};
