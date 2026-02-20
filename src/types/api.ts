export interface ClubhouseApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface AuthResponse {
  success: boolean;
  auth_token?: string;
  refresh_token?: string;
  access_token?: string;
  is_onboarding?: boolean;
  user_profile?: UserProfileResponse;
}

export interface UserProfileResponse {
  user_id: number;
  name: string;
  username: string;
  photo_url: string;
  bio: string;
  followers_count: number;
  followings_count: number;
}

export interface ChannelResponse {
  channel: string;
  channel_id: number;
  topic: string;
  num_speakers: number;
  num_all: number;
  is_private: boolean;
  is_social_mode: boolean;
  users: ChannelUserResponse[];
}

export interface ChannelUserResponse {
  user_id: number;
  name: string;
  username: string;
  photo_url: string;
  is_speaker: boolean;
  is_moderator: boolean;
}

export interface MessageResponse {
  message_id: string;
  user_id: number;
  body: string;
  timestamp: Date;
}

export interface EventResponse {
  event_id: number;
  name: string;
  description: string;
  time_start: Date;
  hosts: UserProfileResponse[];
}

export interface NotificationResponse {
  notification_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface SearchUsersResponse {
  users: UserProfileResponse[];
  count: number;
}

export interface ClubResponse {
  club_id: number;
  name: string;
  description: string;
  photo_url: string;
  members_count: number;
  followers_count: number;
}
