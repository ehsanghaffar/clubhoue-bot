/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { ChannelListResponse, JoinChannelResponse, SendMessageResponse } from '../types/services.js'
import type { Profile } from '../types/config.js'
import { clubService, ClubApiService } from './club-api.service.js'
import logger from '../utils/logger.js'

export interface ChannelMessage {
  message_id: string
  message?: string
  user_profile?: {
    user_id: number | string
  }
}

export class ChannelService {
  private readonly clubService: ClubApiService

  constructor (clubServiceInstance?: ClubApiService) {
    this.clubService = clubServiceInstance ?? clubService
  }

  /**
   * Fetches channel messages through the configured Club API service.
   *
   * Previously this pipeline relied on an externally injected `fetchChannelMessages`
   * callback that was never wired up, so room messages and invite automation always
   * resolved to `null`. Now it always uses the real, typed API implementation.
   */
  private async fetchChannelMessages (channelId: string, order = 0): Promise<ChannelMessage[]> {
    try {
      const result = (await this.clubService.getChannelMessages({
        channel: channelId,
        order
      })) as { messages?: ChannelMessage[] }
      return result.messages ?? []
    } catch (error) {
      logger.error('Error fetching channel messages:', { error })
      return []
    }
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
      const messages = await this.fetchChannelMessages(channelId)
      if (messages.length > 0) {
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

  async getChannelMessages (options: { channel: string, order?: number }): Promise<ChannelMessage[]> {
    return await this.fetchChannelMessages(options.channel, options.order)
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
