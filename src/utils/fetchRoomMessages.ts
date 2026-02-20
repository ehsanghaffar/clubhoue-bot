import { clubService } from '../services/club-api.service';

const fetchMessages = async (channel: string): Promise<unknown> => {
  try {
    const result = await clubService.getChannelMessages({ channel, order: 0 });
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export default fetchMessages;
