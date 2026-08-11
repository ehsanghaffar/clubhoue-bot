/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { RoomMemberModel } from '../../models/roomMember.js'

export interface RoomMemberSeenResult {
  isNew: boolean
}

export interface RoomMemberRepository {
  /** Marks a user as seen in a room; reports whether they were previously unknown. */
  ensureSeen: (roomId: string, userId: string, displayName?: string) => Promise<RoomMemberSeenResult>
}

export class MongoRoomMemberRepository implements RoomMemberRepository {
  async ensureSeen (roomId: string, userId: string, displayName?: string): Promise<RoomMemberSeenResult> {
    const existing = await RoomMemberModel.findOne({ roomId, userId }).lean()
    if (existing != null) {
      return { isNew: false }
    }
    try {
      await RoomMemberModel.create({ roomId, userId, displayName })
      return { isNew: true }
    } catch (err: unknown) {
      // Unique-index race: another sync created it first.
      if ((err as { code?: number }).code === 11000) {
        return { isNew: false }
      }
      throw err
    }
  }
}

export const roomMemberRepository: RoomMemberRepository = new MongoRoomMemberRepository()
