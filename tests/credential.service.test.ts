/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { BotCredential } from '../src/core/credentials/credential.types.js'
import type {
  CredentialCreateInput,
  CredentialRepository,
  CredentialUpdateInput
} from '../src/core/credentials/credential.repository.js'
import { CredentialService } from '../src/core/credentials/credential.service.js'
import { resetEncryptionKeyCache } from '../src/core/credentials/credential-encryption.js'

class InMemoryCredentialRepository implements CredentialRepository {
  private readonly rows = new Map<string, BotCredential>()

  async create (input: CredentialCreateInput): Promise<BotCredential> {
    const now = new Date()
    const credential: BotCredential = {
      id: `cred_${this.rows.size + 1}`,
      tenantId: input.tenantId,
      botId: input.botId,
      platform: input.platform,
      encryptedToken: input.encryptedToken,
      externalAccountId: input.externalAccountId,
      externalAccountName: input.externalAccountName,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    this.rows.set(credential.id, credential)
    return credential
  }

  async findById (id: string): Promise<BotCredential | null> {
    return this.rows.get(id) ?? null
  }

  async findByIdAndTenant (id: string, tenantId: string): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    return row != null && row.tenantId === tenantId ? row : null
  }

  async findActiveByBot (botId: string): Promise<BotCredential | null> {
    const rows = [...this.rows.values()].filter((r) => r.botId === botId && r.status === 'active')
    return rows[rows.length - 1] ?? null
  }

  async findByBot (botId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((r) => r.botId === botId)
  }

  async findByTenant (tenantId: string): Promise<BotCredential[]> {
    return [...this.rows.values()].filter((r) => r.tenantId === tenantId)
  }

  async update (id: string, patch: CredentialUpdateInput): Promise<BotCredential | null> {
    const row = this.rows.get(id)
    if (row == null) return null
    const updated: BotCredential = { ...row, ...patch, updatedAt: new Date() }
    this.rows.set(id, updated)
    return updated
  }

  async delete (id: string): Promise<void> {
    this.rows.delete(id)
  }
}

describe('CredentialService', () => {
  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64)
    resetEncryptionKeyCache()
  })

  const makeService = (): CredentialService => new CredentialService(new InMemoryCredentialRepository())

  it('never stores the plaintext token', async () => {
    const service = makeService()
    const credential = await service.createCredential({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      token: 'plaintext-secret-token',
      deviceId: 'device-abc'
    })
    expect(credential.encryptedToken).not.toContain('plaintext-secret-token')
    expect(credential.encryptedToken).not.toContain('device-abc')
  })

  it('decrypts for runtime use', async () => {
    const service = makeService()
    const credential = await service.createCredential({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      token: 'runtime-token',
      deviceId: 'runtime-device',
      externalAccountId: 'acc-9',
      externalAccountName: 'Alice'
    })
    const decrypted = await service.decryptForRuntime(credential)
    expect(decrypted.token).toBe('runtime-token')
    expect(decrypted.deviceId).toBe('runtime-device')
    expect(decrypted.externalAccountId).toBe('acc-9')
    expect(decrypted.externalAccountName).toBe('Alice')
  })

  it('revokes a credential', async () => {
    const service = makeService()
    const credential = await service.createCredential({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      token: 'token'
    })
    const revoked = await service.revoke(credential.id)
    expect(revoked?.status).toBe('revoked')
    expect(await service.getActiveByBot('bot-1')).toBeNull()
  })

  it('deletes a credential', async () => {
    const service = makeService()
    const credential = await service.createCredential({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      platform: 'clubhouse',
      token: 'token'
    })
    await service.deleteCredential(credential.id)
    expect(await service.getByIdAndTenant(credential.id, 'tenant-1')).toBeNull()
  })
})
