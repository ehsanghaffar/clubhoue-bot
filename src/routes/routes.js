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

const { Client, profiles } = require("..");

const profile = {
  ...profiles.application.lastVersion,
};

const club = new Client({ profile });

const profileLoc = path.join(__dirname, "../../profile.json");
let ctx = false;

if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc));

  profile.token = ctx.tokens.auth;
  profile.deviceId = ctx.deviceId;
}

// Join to specific room
const JoinToChannel = async (req, res) => {
  const ch = req.query.channel;
  const joinReq = await club.joinChannel({ channel: ch, source: "feed" });
  if (joinReq.success) {
    handleActivePing(ch);
  } else {
    console.log("joinReq.error", joinReq);
  }
  res.send(joinReq);
};

// active ping loop for room
const handleActivePing = async (channel) => {
  const ping = await club.activePing({ channel });
  club.debug(ping);
  if (ping.success) {
    setTimeout(() => {
      handleActivePing(channel);
    }, 180000);
  }
  if (ping.should_leave) {
    console.log("should_leave", ping);
    await club.joinChannel({ channel: channel, source: "feed" });
  }
};

const newActivePing = async (channel) => {
  try {
    const ping = await club.activePing({ channel });
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

// Leave from room
const LeaveChannel = async (req, res) => {
  const ch = req.query.channel;
  const leaveReq = await club.leaveChannel({ channel: ch });
  club.debug(leaveReq);
  res.send(leaveReq);
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
    res.status(400).json({message: error.message})
  }
})

router.post("/change-profile", async (req, res) => {
  const user = req.body;
  try {
    if (fs.existsSync(profileLoc)) {
      ctx = JSON.parse(fs.readFileSync(profileLoc));
      ctx.token = user?.token;
      ctx.tokens.auth = user?.token;
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
    const user = await TokenModel.findOne({name: name}).lean()
    return user
  } catch (error) {
    return `Error ${error}`
  }
}

// join with db user
// router.post('/join_room', async (req, res) => {
//   const username = req.body.username
//   const channel = req.body.channel
//   try {
//     const user = await getUserToken(username)
//     profile.token = user.token;
//     const joinResult = await club.joinChannel({ channel: channel, source: "feed" });
//     const active = await newActivePing(channel)
//     club.debug(active)
//     res.send(joinResult)
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Error");
//   }
// })

// Join room | NEW METHOD
router.post('/join_room', channelController.joinRoom)
router.post('/accept_invite', channelController.acceptInvite);

// Join channel route
// router.post("/join", JoinToChannel);
// Leave channel route
router.post("/leave", LeaveChannel);

router.get('/channels', channelController.getFeed);

router.post("/search_users", async (req, res) => {
  const query = req.body;
  try {
    const users = await club.searchUsers(query);
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
    const result = await club.acceptSpeakerInvite({ channel: channel });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
});

router.post("/me", async (req, res) => {
  const body = req.body;
  try {
    const result = await club.getProfile(body);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
});

// get unique user profile
router.post('/get_user', async (req, res) => {
  const id = req.body.user_id
  try {
    const user = await club.getUser({id: id})
    res.send(user)
  } catch (error) {
    console.error(error);
    res.status(500).send("Error...");
  }
})

router.get('/all_users', async(req, res) => {
  try {
    const users = await TokenModel.find()
    res.send(users)
  } catch (error) {
    res.status(500).send(error)
  }
})

module.exports = router;
