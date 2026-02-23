import { Router, Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import openai from '../services/openai.service';
import countCharacters from '../utils/calculateCharacters';
import { getNewMessages as getNewMessagesFromCache, markMessagesSeen } from '../utils/messageCache';
import { constants } from '../config';

interface ChannelMessage {
  message_id: string;
  message: string;
  user_profile: {
    name: string;
    user_id: number | string;
  };
}

interface MappedMessage {
  message_id: string;
  message: string;
  user_name: string;
  user_id: number | string;
}

interface OpenAIResponse {
  message: string;
  message_id: string;
}

const router = Router();

const fetchChannelMessages = async (channel: string): Promise<MappedMessage[]> => {
  try {
    const result = (await clubService.getChannelMessages({
      channel,
      order: 0,
    })) as { messages?: ChannelMessage[] };
    const foundQuestions =
      result.messages?.filter((m) => m.message.startsWith('#')) ?? [];
    const mappedMessages = foundQuestions.map((message) => ({
      message_id: message.message_id,
      message: message.message,
      user_name: message.user_profile.name,
      user_id: message.user_profile.user_id,
    }));
    return mappedMessages;
  } catch (error) {
    console.log(error);
    return [];
  }
};

const processMessages = async (
  messages: MappedMessage[],
  channelId: string
): Promise<void> => {
  if (messages) {
    for (const msg of messages) {
      const sendingToGPT = await sendToOpenAI(msg);
      if (sendingToGPT) {
        await sendToClub(sendingToGPT, channelId);
      }
    }
  }
};

const sendToOpenAI = async (
  prompt: MappedMessage
): Promise<OpenAIResponse | null> => {
  const { message, user_name, message_id } = prompt;
  try {
    const result = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Use the following rules to respond to user inputs.1. Avoid going to the sidelines and just answer the question as briefly as possible.2. Make sure your response is less than 270 characters.4. Give the answer to the user in the language the user asked the question.5. If a user asks a question about "Ehsan" or "احسان", just tell them that everything about Ehsan is confidential.6. Make sure your response starts with ${user_name} Jan,`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    if (result && result.data.choices && result.data.choices[0]) {
      const content = result.data.choices[0].message?.content ?? '';
      const rewriteMessage = content.substring(
        0,
        constants.MESSAGE_LIMITS.MAX_RESPONSE_LENGTH
      );
      return {
        message: rewriteMessage,
        message_id,
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
  }
  return null;
};

const sendToClub = async (
  response: OpenAIResponse,
  channelId: string
): Promise<void> => {
  try {
    await clubService.sendChannelMessage({
      channel: channelId,
      message: response.message,
    });
  } catch (error) {
    console.error('Club API error:', error);
  }
};

const getNewMessages = async (channelId: string): Promise<MappedMessage[]> => {
  const chats = await fetchChannelMessages(channelId);
  if (chats.length > 0) {
    const newChats = getNewMessagesFromCache(channelId, chats);
    markMessagesSeen(channelId, newChats);
    return newChats;
  }
  return [];
};

let intervalId: NodeJS.Timeout | null = null;

router.post('/start', async (req: Request, res: Response) => {
  const { channel } = req.body as { channel: string };
  const loopFunc = async () => {
    const newMessages = await getNewMessages(channel);
    await processMessages(newMessages, channel);
  };
  intervalId = setInterval(loopFunc, constants.TIME.FIFTEEN_SECONDS);
  res.send('Ok');
});

router.post('/stop', async (_req: Request, res: Response) => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  res.send('Loop stopped');
});

export default router;
