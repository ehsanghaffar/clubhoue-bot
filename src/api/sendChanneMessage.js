import agent from '../structures/agent'

const sendChannelMessage = async (profile, d) => {
  'use strict'
  const channel = d.channel
  const res = await agent(
    '/send_channel_message',
    {
      body: {
        channel: channel,
        message: d.message
      }
    },
    profile
  )
  const data = await res.json()
  return data
}

export default sendChannelMessage

export const specification = {
  success: Boolean
}
