import { clubService } from '../services/club-api.service';
import logger from './logger';

const fetchMessages = async (channel: string): Promise<unknown> => {
  try {
    const result = await clubService.getChannelMessages({ channel, order: 0 });
    return result;
  } catch (error) {
    logger.error('Error fetching room messages:', { error });
    return null;
  }
};

export default fetchMessages;
