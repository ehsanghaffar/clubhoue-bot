/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { AutomationEngine } from './rule-engine.js'
import { createWelcomeRule } from './rules/welcome.rule.js'
import { createSpeakerRule } from './rules/speaker.rule.js'
import { createAiRule } from './rules/ai.rule.js'
import { agentService } from '../ai/index.js'

/**
 * Default automation engine for the MVP: welcome + speaker request rules, and
 * the AI Q&A rule backed by the AI service's runner.
 */
export const automationEngine = new AutomationEngine()
automationEngine.addRule(createWelcomeRule())
automationEngine.addRule(createSpeakerRule())
automationEngine.addRule(createAiRule({ runner: agentService.createRunner() }))
