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
const fetch = require('node-fetch');
const apiUrl = "https://www.clubhouseapi.com/api/accept_speaker_invite";


exports.findClientToken = async (clientName) => {
  try {
    const client = await ClientModel.findOne({ name: clientName }).lean();
    return client;
  } catch (err) {
    return `Error: ${err}`;
  }
};

const fetchMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 })
    const invites = result.messages?.filter((m) => m.message.startsWith("/invite"))
    return invites
  } catch (error) {
    console.log(error);
  }
};

// const ActivePingNewMethod = (channelId) => {
//   setInterval(async () => {
//     await clubService.activePing({ channelId })
//   }, 1 * 60 * 1000);
// }

// const newActivePing = async (channel) => {
//   try {
//     const ping = await clubService.activePing({ channel });
//     if (ping.should_leave) {
//       console.log("Error", ping)
//       return ping;
//     }
//     setTimeout(() => {
//       newActivePing(channel)
//     }, 120000);
//     return ping;
//   } catch (error) {
//     console.log(error)
//     return `Error: ${error}`
//   }
// };

// const newActivePing = async (channel) => {
//   try {
//     const ping = await clubService.activePing({ channel });
//     if (ping.should_leave) {
//       clubService.debug("Leave: ", ping)
//       return ping;
//     }
//     return await new Promise(resolve => setTimeout(() => resolve(newActivePing(channel)), 240000));
//   } catch (error) {
//     console.log(error)
//     return `Error: ${error}`
//   }
// };

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


const pingServer = async (channel) => {
  const ping = await clubService.activePing({ channel })
  
  if (ping.should_leave) {
    console.log('should_leave', ping)
    await club.joinChannel({ channel: channel, source: 'feed' })
    // await handleIviteRequests(channel)
    return;
  }

  setTimeout(() => {
    pingServer(channel);
  }, 180000);
}

const handleIviteRequests = async (changeId) => {
  try {
    const messages = await fetchMessages(changeId)
    if (messages) {
      console.log("invites", messages)
      for (const invite of messages) {
        console.log("invite", invite)
        const result = await clubService.inviteToSpeakers({channel: changeId, user: invite.user_profile.user_id })
        console.log("added", result)
      }
    }
  } catch (error) {
    console.log("errrooor", error)
  }

}

exports.joinRoom = async (req, res) => {
  const { channel } = req.body
  try {
    const result = await clubService.joinChannel({ channel: channel });
    if (result) {
      pingServer(channel)
      setTimeout(() => {
        handleIviteRequests(channel);
      }, 3000);
    }
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
    const result = await clubService.acceptSpeakerInvite({ channel: ch })
    res.send(result)
  } catch (error) {
    res.status(500).send(error)
  }
};

exports.getChannelMsgs = async (req, res) => {
  const { channel, order } = req.body
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: order })
    res.send(result)
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Error:  ${error}`,
    });
  }
}

exports.sendMessageToRoom = async (req, res) => {
  const { channel, message } = req.body
  try {
    const result = await clubService.sendChannelMessage({ channel: channel, message: message })
    res.send(result)
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Error:  ${error}`,
    });
  }
}

exports.myProfile = async (req, res) => {
  try {
    const getMe = await clubService.getProfile()
    res.send(getMe)
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Error:  ${error}`,
    });
  }
}

exports.getCurrentChannel = async (req, res) => {
  const { channel } = req.body
  try {
    const current = await clubService.getChannel({channel: channel})
    res.send(current)
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Error:  ${error}`,
    });
  }
}

exports.emojiReaction = async (req, res) => {
  const { channel, emoji } = req.body
  try {
    const reaction = await clubService.emojiReaction({channel: channel, emoji: emoji})
    res.send(reaction)
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `Error:  ${error}`,
    });
  }
}