/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import { HttpService } from "../lib/httpservice";
import { Profile } from "../types/config";
import logger from "../utils/logger";

const httpService = new HttpService({ baseURL: 'https://api.clubhouse.com' })

interface ApiResponse<T = unknown> {
  data: T;
}

const getChannels = async (profile: Profile): Promise<unknown> => {
  try {
    const response = await httpService.get<ApiResponse>('/get_feed_v3?get_unconnected_rooms=true', '(null)');
    const data = response.data;
    return data;
  } catch (error) {
    // Handle errors here.
    logger.error('Error getting channels:', { error });
    throw error;
  }
};

export default getChannels;