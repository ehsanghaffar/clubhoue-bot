/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Profile } from '../../types/config.js'
import type {
  AgentCustoms,
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
} from './types.js'
import { wrapClubhouseCall, parseJsonResponse, type ClubhouseCallOptions } from './http.js'
import type { RetryConfig } from './retry.js'
import logger from '../../utils/logger.js'

/**
 * Typed wrapper around the Clubhouse private API. One instance is bound to a
 * single credential profile; per-request token overrides are supported for
 * acting as another identity without mutating shared state.
 */
export class ClubApiService {
  private readonly profile: Profile
  private readonly agent: AgentFunction
  private readonly retry?: RetryConfig
  private readonly refreshToken?: string
  private readonly onTokenRefreshed?: (token: string) => void

  constructor (
    profile: Profile,
    agent: AgentFunction,
    config?: { retry?: RetryConfig, refreshToken?: string, onTokenRefreshed?: (token: string) => void }
  ) {
    this.profile = profile
    this.agent = agent
    this.retry = config?.retry
    this.refreshToken = config?.refreshToken ?? profile.refreshToken
    this.onTokenRefreshed = config?.onTokenRefreshed
  }

  private ensureConfigured (): void {
    if (this.agent == null || this.profile == null) {
      throw new Error('Agent and profile not configured')
    }
  }

  private customs (token?: string): AgentCustoms {
    this.ensureConfigured()
    return token != null ? { ...this.profile, token } : this.profile
  }

  /**
   * Rotates the access token via `POST /refresh_token`. Returns the new token
   * (updating the bound profile for subsequent calls) or `null` when no
   * refresh token is configured. The Clubhouse private API has returned the
   * token under several field names across app versions, so a few known keys
   * are accepted to degrade gracefully.
   */
  async refreshAccessToken (): Promise<string | null> {
    if (this.refreshToken == null || this.refreshToken === '') {
      return null
    }
    logger.debug('Refreshing Clubhouse access token')
    const body = await wrapClubhouseCall(
      'refreshToken',
      async () => await this.agent(
        '/refresh_token',
        { body: { refresh_token: this.refreshToken } },
        this.profile
      ),
      async (response) => await parseJsonResponse<Record<string, unknown>>(response),
      { retry: this.retry }
    )
    const candidate = body.access_token ?? body.auth_token ?? body.token
    if (typeof candidate !== 'string' || candidate === '') {
      logger.error('Clubhouse refresh_token returned no access token')
      return null
    }
    this.profile.token = candidate
    this.onTokenRefreshed?.(candidate)
    return candidate
  }

  private async requestJson<T> (operation: string, fn: () => Promise<Response>): Promise<T> {
    const callOptions: ClubhouseCallOptions = {
      retry: this.retry,
      onAuthFailure: this.refreshToken != null
        ? async () => (await this.refreshAccessToken()) != null
        : undefined
    }
    return await wrapClubhouseCall(operation, fn, async (response) => await parseJsonResponse<T>(response), callOptions)
  }

  async getChannels (): Promise<ChannelListResponse> {
    logger.debug('Getting channels...')
    return await this.requestJson('getChannels', async () =>
      await this.agent(
        '/get_feed_v3?get_unconnected_rooms=true',
        { body: {} },
        { ...this.customs(), userId: '(null)' }
      )
    )
  }

  async joinChannel (opts: JoinChannelOptions): Promise<JoinChannelResponse> {
    this.ensureConfigured()
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
    return await this.requestJson('joinChannel', async () =>
      await this.agent('/join_channel', { body }, this.profile)
    )
  }

  async leaveChannel (opts: LeaveChannelOptions): Promise<LeaveChannelResponse> {
    this.ensureConfigured()
    logger.debug('Leaving channel:', { channel: opts.channel })
    return await this.requestJson('leaveChannel', async () =>
      await this.agent(
        '/leave_channel',
        { body: { channel: opts.channel } },
        this.profile
      )
    )
  }

