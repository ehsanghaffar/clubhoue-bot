/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import { HttpService } from "../lib/httpservice";

const httpService = new HttpService({ baseURL: 'https://example.com/api' })

interface Profile {
  // Define the profile type here.
  // Example: userId: string;
  userId: string;
  // Add other properties as needed.
}

const getChannels = async (profile: Profile): Promise<any> => {
  try {
    const response = await httpService.get<any>('/get_feed_v3?get_unconnected_rooms=true', '(null)');
    const data = response.data;
    return data;
  } catch (error) {
    // Handle errors here.
    console.error('Error:', error);
    throw error;
  }
};

export default getChannels;