/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Application } from '../../types/config.js'

export const lastVersion: Application = {
  apiRoot: 'https://www.clubhouseapi.com/api',
  userAgent: 'clubhouse/android',
  userAgentStatic: 'clubhouse/1208 (iPhone; iOS 15.4.1; Scale/3.00)',
  appVersion: '22.4.7',
  appBuild: '1208',
  agoraKey: process.env.AGORA_KEY || '938de3e8055e42b281bb8c6f69c21f78s',
  pubnubRoot: 'https://clubhouse.pubnub.com',
  pubnubPubKey: process.env.PUBNUB_PUB_KEY || 'pub-c-6878d382-5ae6-4494-9099-f930f938868b',
  pubnubSubKey: process.env.PUBNUB_SUB_KEY || 'sub-c-a4abea84-9ca3-11ea-8e71-f2b83ac9263d',
  pubnubSDK: 'PubNFub-ObjC-iOS/4.15.11'
}
