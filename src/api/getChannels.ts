/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Profile } from '../types/config';
import { createApiEndpoint } from '../utils/api-factory';

const getChannels = createApiEndpoint({
  url: '/get_feed_v3?get_unconnected_rooms=true',
  method: 'POST',
  defaultOptions: {
    body: {},
  },
  parseUserId: true,
});

export default getChannels;
