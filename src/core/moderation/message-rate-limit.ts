/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { MessageRateLimiter } from './moderation.types.js'

interface RateBucket {
  /** Timestamps (ms) of hits inside the current window. */
  hits: number[]
}

/**
 * In-memory fixed-window message rate limiter. Keys are the composite
 * `botId:roomId:userId` scoped keys built by the moderation stage, so limits
 * are enforced per bot/room/user and never become process-global cross-tenant
 * limits. Mirrors the pattern used by the AI cooldown store (in-memory for the
 * single-process MVP; a shared store can replace it later without touching
 * callers).
 */
export class InMemoryMessageRateLimiter implements MessageRateLimiter {
  private readonly buckets = new Map<string, RateBucket>()
  private readonly maxBuckets = 10_000

  isAllowed (key: string, max: number, windowSeconds: number): boolean {
    if (max <= 0) {
      return false
    }
    const now = Date.now()
    const windowMs = windowSeconds * 1000

    let bucket = this.buckets.get(key)
    if (bucket == null) {
      bucket = { hits: [] }
      this.buckets.set(key, bucket)
      this.prune(now)
    }

    // Drop hits outside the window (lazy expiry).
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

    if (bucket.hits.length >= max) {
      return false
    }

    bucket.hits.push(now)
    return true
  }

  /** Evicts idle buckets so a long-running process does not grow unbounded. */
  private prune (now: number): void {
    if (this.buckets.size <= this.maxBuckets) {
      return
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > 5 * 60 * 1000) {
        this.buckets.delete(key)
      }
    }
  }
}
