const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const clubService = require("../services/clubApiService");
const ClientModel = require("../models/token");
const fetch = require('node-fetch');
const openai = require('../services/openAIService');
const RoomMessageModel = require('../models/roomMessage')
require('dotenv').config();

const { Client, profiles } = require("..");

const profile = {
  ...profiles.application.lastVersion,
};

const club = new Client({ profile });

const profileLoc = path.join(__dirname, "../../profile.json");
let ctx = false;
let ctx2;


if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc));

  profile.token = ctx.auth_token
  profile.deviceId = ctx.deviceId;
}


const uniqueIds = new Set();
const uniqueMessages = new Set();

const fetchMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 })
    const findedQuestions = result.messages?.filter((m) =>
      m.message.startsWith("#")
    );
    const mappedMessages = findedQuestions.map((message) => {
      return {
        message_id: message.message_id,
        message: message.message,
        owner: message.user_profile.name
      }
    })
    return mappedMessages
  } catch (error) {
    console.log(error);
  }
};

const saveMessageToMongoDatabase = async (msg) => {
  const { message_id, message, owner } = msg
  const data = new RoomMessageModel({
    id: message_id,
    message: message,
    owner: owner,
    sended: false
  });
  try {
    const dataToSave = await data.save()
    return dataToSave
  } catch (error) {
    return error
  }

}

const getAllDbMessage = async (channelId) => {
  const messages = await RoomMessageModel.find();
  if (messages) {
    messages.map(async (msg) => {
      if (!msg.sended) {
        const sendingToGPT = await sendToOpenAI(msg)
        if (sendingToGPT) {
          await sendToClub(sendingToGPT, channelId)
        }
      }
    })
  }
}


const sendToOpenAI = async (prompt) => {
  const { message, owner, id, sended, _id } = prompt
  try {
    if (!sended) {
      const result = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Your are ClubGPT, And make sure generated answer is less than 260 characters.",
          },
          {
            role: "user",
            content: message,
          }
        ],
      });
      if (result.data) {
        const updateDB = await RoomMessageModel.findByIdAndUpdate(_id, {$set: { sended: true } })
        const answer = result.data.choices[0].message;
        return {
          message: answer,
          user: owner,
        }
      }
    }
  } catch (error) {
    console.log(error)
  }

}

const sendToClub = async (data, channel) => {
  const { user, message } = data
  try {
    const result = await clubService.sendChannelMessage({ channel: channel, message: `${user.substring(0, user.indexOf(" "))} answer:  ${message.content}` })
    const sendDone = result.data;
    console.log(sendDone);xw
  } catch (error) {
    console.log(error);
  }
}

const saveUniqueMessagesToDB = async (channelId) => {
  const chats = await fetchMessages(channelId)
  if (chats) {
    chats.map((m) => {
      if (!uniqueMessages.has(m)) {
        uniqueMessages.add(m)
      }
    })
    uniqueMessages.forEach(async (message) => {
      await saveMessageToMongoDatabase(message)
    })
  }
}


let intervalId = null;

router.post('/start', async function (req, res) {
  const { channel } = req.body

  const loopFunc = async () => {
    await saveUniqueMessagesToDB(channel)
    await getAllDbMessage(channel)
  }

  intervalId = setInterval(loopFunc, 30000)
  res.send("Ok")
})

router.post('/stop', async function (req, res) {
  clearInterval(intervalId)
  res.send("Loop stopped")
})

router.get('/messages', async (req, res) => {
  try {
    const messages = await RoomMessageModel.find();
    // const messages = await getAllDbMessage()
    res.send(messages)
  } catch (error) {
    res.send(error)
  }
})

router.get('/clear-messages', async (req, res) => {
  try {
    const removeAll = await RoomMessageModel.deleteMany({})
    res.send(removeAll)
  } catch (error) {
    res.send(error)
  }
})


module.exports = router;