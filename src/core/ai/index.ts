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
import { OpenAiProvider } from './openai.provider.js'
import { AiService } from './ai.service.js'
import { InMemoryAiCooldownStore } from './in-memory-cooldown.js'
import { AgentService } from './agent.service.js'

export * from './ai.types.js'
export * from './prompt.service.js'
export * from './ai.service.js'
export * from './agent.service.js'
export * from './openai.provider.js'
export * from './in-memory-cooldown.js'

export const aiService = new AiService({
  provider: new OpenAiProvider(),
  cooldown: new InMemoryAiCooldownStore()
})

export const agentService = new AgentService({ ai: aiService })
