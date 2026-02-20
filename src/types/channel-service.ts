import type { ClubApiService } from '../services/club-api.service';

export interface ChannelServiceOptions {
  clubService: ClubApiService;
}

export interface MessageInvite {
  user_profile?: {
    user_id: number | string;
  };
}

export interface FetchChannelMessagesFunction {
  (channelId: string, order?: number): Promise<MessageInvite[] | null>;
}
