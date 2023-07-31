const express = require("express");
const router = express.Router();
const clubService = require("../services/clubApiService");
const openai = require('../services/openAIService');
const RoomMessageModel = require('../models/roomMessage');
const { countCharacters } = require('../utils/index');

const uniqueMessages = new Set();

// Fetch messages from the channel
const fetchMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 });
    const foundQuestions = result.messages?.filter((m) => m.message.startsWith("#"));
    const mappedMessages = foundQuestions.map((message) => ({
      message_id: message.message_id,
      message: message.message,
      user_name: message.user_profile.name,
      user_id: message.user_profile.user_id
    }));
    return mappedMessages;
  } catch (error) {
    console.log(error);
    return [];
  }
};

// Save message to MongoDB
const saveMessageToMongoDatabase = async (msg) => {
  const { message_id, message, user_name, user_id } = msg;
  const data = new RoomMessageModel({
    message_id,
    message,
    user_name,
    user_id,
    is_send_answer_to_club: false
  });
  try {
    const savedData = await data.save();
    return savedData;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Process existing messages in the database
const processDbMessages = async (channelId) => {
  const messages = await RoomMessageModel.find();
  if (messages) {
    messages.map(async (msg) => {
      if (!msg.is_send_answer_to_club) {
        const sendingToGPT = await sendToOpenAI(msg);
        if (sendingToGPT) {
          await sendToClub(sendingToGPT, channelId);
        }
      }
    });
  }
};

// Send message to OpenAI for processing
const sendToOpenAI = async (prompt) => {
  const { message, user_name, message_id, is_send_answer_to_club, _id } = prompt;
  try {
    if (!is_send_answer_to_club) {
      const result = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-16k-0613",
        messages: [
          {
            role: "system",
            content: `Use the following rules to respond to user inputs.1. Avoid going to the sidelines and just answer the question as briefly as possible.2. Make sure your response is less than 270 characters.4. Give the answer to the user in the language the user asked the question.5. If a user asks a question about "Ehsan" or "احسان", just tell them that everything about Ehsan is confidential.6. Make sure your response starts with ${user_name} Jan,`
          },
          {
            role: "user",
            content: message,
          }
        ],
      });
      if (result.data) {
        clubService.debug(result.data)
        const answer = result.data.choices[0].message;
        const countAnswer = countCharacters(answer.content);
        const updateDB = await RoomMessageModel.findByIdAndUpdate(_id, {
          $set: { is_send_answer_to_club: true, gpt_answer: answer.content }
        });
        return {
          message: answer,
          user: user_name,
        };
      }
    }
  } catch (error) {
    console.error(error);
  }
};

// Send message to the club channel
const sendToClub = async (data, channel) => {
  const { user, message } = data;
  try {
    const rewriteMessage = message.content.substring(0, 270);
    const result = await clubService.sendChannelMessage({ channel, message: `${rewriteMessage}` });
    if (result?.success) {
      clubService.debug(result);
    }
  } catch (error) {
    console.error(error);
  }
};

// Save unique messages to the database
const saveUniqueMessagesToDB = async (channelId) => {
  const chats = await fetchMessages(channelId);
  if (chats) {
    const uniqueChats = chats.filter((m) => !uniqueMessages.has(m));
    for (const message of uniqueChats) {
      uniqueMessages.add(message);
      const checkIfExist = await RoomMessageModel.findOne({ message_id: message.message_id });
      if (!checkIfExist) {
        await saveMessageToMongoDatabase(message);
      }
    }
  }
};

let intervalId = null;

// Start processing loop
router.post('/start', async function (req, res) {
  const { channel } = req.body;
  const loopFunc = async () => {
    await saveUniqueMessagesToDB(channel);
    await processDbMessages(channel);
  };
  intervalId = setInterval(loopFunc, 15000);
  res.send("Ok");
});

// Stop processing loop
router.post('/stop', async function (req, res) {
  clearInterval(intervalId);
  res.send("Loop stopped");
});

// Get all messages from the database
router.get('/messages', async (req, res) => {
  try {
    const messages = await RoomMessageModel.find();
    res.send(messages);
  } catch (error) {
    res.send(error);
  }
});

// Clear all messages from the database
router.get('/clear-messages', async (req, res) => {
  try {
    const removeAll = await RoomMessageModel.deleteMany({});
    res.send(removeAll);
  } catch (error) {
    res.send(error);
  }
});

module.exports = router;
