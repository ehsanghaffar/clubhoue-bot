/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { BotCredential, BotCredentialCreateInput, DecryptedCredential } from './credential.types.js'
import type { CredentialRepository } from './credential.repository.js'
import { credentialRepository } from './credential.repository.js'
import { decryptSecret, encryptSecret } from './credential-encryption.js'
import { createNotFoundError } from '../../utils/errors.js'

/**
 * The sensitive material encrypted at rest. The auth token and device
 * identifier are kept inside the envelope; account identifiers are stored
 * plainly on the document so they can be listed without decryption.
 */
interface EncryptedPayload {
  token: string
  deviceId?: string
}

export class CredentialService {
  constructor (private readonly repo: CredentialRepository) {}

  /**
   * Encrypts the platform token (and device id) before persistence. The
   * returned credential exposes only `encryptedToken` — never the plaintext.
   */
  async createCredential (input: BotCredentialCreateInput): Promise<BotCredential> {
    const payload: EncryptedPayload = {
      token: input.token,
      deviceId: input.deviceId
    }
    const encryptedToken = encryptSecret(JSON.stringify(payload))
    return await this.repo.create({
      tenantId: input.tenantId,
      botId: input.botId,
      platform: input.platform,
      encryptedToken,
      externalAccountId: input.externalAccountId,
      externalAccountName: input.externalAccountName
    })
  }

  async listByBot (botId: string): Promise<BotCredential[]> {
    return await this.repo.findByBot(botId)
  }

  async getByIdAndTenant (id: string, tenantId: string): Promise<BotCredential | null> {
    return await this.repo.findByIdAndTenant(id, tenantId)
  }

  async getActiveByBot (botId: string): Promise<BotCredential | null> {
    return await this.repo.findActiveByBot(botId)
  }

  async revoke (id: string): Promise<BotCredential | null> {
    return await this.repo.update(id, { status: 'revoked' })
  }

  async markInvalid (id: string): Promise<BotCredential | null> {
    return await this.repo.update(id, { status: 'invalid' })
  }

  async deleteCredential (id: string): Promise<void> {
    const existing = await this.repo.findById(id)
    if (existing == null) {
      throw createNotFoundError('Credential not found')
    }
    await this.repo.delete(id)
  }

  /**
   * Decrypts a credential for runtime use by a platform adapter. This is the
   * only place plaintext tokens leave the encryption layer, and the result is
   * never serialized into API responses or logs.
   */
  async decryptForRuntime (credential: BotCredential): Promise<DecryptedCredential> {
    const raw = decryptSecret(credential.encryptedToken)
    const payload = JSON.parse(raw) as EncryptedPayload
    return {
      token: payload.token,
      deviceId: payload.deviceId,
      externalAccountId: credential.externalAccountId,
      externalAccountName: credential.externalAccountName
    }
  }
}

export const credentialService = new CredentialService(credentialRepository)
