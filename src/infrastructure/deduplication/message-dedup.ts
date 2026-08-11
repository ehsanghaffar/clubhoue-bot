/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { ProcessedMessageModel } from '../../models/processedMessage.js'

export const dedupKey = (botId: string, roomId: string, messageId: string): string =>
  `processed:${botId}:${roomId}:${messageId}`

/**
 * Persistent/distributed message deduplication. Implemented on top of MongoDB
 * for the MVP; the interface mirrors a Redis-backed implementation so storage
 * can be swapped without touching the message pipeline.
 */
export interface MessageDeduplicator {
  isProcessed: (botId: string, roomId: string, messageId: string) => Promise<boolean>
  markProcessed: (botId: string, roomId: string, messageId: string, ttlSeconds?: number) => Promise<void>
}

const DEFAULT_TTL_SECONDS = 24 * 60 * 60

export class MongoMessageDeduplicator implements MessageDeduplicator {
  async isProcessed (botId: string, roomId: string, messageId: string): Promise<boolean> {
    const key = dedupKey(botId, roomId, messageId)
    const existing = await ProcessedMessageModel.findOne({ key }).lean()
    return existing != null
  }

  async markProcessed (botId: string, roomId: string, messageId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    const key = dedupKey(botId, roomId, messageId)
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
    try {
      await ProcessedMessageModel.create({ key, expiresAt })
    } catch (err: unknown) {
      // Unique-index race: already marked by a concurrent worker.
      if ((err as { code?: number }).code !== 11000) {
        throw err
      }
    }
  }
}

/** In-memory implementation for tests and single-process development. */
export class InMemoryMessageDeduplicator implements MessageDeduplicator {
  private readonly seen = new Map<string, number>()

  async isProcessed (botId: string, roomId: string, messageId: string): Promise<boolean> {
    const key = dedupKey(botId, roomId, messageId)
    const expiresAt = this.seen.get(key)
    if (expiresAt == null) return false
    if (expiresAt < Date.now()) {
      this.seen.delete(key)
      return false
    }
    return true
  }

  async markProcessed (botId: string, roomId: string, messageId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    const key = dedupKey(botId, roomId, messageId)
    this.seen.set(key, Date.now() + ttlSeconds * 1000)
  }

  /** Test helper. */
  clear (): void {
    this.seen.clear()
  }
}

export const messageDeduplicator: MessageDeduplicator = new MongoMessageDeduplicator()
