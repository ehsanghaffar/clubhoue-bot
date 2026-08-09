/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { clubService } from '../services/club-api.service.js'
import logger from './logger.js'

const fetchMessages = async (channel: string): Promise<unknown> => {
  try {
    const result = await clubService.getChannelMessages({ channel, order: 0 })
    return result
  } catch (error) {
    logger.error('Error fetching room messages:', { error })
    return null
  }
}

export default fetchMessages
