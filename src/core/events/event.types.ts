/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Platform } from '../types.js'

export type CommunityEventType =
  | 'room.joined'
  | 'room.left'
  | 'room.ended'
  | 'user.joined'
  | 'user.left'
  | 'message.created'
  | 'speaker.requested'
  | 'speaker.invited'

/**
 * Normalized community event, scoped by tenant/bot/room so multiple bots and
 * rooms can be processed concurrently without global state.
 */
export interface CommunityEvent<T = unknown> {
  id: string
  tenantId: string
  botId: string
  roomId: string
  platform: Platform
  type: CommunityEventType
  timestamp: Date
  payload: T
}

export interface MessageCreatedPayload {
  messageId: string
  userId: string
  username?: string
  content: string
  timestamp: Date
}

export interface UserJoinedPayload {
  userId: string
  username?: string
  displayName?: string
}

export interface UserLeftPayload {
  userId: string
}

export interface RoomJoinedPayload {
  roomId: string
}

export interface RoomLeftPayload {
  roomId: string
}

export interface RoomEndedPayload {
  roomId: string
}

export interface SpeakerRequestedPayload {
  messageId: string
  userId: string
  content: string
}

export interface SpeakerInvitedPayload {
  userId: string
}
