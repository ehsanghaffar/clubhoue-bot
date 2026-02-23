/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
export interface GetFeedV3Response {
  items: Item[];
}

export interface Item {
  channel?: Channel;
  conversation?: Conversation;
}

export interface Channel {
  creator_user_profile_id: number;
  channel_id: number;
  channel: string;
  language: string;
  visited: boolean;
  topic: string;
  privacy_settings: PrivacySettings;
  is_private: boolean;
  is_social_mode: boolean;
  is_social_club_lounge: boolean;
  url: string;
  feature_flags: string[];
  club: null;
  welcome_for_user_profile: null;
  num_speakers: number;
  num_all: number;
  has_blocked_speakers: boolean;
  is_explore_channel: boolean;
  is_replay_enabled: boolean;
  is_nsfw: boolean;
  users: ChannelUser[];
  social_club: ChannelSocialClub | null;
  logging_context: ChannelLoggingContext;
  channel_context: ChannelContext;
}

export interface ChannelContext {
  type: ChannelContextType;
  text: string;
}

export type ChannelContextType = 'users';

export interface ChannelLoggingContext {
  channel_id: number;
  entity: string;
  entity_id: number;
  batch_id: string;
  reasons: number[];
  feed_rank: number;
  is_explore: boolean;
  speaker_ids: number[];
  lisener_ids: unknown[];
  type: number;
  has_language_mismatch: boolean;
  current_channel_id: number;
  is_reshare: boolean;
  num_resharers: number;
  social_club_id?: number;
}

export interface PrivacySettings {
  type: PrivacySettingsType;
  display_text: string;
  tooltip_text: string;
}

export type PrivacySettingsType =
  | 'friend_of_friend'
  | 'house'
  | 'SOCIAL_CLUB_MEMBERS'
  | 'FRIENDS_OF_FRIENDS';

export interface ChannelSocialClub {
  social_club_id: number;
  name: string;
  photo_url: string;
  recurring_event_id: null;
  social_club_event_id: null;
}

export interface ChannelUser {
  user_id: number;
  name: string;
  photo_url: string;
  is_speaker: boolean;
  is_moderator: boolean;
  time_joined_as_speaker: Date;
}

export interface Conversation {
  conversation_id: string;
  title: string;
  summary: string;
  creator_user_profile: CreatorUserProfile;
  time_created: Date;
  time_content_updated: Date;
  social_club: ConversationSocialClub | null;
  segments_authors: CreatorUserProfile[];
  segments_authors_count: number;
  share_url: string;
  last_segment_id: string;
  has_new_segments: boolean;
  is_subscribed: boolean;
  permissions: Permissions;
  target_type: TargetType;
  pending_participants: unknown[];
  short_title: string;
  social_club_id: number | null;
  social_club_name: null | string;
  social_club_photo_url: null | string;
  privacy_settings: PrivacySettings;
  allow_members_to_speak: null;
  logging_context: ConversationLoggingContext;
  conversation_context?: ChannelContext;
}

export interface CreatorUserProfile {
  user_id: number;
  name: string;
  username: string;
  photo_url: string;
  bio: string;
  emoji: string;
}

export interface ConversationLoggingContext {
  type: number;
  entity: Entity;
  entity_uuid: string;
  batch_id: string;
  rank: number;
  social_club_id?: number;
  last_segment_id: string;
  has_new_segments: boolean;
}

export type Entity = 'conversation';

export interface Permissions {
  can_reply: boolean;
  can_change_title: boolean;
  cant_reply_reason: string;
  can_quote: boolean;
  can_delete: boolean;
  can_invite: boolean;
  can_share: null;
  can_allow_members_to_speak: null;
}

export interface ConversationSocialClub {
  social_club_id: number;
  name: string;
  is_membership_open: boolean;
  photo_url: string;
}

export type TargetType = 'social_club' | 'public';
