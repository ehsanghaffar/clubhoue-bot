/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const clubService = require("../services/clubApiService");
const openai = require('../services/openAIService');
const { countCharacters } = require('../utils/index');
const { getNewMessages: getNewMessagesFromCache, markMessagesSeen } = require('../utils/messageCache');
const { constants } = require('../config');

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
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    if (result && result.choices && result.choices[0]) {
      const rewriteMessage = message.content.substring(0, constants.MESSAGE_LIMITS.MAX_RESPONSE_LENGTH);
      return {
        message: rewriteMessage,
        message_id: message_id
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
  }
  return null;
};

// Send response back to Clubhouse
const sendToClub = async (response, channelId) => {
  try {
    await clubService.sendChannelMessage({
      channel: channelId,
      message: response.message
    });
  } catch (error) {
    console.error("Club API error:", error);
  }
};

// Get new unique messages
const getNewMessages = async (channelId) => {
  const chats = await fetchChannelMessages(channelId);
  clubService.debug(`chats count: ${chats.length}`);
  if (chats) {
    const newChats = getNewMessagesFromCache(channelId, chats);
    markMessagesSeen(channelId, newChats);
    return newChats;
  }
  return [];
};

let intervalId = null;

/**
 * @swagger
 * /chatbot/start:
 *   post:
 *     summary: Start the chatbot processing loop for a channel
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Channel ID to monitor for messages
 *             example:
 *               channel: "channel123"
 *     responses:
 *       200:
 *         description: Chatbot processing started
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Ok"
 */
router.post('/start', async function (req, res) {
  const { channel } = req.body;
  const loopFunc = async () => {
    const newMessages = await getNewMessages(channel);
    await processMessages(newMessages, channel);
  };
  intervalId = setInterval(loopFunc, constants.TIME.FIFTEEN_SECONDS);
  res.send("Ok");
});

/**
 * @swagger
 * /chatbot/stop:
 *   post:
 *     summary: Stop the chatbot processing loop
 *     tags: [Chatbot]
 *     responses:
 *       200:
 *         description: Chatbot processing stopped
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Loop stopped"
 */
router.post('/stop', async function (req, res) {
  clearInterval(intervalId);
  res.send("Loop stopped");
});

module.exports = router;
