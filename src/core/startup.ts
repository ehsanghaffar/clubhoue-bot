/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { eventProcessor } from './events/event-processor.js'
import { automationEngine } from './automation/default-engine.js'
import { AutomationStage } from './automation/automation-stage.js'
import { botManager } from './bots/index.js'
import { usageService, usageStage } from './usage/index.js'

/**
 * Wires the event pipeline (automation + usage stages) and starts the
 * processor. Called once during server bootstrap, after the DB connection is
 * ready.
 */
export const configureEventPipeline = (): void => {
  eventProcessor.addStage(new AutomationStage({
    engine: automationEngine,
    resolveContext: async (event) => await botManager.resolveContext(event),
    usage: usageService
  }))
  eventProcessor.addStage(usageStage)
  eventProcessor.start()
}
