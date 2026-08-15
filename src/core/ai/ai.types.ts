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

/** Per-user cooldown window scoped by tenant+bot+room+user. */
export interface AiCooldownStore {
  isOnCooldown: (
    tenantId: string,
    botId: string,
    roomId: string,
    userId: string,
    windowSeconds: number
  ) => boolean
  tryReserve: (
    tenantId: string,
    botId: string,
    roomId: string,
    userId: string,
    windowSeconds: number
  ) => boolean
  markResponded: (tenantId: string, botId: string, roomId: string, userId: string) => void
  release: (tenantId: string, botId: string, roomId: string, userId: string) => void
}

export type AiProviderFailureKind =
  | 'timeout'
  | 'rate_limited'
  | 'transient'
  | 'authentication'
  | 'invalid_request'
  | 'permanent'

export class AiProviderError extends Error {
  readonly kind: AiProviderFailureKind

  constructor (kind: AiProviderFailureKind, message = kind) {
    super(message)
    this.name = 'AiProviderError'
    this.kind = kind
  }
}
