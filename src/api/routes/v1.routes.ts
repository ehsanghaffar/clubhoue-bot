/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import type { Bot } from '../../core/bots/bot.types.js'
import type { BotRoom } from '../../core/rooms/room.types.js'
import type { BotCredential } from '../../core/credentials/credential.types.js'
import type { BotService } from '../../core/bots/bot.service.js'
import type { BotManager } from '../../core/bots/bot-manager.js'
import type { CredentialService } from '../../core/credentials/credential.service.js'
import type { RoomService } from '../../core/rooms/room.service.js'
import type { UsageService } from '../../core/usage/usage.service.js'
import type { AnalyticsService } from '../../core/usage/analytics.service.js'
import type { TenantService } from '../../core/tenants/tenant.service.js'
import { authentication } from '../middleware/authentication.js'
import { tenantContext } from '../middleware/tenant-context.js'
import { requireBot, requireRoom, requireCredential } from '../middleware/authorization.js'
import { validateBody } from '../../middlewares/validate.js'
import { createBotsController } from '../controllers/bots.controller.js'
import { createCredentialsController } from '../controllers/credentials.controller.js'
import { createRoomsController } from '../controllers/rooms.controller.js'
import { createUsageController } from '../controllers/usage.controller.js'
import { createUsersController } from '../controllers/users.controller.js'
import { createBotSchema, updateBotSchema } from '../validation/bots.schema.js'
import { createCredentialSchema } from '../validation/credentials.schema.js'
import { createRoomSchema } from '../validation/rooms.schema.js'
import { sendMessageSchema } from '../validation/messages.schema.js'
import { searchUsersSchema } from '../validation/users.schema.js'

export interface V1RouterDeps {
  botService: BotService
  botManager: BotManager
  credentialService: CredentialService
  roomService: RoomService
  usageService: UsageService
  analyticsService: AnalyticsService
  tenantService?: TenantService
}

/**
 * Builds the public /v1 router with dependency injection so tests can pass
 * in-memory services. Every route is authenticated and tenant-scoped, and
 * every resource access goes through the authorization loaders.
 */
export const createV1Router = (deps: V1RouterDeps): Router => {
  const router: Router = Router()

  const bots = createBotsController({ botService: deps.botService, botManager: deps.botManager })
  const credentials = createCredentialsController({ credentialService: deps.credentialService })
  const rooms = createRoomsController({ roomService: deps.roomService, botService: deps.botService })
  const usage = createUsageController({ usageService: deps.usageService, analyticsService: deps.analyticsService })
  const users = createUsersController({ botService: deps.botService })

  const botLoader = async (id: string, tenantId: string): Promise<Bot | null> => {
    return await deps.botService.getByIdAndTenant(id, tenantId)
  }
  const roomLoader = async (id: string, tenantId: string, botId?: string): Promise<BotRoom | null> => {
    if (botId == null) {
      return null
    }
    return await deps.roomService.findByIdAndTenantAndBot(id, tenantId, botId)
  }
  const credentialLoader = async (id: string, tenantId: string): Promise<BotCredential | null> => {
    return await deps.credentialService.getByIdAndTenant(id, tenantId)
  }

  // Every /v1 route requires a valid API key and a resolved tenant context.
  router.use(authentication(deps.tenantService))
  router.use(tenantContext)

  // Bots
  router.post('/bots', validateBody(createBotSchema), bots.create)
  router.get('/bots', bots.list)
  router.get('/bots/:botId', requireBot(botLoader), bots.get)
  router.patch('/bots/:botId', requireBot(botLoader), validateBody(updateBotSchema), bots.update)
  router.delete('/bots/:botId', requireBot(botLoader), bots.remove)
  router.post('/bots/:botId/start', requireBot(botLoader), bots.start)
  router.post('/bots/:botId/stop', requireBot(botLoader), bots.stop)

  // Credentials — ciphertext is never returned by the API.
  router.post('/bots/:botId/credentials', requireBot(botLoader), validateBody(createCredentialSchema), credentials.create)
  router.get('/bots/:botId/credentials', requireBot(botLoader), credentials.list)
  router.delete('/bots/:botId/credentials/:credentialId', requireBot(botLoader), requireCredential(credentialLoader), credentials.remove)

  // Rooms
  router.post('/bots/:botId/rooms', requireBot(botLoader), validateBody(createRoomSchema), rooms.create)
  router.get('/bots/:botId/rooms', requireBot(botLoader), rooms.list)
  router.get('/bots/:botId/rooms/:roomId', requireBot(botLoader), requireRoom(roomLoader), rooms.get)
  router.post('/bots/:botId/rooms/:roomId/join', requireBot(botLoader), requireRoom(roomLoader), rooms.join)
  router.post('/bots/:botId/rooms/:roomId/leave', requireBot(botLoader), requireRoom(roomLoader), rooms.leave)

  // Messages + speaker invite (migrated legacy channel operations)
  router.post('/bots/:botId/rooms/:roomId/messages', requireBot(botLoader), requireRoom(roomLoader), validateBody(sendMessageSchema), rooms.sendMessage)
  router.get('/bots/:botId/rooms/:roomId/messages', requireBot(botLoader), requireRoom(roomLoader), rooms.listMessages)
  router.post('/bots/:botId/rooms/:roomId/accept-invite', requireBot(botLoader), requireRoom(roomLoader), rooms.acceptInvite)

  // Users (migrated legacy profile/user search + bot profile)
  router.post('/bots/:botId/users/search', requireBot(botLoader), validateBody(searchUsersSchema), users.search)
  router.get('/bots/:botId/users/:userId', requireBot(botLoader), users.get)
  router.get('/bots/:botId/me', requireBot(botLoader), bots.me)

  // Usage + events
  router.get('/bots/:botId/usage', requireBot(botLoader), usage.summary)
  router.get('/bots/:botId/events', requireBot(botLoader), usage.events)

  return router
}

export default createV1Router
