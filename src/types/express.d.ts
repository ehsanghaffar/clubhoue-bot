import type { Tenant } from '../core/tenants/tenant.types.js'
import type { Bot } from '../core/bots/bot.types.js'
import type { BotRoom } from '../core/rooms/room.types.js'
import type { BotCredential } from '../core/credentials/credential.types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Tenant resolved from the request's API key by the auth middleware. */
      tenant?: Tenant
      /** Raw API key presented by the caller. */
      apiKey?: string
      /** Bot loaded by authorization middleware (owned by the tenant). */
      bot?: Bot
      /** Room loaded by authorization middleware (owned by the tenant). */
      room?: BotRoom
      /** Credential loaded by authorization middleware (owned by the tenant). */
      credential?: BotCredential
    }
  }
}

export {}
