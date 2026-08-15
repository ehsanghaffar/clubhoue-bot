/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * AI layer: provider abstraction, trigger/cooldown decisions, prompt
 * construction, and the agent runner that plugs into automation rules.
 */
import { AiService } from './ai.service.js'
import { InMemoryAiCooldownStore } from './in-memory-cooldown.js'
import { AgentService } from './agent.service.js'
import { aiProviderResolver } from './provider-resolver.js'
import { usageService } from '../usage/index.js'

export * from './ai.types.js'
export * from './prompt.service.js'
export * from './ai.service.js'
export * from './agent.service.js'
export * from './openai.provider.js'
export * from './openai-compatible.provider.js'
export * from './provider-resolver.js'
export * from './mention-detector.js'
export * from './in-memory-cooldown.js'

export const aiService = new AiService({
  provider: aiProviderResolver.resolve(),
  cooldown: new InMemoryAiCooldownStore()
})

export const agentService = new AgentService({
  ai: aiService,
  usage: usageService
})
