import { clubService, ClubApiService } from './club-api.service';

let fetchChannelMessages: (channelId: string, order?: number) => Promise<unknown[] | null> = async () => null;

export function setFetchChannelMessages(fn: typeof fetchChannelMessages): void {
  fetchChannelMessages = fn;
}

export class ChannelService {
  private clubService: ClubApiService;

  constructor(clubServiceInstance?: ClubApiService) {
    this.clubService = clubServiceInstance ?? clubService;
  }

  async joinChannelWithInviteHandling(channelId: string): Promise<unknown> {
    try {
      const result = await this.clubService.joinChannel({ channel: channelId });

      if (result) {
        setTimeout(() => {
          this.handleInviteRequests(channelId);
        }, 3000);
      }

      return result;
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  async handleInviteRequests(channelId: string): Promise<void> {
    try {
      const messages = await fetchChannelMessages(channelId) as Array<{
        user_profile?: { user_id: number | string };
      }>;
      if (messages) {
        console.log('Processing invites for channel:', channelId);
        for (const invite of messages) {
          if (invite.user_profile?.user_id) {
            console.log('Inviting user to speakers:', invite.user_profile.user_id);
            const result = await this.clubService.inviteToSpeakers({
              channel: channelId,
              user_id: invite.user_profile.user_id,
            });
            console.log('Invite result:', result);
          }
        }
      }
    } catch (error) {
      console.error('Error handling invite requests:', error);
    }
  }

  async getChannelFeed(): Promise<unknown> {
    try {
      return await this.clubService.getChannels();
    } catch (error) {
      console.error('Error getting channel feed:', error);
      throw error;
    }
  }

  async getChannelMessages(options: { channel: string; order?: number }): Promise<unknown> {
    try {
      return await fetchChannelMessages(options.channel, options.order);
    } catch (error) {
      console.error('Error getting channel messages:', error);
      throw error;
    }
  }

  async sendChannelMessage(options: { channel: string; message: string }): Promise<unknown> {
    try {
      return await this.clubService.sendChannelMessage(options);
    } catch (error) {
      console.error('Error sending channel message:', error);
      throw error;
    }
  }

  async getUserProfile(): Promise<unknown> {
    try {
      return await this.clubService.getProfile();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
}

export const channelService = new ChannelService();
