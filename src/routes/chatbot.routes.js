const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const clubService = require("../services/clubApiService");
const ClientModel = require("../models/token");
const fetch = require('node-fetch');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();

const { Client, profiles } = require("..");

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

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

const uniqueIds = new Set();

const fetchMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 })
    const findedQuestions = result.messages?.filter((m) =>
      m.message.startsWith("#")
    );
    return findedQuestions
  } catch (error) {
    console.log(error);
  }
};

const sendToChat = async (prompt) => {
  const { message, user_profile, message_id } = prompt
  let name = user_profile?.name?.substring(0, user_profile.name.indexOf(" "))
  try {
    if (!uniqueIds.has(message_id)) {
      const result = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Make sure generated answer is less than 260 characters.",
          },
          {
            role: "user",
            content: message,
          }
        ],
      });
      if (result.data) {
        uniqueIds.add(message_id)
        const answer = result.data.choices[0].message;
        return {
          message: answer,
          user: name,
        }
      }
    }
  } catch (error) {
    console.log(error)
  }

}

const sendToClub = async (data, channel) => {
  try {
    const result = await clubService.sendChannelMessage({ channel: channel, message: `${data.user} answer:  ${data.message.content}` })
    const sendDone = result.data;
    console.log(sendDone);
  } catch (error) {
    console.log(error);
  }
}



let intervalId = null;

router.post('/start', async function (req, res) {
  const { channel } = req.body

  const loopFunc = async () => {
    const chats = await fetchMessages(channel)
    if (chats) {
      const answer = await sendToChat(chats[0])
      if (answer) {
        await sendToClub(answer, channel)
      }
    }
  }

  intervalId = setInterval(loopFunc, 15000)
  res.send("Ok")
})

router.post('/stop', async function (req, res) {
  clearInterval(intervalId)
  res.send("Loop stopped")
})


module.exports = router;