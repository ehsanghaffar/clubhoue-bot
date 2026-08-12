/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Bot, BotCreateInput } from './bot.types.js'
import type { BotRepository, BotUpdateInput } from './bot.repository.js'
import type { CredentialService } from '../credentials/credential.service.js'
import { createPlatformAdapter } from '../../platforms/adapter.js'
import type { CommunityPlatformAdapter } from '../../platforms/adapter.js'

export interface BotServiceDeps {
  repo: BotRepository
  credentials: CredentialService
}

/**
 * Bot lifecycle and configuration. Runtime credential decryption only ever
 * happens here, right before an adapter is constructed, so plaintext tokens
 * never travel through the API or automation layers.
 */
export class BotService {
  constructor (private readonly deps: BotServiceDeps) {}

  async createBot (input: BotCreateInput): Promise<Bot> {
    return await this.deps.repo.create(input)
  }

  async listByTenant (tenantId: string): Promise<Bot[]> {
    return await this.deps.repo.findByTenant(tenantId)
  }

  async getByIdAndTenant (id: string, tenantId: string): Promise<Bot | null> {
    return await this.deps.repo.findByIdAndTenant(id, tenantId)
  }

  async updateBot (tenantId: string, id: string, patch: BotUpdateInput): Promise<Bot | null> {
    return await this.deps.repo.update(tenantId, id, patch)
  }

  async deleteBot (tenantId: string, id: string): Promise<void> {
    await this.deps.repo.delete(tenantId, id)
  }

  /**
   * Builds the platform adapter for a bot using its active credential. Throws
   * when the bot has no active credential.
   */
  async createAdapter (bot: Bot): Promise<CommunityPlatformAdapter> {
    const credential = await this.deps.credentials.getActiveByBot(bot.id)
    if (credential == null) {
      throw new Error(`No active credential for bot ${bot.id}`)
    }
    const decrypted = await this.deps.credentials.decryptForRuntime(credential)
    return createPlatformAdapter(bot.platform, decrypted)
  }

  /**
   * The bot's external user id on the platform (from its active credential),
   * used to suppress the bot's own messages in automation.
   */
  async getBotExternalUserId (botId: string): Promise<string | undefined> {
    const credential = await this.deps.credentials.getActiveByBot(botId)
    return credential?.externalAccountId
  }
}
