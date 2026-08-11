/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BotService } from '../src/core/bots/bot.service.js'
import type { CredentialService } from '../src/core/credentials/credential.service.js'
import type { BotCredential } from '../src/core/credentials/credential.types.js'
import type { AdapterCredentialData, CommunityPlatformAdapter } from '../src/platforms/adapter.js'
import { registerAdapterFactory } from '../src/platforms/adapter.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import { InMemoryBotRepository } from './helpers/in-memory.js'

const makeCredential = (overrides: Partial<BotCredential> = {}): BotCredential => ({
  id: 'cred-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  platform: 'clubhouse',
  encryptedToken: 'encrypted',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const makeDecrypted = (): AdapterCredentialData => ({
  token: 'tok',
  deviceId: 'dev',
  externalAccountId: 'ext-1',
  externalAccountName: 'Sara'
})

/** Minimal CredentialService-shaped stub; only the methods BotService uses. */
const makeCredentialsStub = (overrides: Record<string, unknown> = {}): CredentialService => ({
  getActiveByBot: vi.fn(async () => null),
  decryptForRuntime: vi.fn(async () => makeDecrypted()),
  ...overrides
}) as unknown as CredentialService

const makeFakeAdapter = (): CommunityPlatformAdapter => ({
  platform: 'clubhouse',
  getRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  getUser: vi.fn(),
  searchUsers: vi.fn(),
  inviteSpeaker: vi.fn(),
  acceptSpeakerInvite: vi.fn()
})

describe('BotService', () => {
  let repo: InMemoryBotRepository
  let credentials: CredentialService
  let service: BotService

  beforeEach(() => {
    repo = new InMemoryBotRepository()
    credentials = makeCredentialsStub()
    service = new BotService({ repo, credentials })
  })

  it('creates a bot scoped to its tenant', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    expect(bot.id).toBeTruthy()
    expect(bot.tenantId).toBe('tenant-1')
    expect(bot.status).toBe('created')
    expect(await service.listByTenant('tenant-1')).toHaveLength(1)
  })

  it('lists bots by tenant only', async () => {
    await service.createBot({ tenantId: 'tenant-1', name: 'A', platform: 'clubhouse' })
    await service.createBot({ tenantId: 'tenant-2', name: 'B', platform: 'clubhouse' })
    const tenant1 = await service.listByTenant('tenant-1')
    expect(tenant1.map((b: Bot) => b.name)).toEqual(['A'])
  })

  it('gets a bot by id and tenant (null for another tenant)', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    expect((await service.getByIdAndTenant(bot.id, 'tenant-1'))?.name).toBe('Helper')
    expect(await service.getByIdAndTenant(bot.id, 'tenant-2')).toBeNull()
  })

  it('updates a bot', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    const updated = await service.updateBot(bot.id, { name: 'Renamed' })
    expect(updated?.name).toBe('Renamed')
  })

  it('deletes a bot', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await service.deleteBot(bot.id)
    expect(await service.getByIdAndTenant(bot.id, 'tenant-1')).toBeNull()
  })

  it('throws when creating an adapter without an active credential', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await expect(service.createAdapter(bot)).rejects.toThrow(
      `No active credential for bot ${bot.id}`
    )
  })

  it('builds an adapter from the active credential via the platform factory', async () => {
    const credential = makeCredential()
    credentials = makeCredentialsStub({
      getActiveByBot: vi.fn(async () => credential),
      decryptForRuntime: vi.fn(async () => makeDecrypted())
    })
    service = new BotService({ repo, credentials })
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })

    const fakeAdapter = makeFakeAdapter()
    const factory = vi.fn((_cred: AdapterCredentialData): CommunityPlatformAdapter => fakeAdapter)
    registerAdapterFactory('clubhouse', factory)

    const adapter = await service.createAdapter(bot)
    expect(adapter).toBe(fakeAdapter)
    expect(credentials.getActiveByBot).toHaveBeenCalledWith(bot.id)
    expect(factory).toHaveBeenCalledWith(makeDecrypted())
  })

  it('returns the external user id from the active credential', async () => {
    credentials = makeCredentialsStub({
      getActiveByBot: vi.fn(async () => makeCredential({ externalAccountId: 'ext-1' }))
    })
    service = new BotService({ repo, credentials })
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await expect(service.getBotExternalUserId(bot.id)).resolves.toBe('ext-1')
  })

  it('returns undefined for the external user id without a credential', async () => {
    const bot = await service.createBot({ tenantId: 'tenant-1', name: 'Helper', platform: 'clubhouse' })
    await expect(service.getBotExternalUserId(bot.id)).resolves.toBeUndefined()
  })
})