  async getChannelMessages (opts: GetChannelMessagesOptions): Promise<Record<string, unknown>> {
    logger.debug('Getting channel messages:', { channel: opts.channel })
    return await this.requestJson('getChannelMessages', async () =>
      await this.agent(
        '/get_channel_messages',
        {
          query: {
            channel: opts.channel,
            is_chronological_order: Number(opts.order ?? 0)
          }
        },
        { ...this.customs(opts.token), userId: '(null)' }
      )
    )
  }

  async sendChannelMessage (opts: SendChannelMessageOptions): Promise<SendMessageResponse> {
    this.ensureConfigured()
    logger.debug('Sending channel message')
    return await this.requestJson('sendChannelMessage', async () =>
      await this.agent(
        '/send_channel_message',
        { body: { channel: opts.channel, message: opts.message } },
        this.profile
      )
    )
  }

  async getUser (opts: GetUserOptions): Promise<UserResponse> {
    this.ensureConfigured()
    const userId = opts.user_id ?? opts.id
    logger.debug('Getting user:', { userId })
    return await this.requestJson('getUser', async () =>
      await this.agent(
        '/get_profile',
        { body: { user_id: userId } },
        this.profile
      )
    )
  }

  async searchUsers (query: string | SearchUsersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    const opts: SearchUsersOptions = typeof query === 'string' ? { query } : query ?? {}
    logger.debug('Searching users:', { query: opts.query })
    return await this.requestJson('searchUsers', async () =>
      await this.agent(
        '/search_users',
        {
          body: {
            cofollows_only: opts.onlyCoFollows ?? false,
            followers_only: opts.onlyFollowers ?? false,
            following_only: opts.onlyFollowing ?? false,
            query: opts.query ?? ''
          }
        },
        this.profile
      )
    )
  }

  async getProfile (): Promise<Profile | null> {
    this.ensureConfigured()
    logger.debug('Getting profile')
    return this.profile
  }

  async acceptSpeakerInvite (opts: AcceptSpeakerInviteOptions): Promise<Record<string, unknown>> {
    logger.debug('Accepting speaker invite:', { channel: opts.channel })
    return await this.requestJson('acceptSpeakerInvite', async () =>
      await this.agent(
        '/accept_speaker_invite',
        { body: { channel: opts.channel } },
        this.customs(opts.token)
      )
    )
  }

  async inviteToSpeakers (opts: InviteToSpeakersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Inviting to speakers:', { userId: opts.user_id })
    return await this.requestJson('inviteToSpeakers', async () =>
      await this.agent(
        '/invite_speaker',
        { body: { channel: opts.channel, user_id: opts.user_id } },
        this.profile
      )
    )
  }

  async activePing (opts: ActivePingOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Active ping for channel:', { channel: opts.channel })
    return await this.requestJson('activePing', async () =>
      await this.agent(
        '/active_ping',
        { body: { channel: opts.channel } },
        this.profile
      )
    )
  }

  async getChannel (opts: { channel: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Getting channel:', { channel: opts.channel })
    return await this.requestJson('getChannel', async () =>
      await this.agent(
        '/get_channel',
        { body: { channel: opts.channel } },
        this.profile
      )
    )
  }

  async emojiReaction (opts: { channel: string, emoji: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Sending emoji reaction:', { channel: opts.channel, emoji: opts.emoji })
    return await this.requestJson('emojiReaction', async () =>
      await this.agent(
        '/emoji_reaction',
        { body: { channel: opts.channel, emoji: opts.emoji } },
        this.profile
      )
    )
  }

  async getNotifications (opts: GetNotificationsOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Getting notifications:', { page: opts.page, pageSize: opts.size })
    return await this.requestJson('getNotifications', async () =>
      await this.agent(
        '/get_notifications',
        {
          query: {
            page_size: opts.size ?? 20,
            page: opts.page ?? 1
          }
        },
        this.profile
      )
    )
  }

  async getActionableNotifications (): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Getting actionable notifications')
    return await this.requestJson('getActionableNotifications', async () =>
      await this.agent(
        '/get_actionable_notifications',
        {},
        this.profile
      )
    )
  }
}
