/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/** Minimal AI provider abstraction so tests can inject a fake. */
export interface AiCompleteRequest {
  model: string
  systemPrompt: string
  userPrompt: string
  maxOutputTokens: number
  temperature: number
}

export interface AiProvider {
  complete: (request: AiCompleteRequest) => Promise<string>
}

export type AiSkipReason =
  | 'disabled'
  | 'no_trigger'
  | 'cooldown'
  | 'self_message'
  | 'ok'

export interface AiDecision {
  respond: boolean
  reason: AiSkipReason
}

export interface AiResponse {
  content: string
  truncated: boolean
}

/** Stable cooldown window per bot+room. */
export interface AiCooldownStore {
  isOnCooldown: (botId: string, roomId: string, windowSeconds: number) => boolean
  markResponded: (botId: string, roomId: string) => void
}
