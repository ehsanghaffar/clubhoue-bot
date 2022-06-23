/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
// eslint-disable-next-line no-unused-vars
const moment = require('moment')

const { Client, profiles } = require('../')

const profile = {
  ...profiles.application.lastVersion,
  ...profiles.locales.English
}

const club = new Client({ profile })
const interval = 1000
let isBreak = false

const sendChannelMessage = async (req, res) => {
  const data = req.body
  const channelId = data?.channel
  const message = data?.message
  const sendReq = await club.sendChannelMessage({ channel: channelId, message: message })
  club.debug(sendReq)
  // res.send(sendReq)
  console.log('sendReq', sendReq)
}

/**
 * A simple function to display count down
 * @param {Date} end - counter end time
 */
async function countDown (end, update) {
  const delta = moment().diff(end, 'seconds')
  if (delta < 0) {
    let adjust = 0
    if (delta >= -900) {
      if (!isBreak) {
        isBreak = true
        // TODO: add break notification
        sendChannelMessage({
          channel: 'xLJWVaYd',
          message: 'Break time!'
        })
      }
    } else {
      if (isBreak) {
        isBreak = false
        // TODO: add break notification
        sendChannelMessage({
          channel: 'xLJWVaYd',
          message: 'Back to work!'
        })
      }
      adjust = 900
    }
    const cd = moment.utc((Math.abs(delta) - adjust) * 1000).format('mm:ss')
    let timer = ''
    // eslint-disable-next-line no-const-assign
    timer = cd.toString().split(':')
    console.log('timer', timer)
    setTimeout(() => countDown(end, false), interval)
  } else {
    setTimeout(() => countDown(end.add(1, 'hour'), true), interval)
  }
}

const pomodoroTimer = async () => {
  try {
    const nextHour = moment().endOf('hour').add(1, 'second')
    countDown(nextHour, true)
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  sendChannelMessage,
  pomodoroTimer,
  isBreak
}
