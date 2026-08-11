/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Platform } from '../types.js'

export type BotStatus =
  | 'created'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'stopped'
  | 'error'

/** How the AI decides whether to respond to a message. */
export type AiTriggerMode = 'mention' | 'prefix' | 'keyword' | 'question' | 'manual'

/**
 * Per-bot AI behavior. Environment variables provide safe defaults; the
 * bot-level config overrides them.
 */
export interface AiConfig {
  enabled: boolean
  model: string
  temperature: number
  maxOutputTokens: number
  maxResponseLength: number
  triggerMode: AiTriggerMode
  /** Prefix used when triggerMode is 'prefix' (e.g. '#'). */
  triggerPrefix: string
  /** Seconds to wait before responding again in the same room. */
  cooldownSeconds: number
}

/** The core Bot entity. Bots are tenant-owned and platform-bound. */
export interface Bot {
  id: string
  tenantId: string
  name: string
  platform: Platform
  status: BotStatus
  aiConfig: AiConfig
  personality?: string
  /** Optional custom welcome message template. Supports {username}. */
  welcomeMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface BotCreateInput {
  tenantId: string
  name: string
  platform: Platform
  aiConfig?: Partial<AiConfig>
  personality?: string
  welcomeMessage?: string
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: true,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.4'),
  maxOutputTokens: parseInt(process.env.OPENAI_MAX_TOKENS ?? '150', 10),
  maxResponseLength: 280,
  triggerMode: 'question',
  triggerPrefix: '#',
  cooldownSeconds: 30
}

export const resolveAiConfig = (overrides: Partial<AiConfig> = {}): AiConfig => ({
  ...DEFAULT_AI_CONFIG,
  ...overrides
})
