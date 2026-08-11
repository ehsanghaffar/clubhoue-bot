/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { ChannelListResponse, JoinChannelResponse, SendMessageResponse } from '../platforms/clubhouse/types.js'
import type { Profile } from '../types/config.js'
import { clubService, type ClubApiService } from '../platforms/clubhouse/index.js'
import { constants } from '../config/index.js'
import logger from '../utils/logger.js'

export interface ChannelMessage {
  message_id: string
  message?: string
  user_profile?: {
    user_id: number | string
  }
}

const INVITE_ALLOW_LIST = new Set<string>(
  (process.env.INVITE_ALLOW_LIST ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
)

const INVITE_REQUEST_KEYWORDS = /invite( me)?|stage|speaker|استیج|اجازه|بالا ببر|برو بالا/i

export class ChannelService {
  private readonly clubService: ClubApiService
  private readonly invitedUsers = new Set<string>()

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
        }, constants.TIME.THREE_SECONDS)
      }

      return result
    } catch (error) {
      logger.error('Error joining channel:', { error })
      throw error
    }
  }

  async handleInviteRequests (channelId: string): Promise<void> {
    try {
      if (INVITE_ALLOW_LIST.size === 0) {
        logger.warn('Speaker invites are disabled: INVITE_ALLOW_LIST is not configured', {
          channelId
        })
        return
      }

      const messages = await this.fetchChannelMessages(channelId)
      if (messages.length > 0) {
        logger.info('Processing invite requests for channel:', { channelId })
        for (const invite of messages) {
          await this.inviteIfRequested(channelId, invite)
        }
      }
    } catch (error) {
      logger.error('Error handling invite requests:', { error })
    }
  }

  private async inviteIfRequested (channelId: string, message: ChannelMessage): Promise<void> {
    const userId = String(message.user_profile?.user_id ?? '')
    if (!userId) {
      return
    }

    const dedupeKey = `${channelId}:${userId}`
    if (this.invitedUsers.has(dedupeKey)) {
      logger.debug('Skipping user already invited this session:', { channelId, userId })
      return
    }

    if (!INVITE_ALLOW_LIST.has(userId)) {
      logger.debug('Skipping user not on the invite allow list:', { channelId, userId })
      return
    }

    if (message.message == null || !INVITE_REQUEST_KEYWORDS.test(message.message)) {
      logger.debug('Skipping message without an invite request:', { channelId, userId })
      return
    }

    this.invitedUsers.add(dedupeKey)
    const result = await this.clubService.inviteToSpeakers({
      channel: channelId,
      user_id: userId
    })
    logger.debug('Invite result:', { result })
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
