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
const RoomUserModel = require("../models/roomUser")
const fetch = require('node-fetch');
const { findClientToken } = require('./channel.controller')


let users = []
let mappedUsers = []

exports.getChannelInfo = async (req, res) => {
  const ch = req.body.channel
  const clientName = req.body.username;
  try {
    const client = await findClientToken(clientName);
    clubService.profile.token = client.token;
    const channelInfo = await clubService.getChannel({channel: ch})
    users = channelInfo.users
    users.map((user) => {
      console.log(user.name)
    })
    res.send(channelInfo)
  } catch (err) {
    res.status(500).send(err)
  }
}



// safe save room user to database
const saveUsersToDB = async (name, id, get, leave) => {
  const data = new RoomUserModel({
    name: name,
    id: id,
    get_welcome: get,
    leave: leave
  })
  try {
    const dataToSave = await data.save()
  } catch (error) {
    return `Error On Save user: ${error}`
  }
}