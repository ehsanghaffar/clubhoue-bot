/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Room layer: normalized BotRoom domain, repository, member tracking, and the
 * room service that runs the message sync pipeline.
 */
import { roomRepository } from './room.repository.js'
import { roomMemberRepository } from './room-member.repository.js'
import { messageDeduplicator } from '../../infrastructure/deduplication/message-dedup.js'
import { eventBus } from '../events/event-bus.js'
import { RoomService } from './room.service.js'

export * from './room.types.js'
export * from './room.repository.js'
export * from './room-member.repository.js'
export * from './room.service.js'

export const roomService = new RoomService({
  repo: roomRepository,
  members: roomMemberRepository,
  deduplicator: messageDeduplicator,
  bus: eventBus
})
