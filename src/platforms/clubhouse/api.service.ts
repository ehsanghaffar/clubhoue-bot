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
import logger from '../../utils/logger.js'

/**
 * Typed wrapper around the Clubhouse private API. One instance is bound to a
 * single credential profile; per-request token overrides are supported for
 * acting as another identity without mutating shared state.
 */
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

  private ensureConfigured (): void {
    if ((this.agent == null) || (this.profile == null)) {
      throw new Error('Agent and profile not configured')
    }
  }

  /**
   * Builds the customs object for a call. An optional token override lets a
   * single request act as a specific identity without mutating shared state.
   */
  private customs (token?: string): AgentCustoms {
    this.ensureConfigured()
    return token ? { ...this.profile!, token } : this.profile!
  }

  async getChannels (): Promise<ChannelListResponse> {
    logger.debug('Getting channels...')
    const response = await this.agent!(
      '/get_feed_v3?get_unconnected_rooms=true',
      { body: {} },
      { ...this.customs(), userId: '(null)' }
    )
    return await response.json()
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
    const response = await this.agent!('/join_channel', { body }, this.profile!)
    return await response.json()
  }

  async leaveChannel (opts: LeaveChannelOptions): Promise<LeaveChannelResponse> {
    this.ensureConfigured()
    logger.debug('Leaving channel:', { channel: opts.channel })
    const response = await this.agent!(
      '/leave_channel',
      { body: { channel: opts.channel } },
      this.profile!
    )
    return await response.json()
  }

  async getChannelMessages (opts: GetChannelMessagesOptions): Promise<Record<string, unknown>> {
    logger.debug('Getting channel messages:', { channel: opts.channel })
    const response = await this.agent!(
      '/get_channel_messages',
      {
        query: {
          channel: opts.channel,
          is_chronological_order: Number(opts.order ?? 0)
        }
      },
      { ...this.customs(opts.token), userId: '(null)' }
    )
    return await response.json()
  }

  async sendChannelMessage (opts: SendChannelMessageOptions): Promise<SendMessageResponse> {
    this.ensureConfigured()
    logger.debug('Sending channel message')
    const response = await this.agent!(
      '/send_channel_message',
      { body: { channel: opts.channel, message: opts.message } },
      this.profile!
    )
    return await response.json()
  }

  async getUser (opts: GetUserOptions): Promise<UserResponse> {
    this.ensureConfigured()
    const userId = opts.user_id ?? opts.id
    logger.debug('Getting user:', { userId })
    const response = await this.agent!(
      '/get_profile',
      { body: { user_id: userId } },
      this.profile!
    )
    return await response.json()
  }

  async searchUsers (query: string | SearchUsersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
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
  }

  async getProfile (): Promise<Profile | null> {
    this.ensureConfigured()
    logger.debug('Getting profile')
    return this.profile
  }

  async acceptSpeakerInvite (opts: AcceptSpeakerInviteOptions): Promise<Record<string, unknown>> {
    logger.debug('Accepting speaker invite:', { channel: opts.channel })
    const response = await this.agent!(
      '/accept_speaker_invite',
      { body: { channel: opts.channel } },
      this.customs(opts.token)
    )
    return await response.json()
  }

  async inviteToSpeakers (opts: InviteToSpeakersOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Inviting to speakers:', { userId: opts.user_id })
    const response = await this.agent!(
      '/invite_speaker',
      { body: { channel: opts.channel, user_id: opts.user_id } },
      this.profile!
    )
    return await response.json()
  }

  async activePing (opts: ActivePingOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Active ping for channel:', { channel: opts.channel })
    const response = await this.agent!(
      '/active_ping',
      { body: { channel: opts.channel } },
      this.profile!
    )
    return await response.json()
  }

  async getChannel (opts: { channel: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Getting channel:', { channel: opts.channel })
    const response = await this.agent!(
      '/get_channel',
      { body: { channel: opts.channel } },
      this.profile!
    )
    return await response.json()
  }

  async emojiReaction (opts: { channel: string, emoji: string }): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Sending emoji reaction:', { channel: opts.channel, emoji: opts.emoji })
    const response = await this.agent!(
      '/emoji_reaction',
      { body: { channel: opts.channel, emoji: opts.emoji } },
      this.profile!
    )
    return await response.json()
  }

  async getNotifications (opts: GetNotificationsOptions): Promise<Record<string, unknown>> {
    this.ensureConfigured()
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
  }

  async getActionableNotifications (): Promise<Record<string, unknown>> {
    this.ensureConfigured()
    logger.debug('Getting actionable notifications')
    const response = await this.agent!(
      '/get_actionable_notifications',
      {},
      this.profile!
    )
    return await response.json()
  }
}

/**
 * LEGACY COMPATIBILITY BOUNDARY — process-global singleton.
 *
 * This instance exists ONLY to preserve the deprecated `/api` surface. It is
 * mutated exactly once at process startup by `initializeService()`
 * (`setProfile` + `setAgent`) before any request is served, and is never
 * mutated from a request handler — per-request identity is passed through the
 * `token` override argument, not by mutating this instance. As long as that
 * invariant holds, concurrent legacy requests do not observe each other's
 * state.
 *
 * The modern `/v1` API and the core domain must NEVER depend on this singleton;
 * they use per-credential `ClubhouseAdapter` instances built from decrypted
 * credentials. This singleton will be removed when the legacy `/api` surface is
 * sunset (see `docs/api.md`).
 */
export const clubService = new ClubApiService()
