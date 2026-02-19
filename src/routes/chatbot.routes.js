const express = require("express");
const router = express.Router();
const clubService = require("../services/clubApiService");
const openai = require('../services/openAIService');
const { countCharacters } = require('../utils/index');

const uniqueMessages = new Set();

// Fetch messages from the channel
const fetchChannelMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 });
    clubService.debug(result)
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

// Process messages directly
const processMessages = async (messages, channelId) => {
  if (messages) {
    for (const msg of messages) {
      const sendingToGPT = await sendToOpenAI(msg);
      if (sendingToGPT) {
        await sendToClub(sendingToGPT, channelId);
      }
    }
  }
};

// Send message to OpenAI for processing
const sendToOpenAI = async (prompt) => {
  const { message, user_name, message_id } = prompt;
  try {
    const result = await openai.createChatCompletion({
      model: "gpt-4o",
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
      return {
        message: answer,
        user: user_name,
      };
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

// Get new unique messages
const getNewMessages = async (channelId) => {
  const chats = await fetchChannelMessages(channelId);
  clubService.debug(`chats count: ${chats.length}`);
  if (chats) {
    const newChats = chats.filter((m) => !uniqueMessages.has(m.message_id));
    for (const message of newChats) {
      uniqueMessages.add(message.message_id);
    }
    return newChats;
  }
  return [];
};

let intervalId = null;

// Start processing loop
router.post('/start', async function (req, res) {
  const { channel } = req.body;
  const loopFunc = async () => {
    const newMessages = await getNewMessages(channel);
    await processMessages(newMessages, channel);
  };
  intervalId = setInterval(loopFunc, 15000);
  res.send("Ok");
});

// Stop processing loop
router.post('/stop', async function (req, res) {
  clearInterval(intervalId);
  res.send("Loop stopped");
});

module.exports = router;
