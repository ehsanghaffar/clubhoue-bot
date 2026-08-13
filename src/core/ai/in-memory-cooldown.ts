/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AiCooldownStore } from './ai.types.js'

interface CooldownEntry {
  respondedAt: number
  reservedUntil?: number
}

/**
 * Process-local cooldown store scoped by tenant+bot+room+user. Enough for the
 * single-process MVP; a Mongo or Redis-backed store can replace this later.
 */
export class InMemoryAiCooldownStore implements AiCooldownStore {
  private readonly respondedAt = new Map<string, CooldownEntry>()

  private readonly key = (
    tenantId: string,
    botId: string,
    roomId: string,
    userId: string
  ): string => `${tenantId}:${botId}:${roomId}:${userId}`

  isOnCooldown (
    tenantId: string,
    botId: string,
    roomId: string,
    userId: string,
    windowSeconds: number
  ): boolean {
    if (windowSeconds <= 0) {
      return false
    }
    const entry = this.respondedAt.get(this.key(tenantId, botId, roomId, userId))
    if (entry == null) {
      return false
    }
    const anchor = entry.respondedAt
    return Date.now() - anchor < windowSeconds * 1000
  }

  /**
   * Atomically reserves a cooldown slot. Returns false when the user is still
   * within the cooldown window or another concurrent caller already reserved.
   */
  tryReserve (
    tenantId: string,
    botId: string,
    roomId: string,
    userId: string,
    windowSeconds: number
  ): boolean {
    if (windowSeconds <= 0) {
      return true
    }
    const scoped = this.key(tenantId, botId, roomId, userId)
    const now = Date.now()
    const existing = this.respondedAt.get(scoped)
    if (existing != null && now - existing.respondedAt < windowSeconds * 1000) {
      return false
    }
    if (existing?.reservedUntil != null && existing.reservedUntil > now) {
      return false
    }
    this.respondedAt.set(scoped, {
      respondedAt: existing?.respondedAt ?? 0,
      reservedUntil: now + windowSeconds * 1000
    })
    return true
  }

  markResponded (tenantId: string, botId: string, roomId: string, userId: string): void {
    this.respondedAt.set(this.key(tenantId, botId, roomId, userId), {
      respondedAt: Date.now()
    })
  }

  release (tenantId: string, botId: string, roomId: string, userId: string): void {
    const scoped = this.key(tenantId, botId, roomId, userId)
    const entry = this.respondedAt.get(scoped)
    if (entry == null) {
      return
    }
    if (entry.respondedAt === 0) {
      this.respondedAt.delete(scoped)
      return
    }
    this.respondedAt.set(scoped, { respondedAt: entry.respondedAt })
  }

  /** Test helper: forget all cooldown state. */
  clear (): void {
    this.respondedAt.clear()
  }
}
