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

export interface RoomMemberRecord {
  roomId: string
  userId: string
  displayName?: string
  firstSeenAt: Date
}

export interface RoomMemberRepository {
  /** Marks a user as seen in a room; reports whether they were previously unknown. */
  ensureSeen: (roomId: string, userId: string, displayName?: string) => Promise<RoomMemberSeenResult>
  /** Counts distinct users seen across the given room ids. */
  countDistinctUsers: (roomIds: string[]) => Promise<number>
  /** Lists the member records observed across the given room ids. */
  listByRoomIds: (roomIds: string[]) => Promise<RoomMemberRecord[]>
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

  async listByRoomIds (roomIds: string[]): Promise<RoomMemberRecord[]> {
    if (roomIds.length === 0) {
      return []
    }
    const docs = await RoomMemberModel.find({ roomId: { $in: roomIds } })
      .sort({ firstSeenAt: 1 })
      .lean()
    return docs.map((doc) => ({
      roomId: doc.roomId,
      userId: doc.userId,
      displayName: doc.displayName,
      firstSeenAt: doc.firstSeenAt
    }))
  }
}

export const roomMemberRepository: RoomMemberRepository = new MongoRoomMemberRepository()
