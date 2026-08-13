/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type {
  AiCooldownStore,
  AiDecision,
  AiProvider,
  AiResponse
} from './ai.types.js'
import type { Bot } from '../bots/bot.types.js'
import { resolveAiConfig } from '../bots/bot.types.js'
import { buildAiPrompt } from './prompt.service.js'

export interface AiServiceDeps {
  provider: AiProvider
  cooldown: AiCooldownStore
}

const QUESTION_WORDS_EN = ['what', 'why', 'how', 'which', 'who', 'where', 'when', 'can', 'is ', 'are ', 'do ', 'does ']
const QUESTION_WORDS_FA = ['چرا', 'چه', 'کجا', 'کی', 'چطور', 'چگونه', 'چیست', 'هست', 'آیا', 'میشه', 'میتونی']

const QUESTION_MARK = '?'
const QUESTION_MARK_FA = '؟'

const normalizeMentionText = (value: string): string => value
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

const mentionsBot = (text: string, botName: string): boolean => {
  const normalizedText = normalizeMentionText(text)
  const normalizedBotName = normalizeMentionText(botName)
  if (normalizedBotName.length === 0) {
    return false
  }
  const variants = new Set<string>([
    `@${normalizedBotName}`,
    normalizedBotName,
    ...normalizedBotName.split(' ').filter(Boolean).map((part) => `@${part}`)
  ])

  for (const variant of variants) {
    if (normalizedText.includes(variant)) {
      return true
    }
  }
  return normalizedText.includes(`@${normalizedBotName.replace(/\s+/g, '')}`)
}

const looksLikeQuestion = (content: string): boolean => {
  const lower = content.toLowerCase()
  if (content.includes(QUESTION_MARK) || content.includes(QUESTION_MARK_FA)) {
    return true
  }
  return QUESTION_WORDS_EN.some((w) => lower.includes(w)) ||
    QUESTION_WORDS_FA.some((w) => lower.includes(w))
}

/**
 * Decides whether to respond and generates responses via an injected AI
 * provider. Trigger mode and cooldown are resolved from the bot's per-bot
 * `AiConfig`, so behavior is configurable without code changes.
 */
export class AiService {
  constructor (private readonly deps: AiServiceDeps) {}

  /**
   * Trigger-mode decision (ignores cooldown). The message content is the raw
   * text from the platform event payload.
   */
  decide (bot: Bot, content: string): AiDecision {
    const ai = resolveAiConfig(bot.aiConfig)
    if (!ai.enabled) {
      return { respond: false, reason: 'disabled' }
    }

    const text = content.trim()
    switch (ai.triggerMode) {
      case 'manual':
        return { respond: false, reason: 'no_trigger' }
      case 'prefix':
        return text.startsWith(ai.triggerPrefix)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      case 'mention': {
        return mentionsBot(text, bot.name)
          ? { respond: true, reason: 'ok' }
          : { respond: false, reason: 'no_trigger' }
      }
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
   * Full decision: trigger mode + cooldown. Returns 'cooldown' when the
   * bot+room is within its window.
   */
  canRespond (bot: Bot, roomId: string, content: string): AiDecision {
    const decision = this.decide(bot, content)
    if (!decision.respond) {
      return decision
    }
    const ai = resolveAiConfig(bot.aiConfig)
    if (this.deps.cooldown.isOnCooldown(bot.id, roomId, ai.cooldownSeconds)) {
      return { respond: false, reason: 'cooldown' }
    }
    return decision
  }

  markResponded (bot: Bot, roomId: string): void {
    this.deps.cooldown.markResponded(bot.id, roomId)
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
