import { clubService } from '../services/club-api.service';

interface ChannelMessage {
  message_id: string;
  message?: string;
  user_profile?: {
    user_id: number | string;
  };
}

interface ChannelMessagesResult {
  messages?: ChannelMessage[];
}

export const fetchChannelMessages = async (
  channel: string,
  order: number = 0
): Promise<ChannelMessage[]> => {
  try {
    const result = (await clubService.getChannelMessages({
      channel,
      order,
    })) as ChannelMessagesResult;
    return result.messages ?? [];
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    return [];
  }
};

export const fetchFilteredMessages = async (
  channel: string,
  filterFn: (message: ChannelMessage) => boolean,
  order: number = 0
): Promise<ChannelMessage[]> => {
  const messages = await fetchChannelMessages(channel, order);
  return messages.filter(filterFn);
};

export const fetchInviteMessages = async (
  channel: string
): Promise<ChannelMessage[]> => {
  return fetchFilteredMessages(channel, (message) =>
    Boolean(message.message?.startsWith('/invite'))
  );
};

export const fetchQuestionMessages = async (
  channel: string
): Promise<ChannelMessage[]> => {
  return fetchFilteredMessages(channel, (message) =>
    Boolean(message.message?.startsWith('#'))
  );
};
