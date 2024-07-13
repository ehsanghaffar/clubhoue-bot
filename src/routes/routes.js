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
const auth = require("../middlewares/auth");
const TokenModel = require('../models/token')
const channelController = require('../controllers/channel.controller')
const welcomeController = require('../controllers/welcomeChannel.controller')
require('dotenv').config();

const { Client, profiles } = require("..");
const clubService = require("../services/clubApiService");

const profile = {
  ...profiles.application.lastVersion,
};

const club = new Client({ profile });

const profileLoc = path.join(__dirname, "../../profile.json");
let ctx = false;
let ctx2;

// const auth_token = process.env.auth_token


if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc));

  profile.token = ctx.auth_token
  profile.deviceId = ctx.deviceId;
}

// active ping loop for room
const handleActivePing = async (channel) => {
  const ping = await clubService.activePing({ channel });
  clubService.debug(ping);
  if (ping.success) {
    setTimeout(() => {
      handleActivePing(channel);
    }, 180000);
  }
  if (ping.should_leave) {
    console.log("should_leave", ping);
    await clubService.joinChannel({ channel: channel, source: "feed" });
  }
};

const newActivePing = async (channel) => {
  try {
    const ping = await clubService.activePing({ channel });
    let timer = setTimeout(() => {
      newActivePing(channel)
    }, 180000);
    if (ping.should_leave) {
      clearTimeout(timer)
      console.log("Error", ping)
    }
    return ping;
  } catch (error) {
    console.log(error)
    return `Error: ${error}`
  }
};

router.post('/add_profile', async (req, res) => {
  const data = new TokenModel({
    token: req.body.token,
    name: req.body.name
  });
  try {
    const dataToSave = await data.save();
    res.status(200).json(dataToSave)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

router.post("/change-profile", async (req, res) => {
  const user = req.body;
  try {
    if (fs.existsSync(profileLoc)) {
      ctx = JSON.parse(fs.readFileSync(profileLoc));
      ctx.token = user?.token;
      ctx.tokens.auth = user?.token;
      ctx._debug.auth_token = user?.token
      fs.writeFileSync(profileLoc, JSON.stringify(ctx));
    }
    res.send(ctx)
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

const getUserToken = async (name) => {
  try {
    const user = await TokenModel.findOne({ name: name }).lean()
    return user
  } catch (error) {
    return `Error ${error}`
  }
}


router.post("/search_users", async (req, res) => {
  const query = req.body;
  try {
    const users = await clubService.searchUsers(query);
    res.send(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
});

router.post("/accept_invite", async (req, res) => {
  const userName = req.body.username;
  const channel = req.body.channel;
  try {
    const user = await getUserToken(userName)
    profile.token = user.token
    const result = await clubService.acceptSpeakerInvite({ channel: channel });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
});

// router.post("/me", async (req, res) => {
//   const body = req.body;
//   try {
//     const result = await club.getProfile(body);
//     res.send(result);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error...");
//   }
// });

// get unique user profile
router.post('/get_user', async (req, res) => {
  const id = req.body.user_id
  try {
    const user = await clubService.getUser({ id: id })
    res.send(user)
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
})

router.get('/all_users', async (req, res) => {
  try {
    const users = await TokenModel.find()
    res.send(users)
  } catch (error) {
    res.status(500).send(error)
  }
})

router.get('/get_token', async (req, res) => {
  ctx2 = JSON.parse(fs.readFileSync(profileLoc));
  res.send(ctx2.token)
})


// Join room | NEW METHOD
router.post('/join_room', channelController.joinRoom)
router.post('/accept_invite', channelController.acceptInvite);

router.post('/get_room_users', welcomeController.getChannelInfo);

router.post("/leave", channelController.leaveRoom);

router.post('/channels', channelController.getFeed);

router.post('/current-channel', channelController.getCurrentChannel);

router.post('/room-msgs', channelController.getChannelMsgs);
router.post('/send-room-msg', channelController.sendMessageToRoom);

router.post('/me', channelController.myProfile)



module.exports = router;
