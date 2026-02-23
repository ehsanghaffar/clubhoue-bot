import type { Profile } from '../types/config';

export interface AgentOptions {
  body?: Record<string, unknown>;
  query?: Record<string, unknown> | string;
  headers?: Record<string, string>;
}

export interface AgentCustoms extends Partial<Profile> {
  apiRoot?: string;
  userAgent?: string;
  languages?: string;
  locale?: string;
  appVersion?: string;
  appBuild?: string;
  deviceId?: string;
  userId?: string;
  token?: string;
  accept?: string;
  acceptEncodings?: string;
  acceptLanguages?: string;
  fetchOptions?: Record<string, unknown>;
  _preventBodySerialization?: boolean;
}

export type AgentFunction = (
  url: string,
  options?: AgentOptions,
  customs?: AgentCustoms
) => Promise<Response>;

export interface ClubApiServiceConfig {
  profile: Profile | null;
  agent: AgentFunction | null;
  debug?: (...args: unknown[]) => void;
}

export interface JoinChannelOptions {
  channel: string;
  source?: string;
  isExplore?: boolean;
  rank?: number;
}

export interface LeaveChannelOptions {
  channel: string;
}

export interface GetChannelMessagesOptions {
  channel: string;
  order?: number;
}

export interface SendChannelMessageOptions {
  channel: string;
  message: string;
}

export interface GetUserOptions {
  user_id?: number | string;
  id?: number | string;
}

export interface SearchUsersOptions {
  query?: string;
  onlyCoFollows?: boolean;
  onlyFollowers?: boolean;
  onlyFollowing?: boolean;
}

export interface AcceptSpeakerInviteOptions {
  channel: string;
}

export interface InviteToSpeakersOptions {
  channel: string;
  user_id: number | string;
}

export interface ActivePingOptions {
  channel: string;
}

// Response Type Interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChannelListResponse {
  items?: Array<unknown>;
}

export interface ChannelResponse {
  channel_id?: number;
  channel?: string;
  num_speakers?: number;
  num_all?: number;
  [key: string]: unknown;
}

export interface JoinChannelResponse {
  success?: boolean;
  user_profile?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LeaveChannelResponse {
  success?: boolean;
  [key: string]: unknown;
}

export interface SendMessageResponse {
  message_id?: string;
  created_at?: string;
  success?: boolean;
  [key: string]: unknown;
}

export interface UserResponse {
  user_id?: number;
  name?: string;
  username?: string;
  photo_url?: string;
  bio?: string;
  [key: string]: unknown;
}

export interface EventResponse {
  event_id?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}
