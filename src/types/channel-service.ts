/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { ClubApiService } from '../services/club-api.service'

export interface ChannelServiceOptions {
  clubService: ClubApiService
}

export interface MessageInvite {
  user_profile?: {
    user_id: number | string
  }
}

export type FetchChannelMessagesFunction = (channelId: string, order?: number) => Promise<MessageInvite[] | null>
