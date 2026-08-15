/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Platform } from '../types.js'

export type BotRoomStatus =
  | 'configured'
  | 'joining'
  | 'active'
  | 'leaving'
  | 'inactive'
  | 'error'

export interface RoomMessageRateLimit {
  /** Max messages per window before automation is gated for that user. */
  max: number
  /** Length of the window in seconds. */
  windowSeconds: number
}

export interface BotRoomSettings {
  welcomeEnabled: boolean
  aiEnabled: boolean
  autoInviteEnabled: boolean
  moderationEnabled: boolean
  /** External platform user ids whose messages are ignored (needs moderationEnabled). */
  blockedUsers?: string[]
  /** Keywords that gate a message before automation/AI (case-insensitive). */
  blockedKeywords?: string[]
  /** Per bot+room+user message rate limit applied by the moderation stage. */
  messageRateLimit?: RoomMessageRateLimit
}

/**
 * A room a bot is configured to operate in. Replaces the legacy single
 * global "activeChannel" concept — one bot can manage many rooms.
 */
export interface BotRoom {
  id: string
  tenantId: string
  botId: string
  platform: Platform
  externalRoomId: string
  status: BotRoomStatus
  settings: BotRoomSettings
  joinedAt?: Date
  lastSeenAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface BotRoomCreateInput {
  tenantId: string
  botId: string
  platform: Platform
  externalRoomId: string
  settings?: Partial<BotRoomSettings>
}

export const DEFAULT_ROOM_SETTINGS: BotRoomSettings = {
  welcomeEnabled: true,
  aiEnabled: true,
  autoInviteEnabled: false,
  moderationEnabled: false,
  blockedUsers: [],
  blockedKeywords: [],
  messageRateLimit: { max: 10, windowSeconds: 60 }
}

export const resolveRoomSettings = (
  overrides: Partial<BotRoomSettings> = {}
): BotRoomSettings => ({ ...DEFAULT_ROOM_SETTINGS, ...overrides })
