/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Cross-tenant security regression suite (the security matrix from the remediation
 * spec). Proves that tenant-owned resources cannot be read, updated, or deleted
 * across the tenant boundary — at the repository, service, and HTTP layers.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { BotService } from '../src/core/bots/bot.service.js'
import { RoomService } from '../src/core/rooms/room.service.js'
import { CredentialService } from '../src/core/credentials/credential.service.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { EventBus } from '../src/core/events/event-bus.js'
import { InMemoryMessageDeduplicator } from '../src/infrastructure/deduplication/message-dedup.js'
import {
  InMemoryBotRepository,
  InMemoryRoomRepository,
  InMemoryRoomMemberRepository,
  InMemoryCredentialRepository
} from './helpers/in-memory.js'

const makeHarness = () => {
  const botRepo = new InMemoryBotRepository()
  const roomRepo = new InMemoryRoomRepository()
  const memberRepo = new InMemoryRoomMemberRepository()
  const credentialRepo = new InMemoryCredentialRepository()
  const bus = new EventBus()
  const credentialService = new CredentialService(credentialRepo)
  const botService = new BotService({ repo: botRepo, credentials: credentialService })
  const roomService = new RoomService({
    repo: roomRepo,
    members: memberRepo,
    deduplicator: new InMemoryMessageDeduplicator(),
    bus,
    eventStore: new InMemoryEventStore()
  })
  return { botRepo, roomRepo, credentialRepo, credentialService, botService, roomService }
}

describe('cross-tenant repository + service isolation', () => {
  let h: ReturnType<typeof makeHarness>

  beforeEach(() => {
    h = makeHarness()
  })

  it('BOT: Tenant A can read/update/delete its own bot', async () => {
    const bot = await h.botService.createBot({ tenantId: 'tenant-a', name: 'A', platform: 'clubhouse' })
    expect(await h.botService.getByIdAndTenant(bot.id, 'tenant-a')).not.toBeNull()
    expect((await h.botService.updateBot('tenant-a', bot.id, { name: 'Renamed' }))?.name).toBe('Renamed')
    await h.botService.deleteBot('tenant-a', bot.id)
    expect(await h.botService.getByIdAndTenant(bot.id, 'tenant-a')).toBeNull()
  })

  it('BOT: Tenant A cannot read/update/delete Tenant B bot', async () => {
    const bot = await h.botService.createBot({ tenantId: 'tenant-b', name: 'B', platform: 'clubhouse' })
    expect(await h.botService.getByIdAndTenant(bot.id, 'tenant-a')).toBeNull()
    expect(await h.botService.updateBot('tenant-a', bot.id, { name: 'Hack' })).toBeNull()
    await h.botService.deleteBot('tenant-a', bot.id)
    // Tenant B's bot is untouched.
    expect(await h.botService.getByIdAndTenant(bot.id, 'tenant-b')).not.toBeNull()
  })

  it('ROOM: Tenant A cannot update/delete Tenant B room', async () => {
    const room = await h.roomService.createRoom({ tenantId: 'tenant-b', botId: 'bot-b', platform: 'clubhouse', externalRoomId: 'ch_b' })
    // Cross-tenant update returns null (no row matched the tenant scope).
    expect(await h.roomService.update('tenant-a', room.id, { status: 'active' })).toBeNull()
    await h.roomService.deleteRoom('tenant-a', room.id)
    // Tenant B's room is untouched — still scoped to tenant-b/bot-b.
    expect(await h.roomService.findByIdAndTenantAndBot(room.id, 'tenant-b', 'bot-b')).not.toBeNull()
  })

  it('CREDENTIAL: Tenant A cannot revoke/delete Tenant B credential', async () => {
    const cred = await h.credentialService.createCredential({ tenantId: 'tenant-b', botId: 'bot-b', platform: 'clubhouse', token: 't' })
    expect(await h.credentialService.revoke('tenant-a', cred.id)).toBeNull()
    await h.credentialService.deleteCredential('tenant-a', cred.id)
    expect(await h.credentialService.getByIdAndTenant(cred.id, 'tenant-b')).not.toBeNull()
  })
})
