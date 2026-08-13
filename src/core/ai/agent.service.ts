/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AiRunner } from '../automation/rules/ai.rule.js'
import type { AiService } from './ai.service.js'
import type { MessageCreatedPayload } from '../events/event.types.js'
import type { UsageRecorder } from '../usage/usage.types.js'

export interface AgentServiceDeps {
  ai: AiService
  /** Optional usage recorder for ai_request / ai_response telemetry. */
  usage?: UsageRecorder
}

/**
 * Bridges the AI service into the automation engine's `AiRunner` contract.
 * Handles self-message suppression (via `context.botUserId`), trigger/cooldown
 * decisions, response generation, and cooldown bookkeeping.
 */
export class AgentService {
  constructor (private readonly deps: AgentServiceDeps) {}

  createRunner (): AiRunner {
    return async (event, context) => {
      const payload = event.payload as MessageCreatedPayload

      if (context.botUserId != null && payload.userId === context.botUserId) {
        return null
      }

      const decision = this.deps.ai.canRespond(context.bot, {
        tenantId: event.tenantId,
        roomId: context.room.id,
        userId: payload.userId,
        mentionIdentity: {
          externalAccountId: context.botUserId ?? '',
          externalAccountName: context.externalAccountName
        },
        mentionInput: {
          content: payload.content,
          mentionedUserIds: payload.mentionedUserIds
        }
      })
      if (!decision.respond) {
        if (decision.reason === 'cooldown') {
          return null
        }
        if (decision.reason !== 'ok') {
          this.deps.ai.releaseCooldown(event.tenantId, context.bot.id, context.room.id, payload.userId)
        }
        return null
      }

      const usageInput = {
        tenantId: event.tenantId,
        botId: context.bot.id,
        roomId: context.room.id
      }
      await this.deps.usage?.record({ ...usageInput, type: 'ai_request' as const })

      const response = await this.deps.ai.generateResponse(
        context.bot,
        payload.username ?? payload.displayName ?? payload.userId,
        payload.content
      )
      if (response.content === '') {
        this.deps.ai.releaseCooldown(event.tenantId, context.bot.id, context.room.id, payload.userId)
        return null
      }

      this.deps.ai.markResponded(event.tenantId, context.bot.id, context.room.id, payload.userId)
      await this.deps.usage?.record({ ...usageInput, type: 'ai_response' as const })
      return response.content
    }
  }
}
