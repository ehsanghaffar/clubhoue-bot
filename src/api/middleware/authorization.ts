/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { Bot } from '../../core/bots/bot.types.js'
import type { BotRoom } from '../../core/rooms/room.types.js'
import type { BotCredential } from '../../core/credentials/credential.types.js'
import { AppError, ErrorTypes } from '../../utils/errors.js'

/** Loaders are injected so tests can use in-memory services. */
export type BotLoader = (id: string, tenantId: string) => Promise<Bot | null>
export type RoomLoader = (id: string, tenantId: string, botId?: string) => Promise<BotRoom | null>
export type CredentialLoader = (id: string, tenantId: string) => Promise<BotCredential | null>

const notFound = (resource: string): AppError =>
  new AppError(ErrorTypes.NOT_FOUND, 404, `${resource} not found`)

/** Express 5 allows repeated route params (string[]); normalize to a string. */
const param = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

/**
 * Ensures the `:botId` route param belongs to the request's tenant and loads
 * it onto the request. Any other bot (or a missing one) returns 404 to avoid
 * leaking resource existence across tenants.
 */
export const requireBot = (loader: BotLoader): RequestHandler => {
  return async (req, _res, next): Promise<void> => {
    const botId = param(req.params.botId)
    const tenantId = req.tenant?.id
    if (botId == null || tenantId == null) {
      next(notFound('Bot'))
      return
    }
    try {
      const bot = await loader(botId, tenantId)
      if (bot == null) {
        next(notFound('Bot'))
        return
      }
      req.bot = bot
      next()
    } catch (err: unknown) {
      next(new AppError(ErrorTypes.INTERNAL, 500, 'Authorization check failed'))
    }
  }
}

/**
 * Ensures the `:roomId` route param belongs to the request's tenant (and, when
 * present, its bot) and loads it onto the request.
 */
export const requireRoom = (loader: RoomLoader): RequestHandler => {
  return async (req, _res, next): Promise<void> => {
    const roomId = param(req.params.roomId)
    const tenantId = req.tenant?.id
    const botId = param(req.params.botId)
    if (roomId == null || tenantId == null) {
      next(notFound('Room'))
      return
    }
    try {
      const room = await loader(roomId, tenantId, botId)
      if (room == null) {
        next(notFound('Room'))
        return
      }
      req.room = room
      next()
    } catch (err: unknown) {
      next(new AppError(ErrorTypes.INTERNAL, 500, 'Authorization check failed'))
    }
  }
}

/**
 * Ensures the `:credentialId` route param belongs to the request's tenant and
 * loads it onto the request.
 */
export const requireCredential = (loader: CredentialLoader): RequestHandler => {
  return async (req, _res, next): Promise<void> => {
    const credentialId = param(req.params.credentialId)
    const tenantId = req.tenant?.id
    if (credentialId == null || tenantId == null) {
      next(notFound('Credential'))
      return
    }
    try {
      const credential = await loader(credentialId, tenantId)
      if (credential == null) {
        next(notFound('Credential'))
        return
      }
      req.credential = credential
      next()
    } catch (err: unknown) {
      next(new AppError(ErrorTypes.INTERNAL, 500, 'Authorization check failed'))
    }
  }
}
