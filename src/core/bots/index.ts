/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Bot layer: normalized Bot domain, repository, service (credential-bound
 * adapter creation), and the bot manager that runs per-room sync loops.
 */
import { botRepository } from './bot.repository.js'
import { credentialService } from '../credentials/credential.service.js'
import { roomRepository } from '../rooms/room.repository.js'
import { roomService } from '../rooms/index.js'
import { BotService } from './bot.service.js'
import { BotManager } from './bot-manager.js'

export * from './bot.types.js'
export * from './bot.repository.js'
export * from './bot.service.js'
export * from './bot-manager.js'

export const botService = new BotService({
  repo: botRepository,
  credentials: credentialService
})

export const botManager = new BotManager({
  bots: botRepository,
  rooms: roomRepository,
  roomService,
  botService
})
