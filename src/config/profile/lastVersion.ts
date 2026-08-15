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
  agoraKey: process.env.AGORA_KEY ?? '',
  pubnubRoot: 'https://clubhouse.pubnub.com',
  pubnubPubKey: process.env.PUBNUB_PUB_KEY ?? '',
  pubnubSubKey: process.env.PUBNUB_SUB_KEY ?? '',
  pubnubSDK: 'PubNFub-ObjC-iOS/4.15.11'
}
