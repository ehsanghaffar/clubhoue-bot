/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Message, Room, User } from '../../core/types.js'
import type { ChannelResponse, ClubhouseMessage, UserResponse } from './types.js'

/**
 * Mappers from raw Clubhouse API responses into the normalized domain types
 * defined in `src/core/types.ts`. The rest of the application only ever sees
 * these normalized shapes.
 */

const stringId = (value: unknown): string => String(value ?? '')

export const mapRoom = (raw: ChannelResponse): Room => {
  const status =
    raw.is_active === true ? 'active' : raw.is_active === false ? 'inactive' : undefined
  return {
    id: stringId(raw.channel ?? raw.channel_id),
    platform: 'clubhouse',
    title: typeof raw.topic === 'string' ? raw.topic : undefined,
    description: undefined,
    status
  }
}

export const mapUser = (raw: UserResponse): User => {
  return {
    id: stringId(raw.user_id),
    platform: 'clubhouse',
    username: raw.username,
    displayName: raw.name
  }
}

export const mapMessage = (raw: ClubhouseMessage, roomId: string): Message => {
  const created = typeof raw.time_created === 'number' ? raw.time_created : undefined
  const mentionedUserIds = Array.isArray(raw.mentioned_user_ids)
    ? raw.mentioned_user_ids.map((id) => String(id))
    : undefined
  return {
    id: stringId(raw.message_id),
    roomId,
    userId: stringId(raw.user_profile?.user_id),
    username: raw.user_profile?.username,
    displayName: raw.user_profile?.name,
    content: raw.message ?? '',
    timestamp: created != null ? new Date(created * 1000) : new Date(),
    mentionedUserIds
  }
}

export const mapMessages = (raws: ClubhouseMessage[], roomId: string): Message[] => {
  return raws.map((raw) => mapMessage(raw, roomId))
}
