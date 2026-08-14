/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { RequestHandler } from 'express'
import type { BotCredential } from '../../core/credentials/credential.types.js'
import type { CredentialService } from '../../core/credentials/credential.service.js'
import { createNotFoundError } from '../../utils/errors.js'

export interface CredentialsControllerDeps {
  credentialService: CredentialService
}

/** Shape produced by the Joi validation middleware (see validation/credentials.schema.ts). */
interface CredentialBody {
  token?: string
  deviceId?: string
  externalAccountId?: string
  externalAccountName?: string
}

export interface CredentialsController {
  create: RequestHandler
  list: RequestHandler
  remove: RequestHandler
}

/**
 * The public credential view. The encrypted token envelope is ciphertext at
 * rest and must never be exposed; neither is anything ever decrypted here.
 */
const toPublicCredential = (credential: BotCredential): Omit<BotCredential, 'encryptedToken'> => {
  return {
    id: credential.id,
    tenantId: credential.tenantId,
    botId: credential.botId,
    platform: credential.platform,
    status: credential.status,
    externalAccountId: credential.externalAccountId,
    externalAccountName: credential.externalAccountName,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt
  }
}

export const createCredentialsController = (deps: CredentialsControllerDeps): CredentialsController => {
  const create: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const body = req.body as CredentialBody
      const credential = await deps.credentialService.createCredential({
        tenantId: bot.tenantId,
        botId: bot.id,
        platform: bot.platform,
        token: body.token!,
        deviceId: body.deviceId,
        externalAccountId: body.externalAccountId,
        externalAccountName: body.externalAccountName
      })
      res.status(201).json({ data: toPublicCredential(credential) })
    } catch (err) {
      next(err)
    }
  }

  const list: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const bot = req.bot
      if (bot == null) {
        next(createNotFoundError('Bot not found'))
        return
      }
      const credentials = await deps.credentialService.listByBotAndTenant(bot.tenantId, bot.id)
      res.json({ data: credentials.map(toPublicCredential) })
    } catch (err) {
      next(err)
    }
  }

  const remove: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const credential = req.credential
      if (credential == null) {
        next(createNotFoundError('Credential not found'))
        return
      }
      await deps.credentialService.deleteCredential(credential.tenantId, credential.id)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }

  return { create, list, remove }
}
