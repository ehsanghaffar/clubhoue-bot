/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type {
  UsageEvent,
  UsageEventCreateInput,
  UsageSummary,
  UsageType
} from './usage.types.js'
import type { UsageRepository } from './usage.repository.js'

export interface UsageServiceDeps {
  repo: UsageRepository
}

/**
 * Records usage/telemetry events and aggregates per-bot summaries for the
 * analytics endpoint. Usage is intentionally a simple append-only counter —
 * billing is not implemented yet (see spec §21).
 */
export class UsageService {
  constructor (private readonly deps: UsageServiceDeps) {}

  async record (input: UsageEventCreateInput): Promise<UsageEvent> {
    return await this.deps.repo.record(input)
  }

  async countByBotAndType (botId: string, type: UsageType): Promise<number> {
    return await this.deps.repo.countByBotAndType(botId, type)
  }

  async summarize (botId: string): Promise<UsageSummary> {
    return await this.deps.repo.summarize(botId)
  }

  async listByBot (botId: string, limit = 50): Promise<UsageEvent[]> {
    return await this.deps.repo.listByBot(botId, limit)
  }
}
