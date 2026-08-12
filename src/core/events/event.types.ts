/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Platform } from '../types.js'

/**
 * Derives a stable, deterministic id for a normalized event so that the same
 * logical event (e.g. the same platform message) always maps to the same
 * stored event. This is the idempotency key for the durable event store: a
 * duplicate event collides on _id and is processed exactly once.
 *
 * For message-bearing events we use the platform message id; for membership /
 * room lifecycle events we combine type + room + the distinguishing entity.
 * We never rely on randomness or wall-clock timestamps alone.
 */
export const deriveEventId = (
  type: CommunityEventType,
  roomId: string,
  payload: Record<string, unknown>
): string => {
  const messageId = payload.messageId != null ? String(payload.messageId) : undefined
  const userId = payload.userId != null ? String(payload.userId) : undefined

  switch (type) {
    case 'message.created':
    case 'speaker.requested':
      return `evt:${type}:${roomId}:${messageId ?? 'unknown'}`
    case 'user.joined':
    case 'user.left':
    case 'speaker.invited':
      return `evt:${type}:${roomId}:${userId ?? 'unknown'}`
    case 'room.joined':
    case 'room.left':
    case 'room.ended':
      return `evt:${type}:${roomId}`
    default:
      return `evt:${type}:${roomId}:${messageId ?? userId ?? 'unknown'}`
  }
}

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
