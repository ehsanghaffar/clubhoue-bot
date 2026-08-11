/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AiCooldownStore } from './ai.types.js'

/**
 * Process-local cooldown store. Enough for the single-process MVP; a Mongo or
 * Redis-backed store can replace this later without touching callers.
 */
export class InMemoryAiCooldownStore implements AiCooldownStore {
  private readonly respondedAt = new Map<string, number>()

  private readonly key = (botId: string, roomId: string): string => `${botId}:${roomId}`

  isOnCooldown (botId: string, roomId: string, windowSeconds: number): boolean {
    if (windowSeconds <= 0) {
      return false
    }
    const last = this.respondedAt.get(this.key(botId, roomId))
    if (last == null) {
      return false
    }
    return Date.now() - last < windowSeconds * 1000
  }

  markResponded (botId: string, roomId: string): void {
    this.respondedAt.set(this.key(botId, roomId), Date.now())
  }

  /** Test helper: forget all cooldown state. */
  clear (): void {
    this.respondedAt.clear()
  }
}
