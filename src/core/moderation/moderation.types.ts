/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Result of evaluating a message against a room's moderation policy.
 *
 * `allowed: true` → the message continues to automation/AI.
 * `allowed: false` → the message is gated and never reaches automation or usage.
 */
export type ModerationBlockReason =
  | 'blocked_user'
  | 'blocked_keyword'
  | 'rate_limited'

export interface ModerationDecision {
  allowed: boolean
  reason?: ModerationBlockReason
}

/**
 * Per bot+room+user message rate limiting. Implementations must scope by the
 * composite key (`botId:roomId:userId`) so limits never bleed across bots,
 * rooms, or tenants, and must never rely on process-global state that one
 * request can mutate for another.
 */
export interface MessageRateLimiter {
  /**
   * Records a message for the given scoped key and returns whether it is still
   * within the limit. `max` messages are allowed per `windowSeconds` window.
   */
  isAllowed: (key: string, max: number, windowSeconds: number) => boolean
}
