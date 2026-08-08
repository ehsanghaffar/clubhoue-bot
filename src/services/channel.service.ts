/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { ChannelListResponse, JoinChannelResponse, SendMessageResponse } from '../types/services'
import type { Profile } from '../types/config'
import { clubService, ClubApiService } from './club-api.service'
import logger from '../utils/logger'

let fetchChannelMessages: (channelId: string, order?: number) => Promise<unknown[] | null> = async () => null

export function setFetchChannelMessages (fn: typeof fetchChannelMessages): void {
  fetchChannelMessages = fn
}

export class ChannelService {
  private readonly clubService: ClubApiService

  constructor (clubServiceInstance?: ClubApiService) {
    this.clubService = clubServiceInstance ?? clubService
  }

  async joinChannelWithInviteHandling (channelId: string): Promise<JoinChannelResponse> {
    try {
      const result = await this.clubService.joinChannel({ channel: channelId })

      if (result) {
        setTimeout(() => {
          void this.handleInviteRequests(channelId)
        }, 3000)
      }

      return result
    } catch (error) {
      logger.error('Error joining channel:', { error })
      throw error
    }
  }

  async handleInviteRequests (channelId: string): Promise<void> {
    try {
      const messages = await fetchChannelMessages(channelId) as Array<{
        user_profile?: { user_id: number | string }
      }>
      if (messages) {
        logger.info('Processing invites for channel:', { channelId })
        for (const invite of messages) {
          if (invite.user_profile?.user_id) {
            logger.info('Inviting user to speakers:', { userId: invite.user_profile.user_id })
            const result = await this.clubService.inviteToSpeakers({
              channel: channelId,
              user_id: invite.user_profile.user_id
            })
            logger.debug('Invite result:', { result })
          }
        }
      }
    } catch (error) {
      logger.error('Error handling invite requests:', { error })
    }
  }

  async getChannelFeed (): Promise<ChannelListResponse> {
    try {
      return await this.clubService.getChannels()
    } catch (error) {
      logger.error('Error getting channel feed:', { error })
      throw error
    }
  }

  async getChannelMessages (options: { channel: string, order?: number }): Promise<unknown> {
    try {
      return await fetchChannelMessages(options.channel, options.order)
    } catch (error) {
      logger.error('Error getting channel messages:', { error })
      throw error
    }
  }

  async sendChannelMessage (options: { channel: string, message: string }): Promise<SendMessageResponse> {
    try {
      return await this.clubService.sendChannelMessage(options)
    } catch (error) {
      logger.error('Error sending channel message:', { error })
      throw error
    }
  }

  async getUserProfile (): Promise<Profile | null> {
    try {
      return await this.clubService.getProfile()
    } catch (error) {
      logger.error('Error getting user profile:', { error })
      throw error
    }
  }
}

export const channelService = new ChannelService()
