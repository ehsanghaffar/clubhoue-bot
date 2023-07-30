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
const openai = require('../services/openAIService');
const RoomMessageModel = require('../models/roomMessage')
const { countCharacters } = require('../utils/index')

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
    message_id: message_id,
    message: message,
    owner: owner,
    is_send_answer_to_club: false
  });
  try {
    const dataToSave = await data.save()
    return dataToSave
  } catch (error) {
    console.error(error)
    return error
  }
}

const getAllDbMessage = async (channelId) => {
  const messages = await RoomMessageModel.find();
  if (messages) {
    messages.map(async (msg) => {
      if (!msg.is_send_answer_to_club) {
        const sendingToGPT = await sendToOpenAI(msg)
        if (sendingToGPT) {
          await sendToClub(sendingToGPT, channelId)
        }
      }
    })
  }
}

const sendToOpenAI = async (prompt) => {
  const { message, owner, message_id, is_send_answer_to_club, _id } = prompt
  try {
    if (!is_send_answer_to_club) {
      const result = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-16k-0613",
        messages: [
          {
            role: "system",
            content: `You are "Club Master", Use the following rules to respond to user inputs.
            1. Avoid going to the sidelines and just answer the question as briefly as possible.
            2. Make sure your response is less than 270 characters.
            4. Give the answer to the user in the language the user asked the question.
            5. If a user asks a question about "Ehsan" or "احسان", just tell them that everything about Ehsan is confidential.
            `
          },
          {
            role: "user",
            content: message,
          }
        ],
      });
      if (result.data) {
        const answer = result.data.choices[0].message;
        const countAnswer = countCharacters(answer.content)
        clubService.debug("Count: ", countAnswer)
        const updateDB = await RoomMessageModel.findByIdAndUpdate(_id, { $set: { is_send_answer_to_club: true, gpt_answer: answer.content } })
        return {
          message: answer,
          user: owner,
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

const sendToClub = async (data, channel) => {
  const { user, message } = data
  try {
    const rewriteMessage = message.content.substring(0, 260)
    const result = await clubService.sendChannelMessage({ channel: channel, message: `${user.substring(0, user.indexOf(" "))} jan, ${rewriteMessage}` })
    if (result?.success) {
      clubService.debug(result)
    }
  } catch (error) {
    console.error(error);
  }
}

const saveUniqueMessagesToDB = async (channelId) => {
  const chats = await fetchMessages(channelId);
  if (chats) {
    const uniqueChats = chats.filter((m) => !uniqueMessages.has(m));
    for (const message of uniqueChats) {
      uniqueMessages.add(message);
      const checkIfExist = await RoomMessageModel.findOne({message_id: message.message_id});
      if (!checkIfExist) {
        await saveMessageToMongoDatabase(message);
      }
    }
  }
};

let intervalId = null;

router.post('/start', async function (req, res) {
  const { channel } = req.body
  const loopFunc = async () => {
    await saveUniqueMessagesToDB(channel)
    await getAllDbMessage(channel)
  }
  intervalId = setInterval(loopFunc, 15000)
  res.send("Ok")
})

router.post('/stop', async function (req, res) {
  clearInterval(intervalId)
  res.send("Loop stopped")
})

router.get('/messages', async (req, res) => {
  try {
    const messages = await RoomMessageModel.find();
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