/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Profile } from '../types/config.js'
import type {
  AgentFunction,
  JoinChannelOptions,
  LeaveChannelOptions,
  GetChannelMessagesOptions,
  SendChannelMessageOptions,
  GetUserOptions,
  SearchUsersOptions,
  AcceptSpeakerInviteOptions,
  InviteToSpeakersOptions,
  ActivePingOptions,
  GetNotificationsOptions,
  ChannelListResponse,
  JoinChannelResponse,
  LeaveChannelResponse,
  SendMessageResponse,
  UserResponse
} from '../types/services.js'
import logger from '../utils/logger.js'

export class ClubApiService {
  private profile: Profile | null = null
  private agent: AgentFunction | null = null

  constructor (profile: Profile | null = null, agent: AgentFunction | null = null) {
    this.profile = profile
    this.agent = agent
  }

  setProfile (profile: Profile): void {
    this.profile = profile
  }

  setAgent (agent: AgentFunction): void {
    this.agent = agent
  }

  /**
   * Temporarily swaps the auth token used for API calls (e.g. to act as a
   * registered client from the DB).
   */
  setProfileToken (token: string): void {
    if (this.profile == null) {
      throw new Error('Profile not configured')
    }
    this.profile.token = token
  }

  private ensureConfigured (): void {
    if ((this.agent == null) || (this.profile == null)) {
      throw new Error('Agent and profile not configured')
    }
  }

  async getChannels (): Promise<ChannelListResponse> {
    this.ensureConfigured()
    try {
      logger.debug('Getting channels...')
      const response = await this.agent!(
        '/get_feed_v3?get_unconnected_rooms=true',
        { body: {} },
        { ...this.profile!, userId: '(null)' }
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting channels:', { error: message })
      return {}
    }
  }

  async joinChannel (opts: JoinChannelOptions): Promise<JoinChannelResponse> {
    this.ensureConfigured()
    try {
      const source = opts.source ?? 'feed'
      const attributions = {
        is_explore: opts.isExplore,
        rank: opts.rank
      }
      const body: Record<string, unknown> = { channel: opts.channel }

      if (source === 'feed') {
        body.attribution_details = Buffer.from(JSON.stringify(attributions)).toString('base64')
        body.attribution_source = source
      }

      logger.debug('Joining channel:', { channel: opts.channel })
      const response = await this.agent!('/join_channel', { body }, this.profile!)
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error joining channel:', { error: message })
      return { success: false }
    }
  }

  async leaveChannel (opts: LeaveChannelOptions): Promise<LeaveChannelResponse> {
    this.ensureConfigured()
    try {
      logger.debug('Leaving channel:', { channel: opts.channel })
      const response = await this.agent!(
        '/leave_channel',
        { body: { channel: opts.channel } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error leaving channel:', { error: message })
      return { success: false }
    }
  }

  async getChannelMessages (opts: GetChannelMessagesOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Getting channel messages:', { channel: opts.channel })
      const response = await this.agent!(
        '/get_channel_messages',
        {
          query: {
            channel: opts.channel,
            is_chronological_order: Number(opts.order ?? 0)
          }
        },
        { ...this.profile!, userId: '(null)' }
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting messages:', { error: message })
      return { messages: [] }
    }
  }

  async sendChannelMessage (opts: SendChannelMessageOptions): Promise<SendMessageResponse> {
    this.ensureConfigured()
    try {
      logger.debug('Sending channel message')
      const response = await this.agent!(
        '/send_channel_message',
        { body: { channel: opts.channel, message: opts.message } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error sending message:', { error: message })
      return { success: false }
    }
  }

  async getUser (opts: GetUserOptions): Promise<UserResponse> {
    this.ensureConfigured()
    try {
      const userId = opts.user_id ?? opts.id
      logger.debug('Getting user:', { userId })
      const response = await this.agent!(
        '/get_profile',
        { body: { user_id: userId } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting user:', { error: message })
      return { user_id: undefined }
    }
  }

  async searchUsers (query: string | SearchUsersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      const opts: SearchUsersOptions = typeof query === 'string' ? { query } : query ?? {}
      logger.debug('Searching users:', { query: opts.query })
      const response = await this.agent!(
        '/search_users',
        {
          body: {
            cofollows_only: opts.onlyCoFollows ?? false,
            followers_only: opts.onlyFollowers ?? false,
            following_only: opts.onlyFollowing ?? false,
            query: opts.query ?? ''
          }
        },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error searching users:', { error: message })
      return { users: [] }
    }
  }

  async getProfile (): Promise<Profile | null> {
    this.ensureConfigured()
    try {
      logger.debug('Getting profile')
      return this.profile
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting profile:', { error: message })
      return this.profile ?? null
    }
  }

  async acceptSpeakerInvite (opts: AcceptSpeakerInviteOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Accepting speaker invite:', { channel: opts.channel })
      const response = await this.agent!(
        '/accept_speaker_invite',
        { body: { channel: opts.channel } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error accepting speaker invite:', { error: message })
      return { success: false }
    }
  }

  async inviteToSpeakers (opts: InviteToSpeakersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Inviting to speakers:', { userId: opts.user_id })
      const response = await this.agent!(
        '/invite_speaker',
        { body: { channel: opts.channel, user_id: opts.user_id } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error inviting speaker:', { error: message })
      return { success: false }
    }
  }

  async activePing (opts: ActivePingOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Active ping for channel:', { channel: opts.channel })
      const response = await this.agent!(
        '/active_ping',
        { body: { channel: opts.channel } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error active ping:', { error: message })
      return { success: false }
    }
  }

  async getChannel (opts: { channel: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Getting channel:', { channel: opts.channel })
      const response = await this.agent!(
        '/get_channel',
        { body: { channel: opts.channel } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting channel:', { error: message })
      return { channel_id: undefined }
    }
  }

  async emojiReaction (opts: { channel: string, emoji: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Sending emoji reaction:', { channel: opts.channel, emoji: opts.emoji })
      const response = await this.agent!(
        '/emoji_reaction',
        { body: { channel: opts.channel, emoji: opts.emoji } },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error sending emoji reaction:', { error: message })
      return { success: false }
    }
  }

  async getNotifications (opts: GetNotificationsOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Getting notifications:', { page: opts.page, pageSize: opts.size })
      const response = await this.agent!(
        '/get_notifications',
        {
          query: {
            page_size: opts.size ?? 20,
            page: opts.page ?? 1
          }
        },
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting notifications:', { error: message })
      return { notifications: [] }
    }
  }

  async getActionableNotifications (): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    try {
      logger.debug('Getting actionable notifications')
      const response = await this.agent!(
        '/get_actionable_notifications',
        {},
        this.profile!
      )
      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Error getting actionable notifications:', { error: message })
      return { notifications: [] }
    }
  }
}

export const clubService = new ClubApiService()
