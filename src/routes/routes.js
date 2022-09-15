/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const auth = require('../middlewares/auth')

const { Client, profiles } = require('..')
// const {
//   pomodoroTimer,
//   sendChannelMessage
// } = require('../utils/pomodoro-alert')

const profile = {
  ...profiles.application.lastVersion
}

const club = new Client({ profile })

const profileLoc = path.join(__dirname, '../../profile.json')
let ctx = false

if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc))

  profile.token = ctx.tokens.auth
  // profile.userId = ctx.user.user_id
  profile.deviceId = ctx.deviceId
}

// get All Available rooms
// const GetChannels = async (req, res) => {
//   const channels = await club.getChannels()
//   res.send(channels)
// }

// Join to specific room
const JoinToChannel = async (req, res) => {
  const ch = req.query.channel
  const joinReq = await club.joinChannel({ channel: ch, source: 'feed' })
  if (joinReq.success) {
    handleActivePing(ch)
  } else {
    console.log('joinReq.error', joinReq)
  }
  res.send(joinReq)
}

// active ping loop for room
const handleActivePing = async (channel) => {
  const ping = await club.activePing({ channel })
  club.debug(ping)
  if (ping.success) {
    setTimeout(() => {
      handleActivePing(channel)
    }, 180000)
  }
  if (ping.should_leave) {
    console.log('should_leave', ping)
    await club.joinChannel({ channel: channel, source: 'feed' })
  }
}

// Leave from room
const LeaveChannel = async (req, res) => {
  const ch = req.query.channel
  const leaveReq = await club.leaveChannel({ channel: ch })
  club.debug(leaveReq)
  res.send(leaveReq)
}

const changeProfile = async (req, res) => {
  const user = req.body
  if (fs.existsSync(profileLoc)) {
    ctx = JSON.parse(fs.readFileSync(profileLoc))
    ctx.token = user?.token
    ctx.tokens.auth = user?.token
    ctx.userId = user?.userId
    ctx.user.username = user?.username
    ctx.user.user_id = user?.userId
    fs.writeFileSync(profileLoc, JSON.stringify(ctx))
  }
  res.send('ok')
}

// const sendChannelMessage = async (req, res) => {
//   const data = req.body
//   const channelId = data?.channel
//   const message = data?.message
//   const sendReq = await club.sendChannelMessage({ channel: channelId, message: message })
//   club.debug(sendReq)
//   res.send(sendReq)
// }

// const pomodoroTest = async (req, res) => {
//   if (pomodoroTimer.isBreak) {
//     console.log('break Time')
//   } else {
//     const message = sendChannelMessage({ channel: 'c-1', message: 'pomodoro' })
//     console.log('message', message)
//   }
//   res.send('ok')
// }

// router.get('/pomodoro', pomodoroTest)

// Join channel route
router.post('/join', auth,JoinToChannel)
// Leave channel route
router.post('/leave', LeaveChannel)

// Get channels route
router.get('/channels', auth, async (req, res) => {
  try {
    const channels = await club.getChannels()
    res.send(channels)
  } catch (error) {
    console.log(error)
    res.status(500).send("Error")
  }
})

// Change profile route
router.post('/change-profile', changeProfile)

// router.post('/send-channel-message', sendChannelMessage)

module.exports = router
