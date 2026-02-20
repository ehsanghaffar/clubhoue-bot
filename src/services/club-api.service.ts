import type { Profile } from '../types/config';
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
} from '../types/services';

export class ClubApiService {
  private profile: Profile | null = null;
  private agent: AgentFunction | null = null;
  private debug: (...args: unknown[]) => void = console.log;

  constructor(profile: Profile | null = null, agent: AgentFunction | null = null) {
    this.profile = profile;
    this.agent = agent;
  }

  setProfile(profile: Profile): void {
    this.profile = profile;
  }

  setAgent(agent: AgentFunction): void {
    this.agent = agent;
  }

  setDebug(debugFn: (...args: unknown[]) => void): void {
    this.debug = debugFn;
  }

  private ensureConfigured(): void {
    if (!this.agent || !this.profile) {
      throw new Error('Agent and profile not configured');
    }
  }

  async getChannels(): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Getting channels...');
      const response = await this.agent!(
        '/get_feed_v3?get_unconnected_rooms=true',
        { body: {} },
        { ...this.profile!, userId: '(null)' }
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error getting channels:', message);
      return [];
    }
  }

  async joinChannel(opts: JoinChannelOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      const source = opts.source ?? 'feed';
      const attributions = {
        is_explore: opts.isExplore,
        rank: opts.rank,
      };
      const body: Record<string, unknown> = { channel: opts.channel };

      if (source === 'feed') {
        body.attribution_details = Buffer.from(JSON.stringify(attributions)).toString('base64');
        body.attribution_source = source;
      }

      this.debug('Joining channel:', opts.channel);
      const response = await this.agent!('/join_channel', { body }, this.profile!);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error joining channel:', message);
      return { success: false };
    }
  }

  async leaveChannel(opts: LeaveChannelOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Leaving channel:', opts.channel);
      const response = await this.agent!(
        '/leave_channel',
        { body: { channel: opts.channel } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error leaving channel:', message);
      return { success: false };
    }
  }

  async getChannelMessages(opts: GetChannelMessagesOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Getting channel messages:', opts.channel);
      const response = await this.agent!(
        '/get_channel_messages',
        {
          query: {
            channel: opts.channel,
            is_chronological_order: Number(opts.order ?? 0),
          },
        },
        { ...this.profile!, userId: '(null)' }
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error getting messages:', message);
      return { messages: [] };
    }
  }

  async sendChannelMessage(opts: SendChannelMessageOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Sending channel message');
      const response = await this.agent!(
        '/add_channel_message',
        { body: { channel: opts.channel, body: opts.body } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error sending message:', message);
      return { success: false };
    }
  }

  async getUser(opts: GetUserOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      const userId = opts.user_id ?? opts.id;
      this.debug('Getting user:', userId);
      const response = await this.agent!(
        '/get_profile',
        { body: { user_id: userId } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error getting user:', message);
      return { user_profile: null };
    }
  }

  async searchUsers(query: string | SearchUsersOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      const opts: SearchUsersOptions = typeof query === 'string' ? { query } : query ?? {};
      this.debug('Searching users:', opts.query);
      const response = await this.agent!(
        '/search_users',
        {
          body: {
            cofollows_only: opts.onlyCoFollows ?? false,
            followers_only: opts.onlyFollowers ?? false,
            following_only: opts.onlyFollowing ?? false,
            query: opts.query ?? '',
          },
        },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error searching users:', message);
      return { users: [] };
    }
  }

  async getProfile(): Promise<Profile | null> {
    this.ensureConfigured();
    try {
      this.debug('Getting profile');
      return this.profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error getting profile:', message);
      return this.profile ?? {};
    }
  }

  async acceptSpeakerInvite(opts: AcceptSpeakerInviteOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Accepting speaker invite:', opts.channel);
      const response = await this.agent!(
        '/accept_speaker_invite',
        { body: { channel: opts.channel } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error accepting speaker invite:', message);
      return { success: false };
    }
  }

  async inviteToSpeakers(opts: InviteToSpeakersOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Inviting to speakers:', opts.user_id);
      const response = await this.agent!(
        '/invite_speaker',
        { body: { channel: opts.channel, user_id: opts.user_id } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error inviting speaker:', message);
      return { success: false };
    }
  }

  async activePing(opts: ActivePingOptions): Promise<unknown> {
    this.ensureConfigured();
    try {
      this.debug('Active ping for channel:', opts.channel);
      const response = await this.agent!(
        '/active_ping',
        { body: { channel: opts.channel } },
        this.profile!
      );
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.debug('Error active ping:', message);
      return { success: false };
    }
  }
}

export const clubService = new ClubApiService();
