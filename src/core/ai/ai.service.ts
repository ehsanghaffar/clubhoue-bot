/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Bot } from '../bots/bot.types.js'
import type {
  AiCooldownStore,
  AiDecision,
  AiProvider,
  AiResponse
} from './ai.types.js'
import type { MentionIdentity, MentionInput } from './mention-detector.js'
import { resolveAiConfig } from '../bots/bot.types.js'
import { buildAiPrompt } from './prompt.service.js'
import { mentionDetector } from './mention-detector.js'

export interface AiServiceDeps {
  provider: AiProvider
  cooldown: AiCooldownStore
}

const QUESTION_WORDS_EN = ['what', 'why', 'how', 'which', 'who', 'where', 'when', 'can', 'is ', 'are ', 'do ', 'does ']
const QUESTION_WORDS_FA = ['چرا', 'چه', 'کجا', 'کی', 'چطور', 'چگونه', 'چیست', 'هست', 'آیا', 'میشه', 'میتونی']

const QUESTION_MARK = '?'
const QUESTION_MARK_FA = '؟'

const looksLikeQuestion = (content: string): boolean => {
  const lower = content.toLowerCase()
  if (content.includes(QUESTION_MARK) || content.includes(QUESTION_MARK_FA)) {
    return true
  }
  return QUESTION_WORDS_EN.some((w) => lower.includes(w)) ||
    QUESTION_WORDS_FA.some((w) => lower.includes(w))
}

export interface AiDecisionContext {
  tenantId: string
  roomId: string
  userId: string
  mentionIdentity: MentionIdentity
  mentionInput: MentionInput
}

/**
 * Decides whether to respond and generates responses via an injected AI
 * provider. Trigger mode and cooldown are resolved from the bot's per-bot
 * `AiConfig`, so behavior is configurable without code changes.
 */
export class AiService {
  constructor (private readonly deps: AiServiceDeps) {}

  /**
   * Trigger-mode decision (ignores cooldown). Uses platform mention identity,
   * never the internal bot label.
   */
  decide (bot: Bot, ctx: AiDecisionContext): AiDecision {
    const ai = resolveAiConfig(bot.aiConfig)
    if (!ai.enabled) {
      return { respond: false, reason: 'disabled' }
    }

    const text = ctx.mentionInput.content.trim()
    switch (ai.triggerMode) {
      case 'manual':
        return { respond: false, reason: 'no_trigger' }
      case 'prefix':
        return text.startsWith(ai.triggerPrefix)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      case 'mention':
        return mentionDetector.isMentioned(ctx.mentionInput, ctx.mentionIdentity)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      case 'keyword':
        return looksLikeQuestion(text)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      case 'question':
        return looksLikeQuestion(text)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      default:
        return { respond: false, reason: 'no_trigger' }
    }
  }

  /**
   * Full decision: trigger mode + per-user cooldown. Uses atomic reservation
   * so concurrent messages from the same user cannot bypass the window.
   */
  canRespond (bot: Bot, ctx: AiDecisionContext): AiDecision {
    const decision = this.decide(bot, ctx)
    if (!decision.respond) {
      return decision
    }
    const ai = resolveAiConfig(bot.aiConfig)
    const reserved = this.deps.cooldown.tryReserve(
      ctx.tenantId,
      bot.id,
      ctx.roomId,
      ctx.userId,
      ai.cooldownSeconds
    )
    if (!reserved) {
      return { respond: false, reason: 'cooldown' }
    }
    return decision
  }

  markResponded (tenantId: string, botId: string, roomId: string, userId: string): void {
    this.deps.cooldown.markResponded(tenantId, botId, roomId, userId)
  }

  releaseCooldown (tenantId: string, botId: string, roomId: string, userId: string): void {
    this.deps.cooldown.release(tenantId, botId, roomId, userId)
  }

  /**
   * Generates and length-truncates a response for a question. Never throws
   * provider errors upward — callers (automation) treat a null as "skip".
   */
  async generateResponse (
    bot: Bot,
    username: string,
    question: string
  ): Promise<AiResponse> {
    const ai = resolveAiConfig(bot.aiConfig)
    const prompt = buildAiPrompt({ bot, username, question })
    const raw = await this.deps.provider.complete({
      model: ai.model,
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      maxOutputTokens: ai.maxOutputTokens,
      temperature: ai.temperature
    })
    const content = raw.trim()
    const truncated = content.length > ai.maxResponseLength
    return {
      content: truncated ? content.slice(0, ai.maxResponseLength) : content,
      truncated
    }
  }
}
