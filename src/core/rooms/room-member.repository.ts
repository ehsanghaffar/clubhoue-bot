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
  /** Counts distinct users seen across the given room ids. */
  countDistinctUsers: (roomIds: string[]) => Promise<number>
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

  async countDistinctUsers (roomIds: string[]): Promise<number> {
    if (roomIds.length === 0) {
      return 0
    }
    const userIds = await RoomMemberModel.distinct('userId', { roomId: { $in: roomIds } })
    return userIds.length
  }
}

export const roomMemberRepository: RoomMemberRepository = new MongoRoomMemberRepository()
