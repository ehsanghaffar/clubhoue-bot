/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { UsageService } from '../src/core/usage/usage.service.js'
import { AnalyticsService } from '../src/core/usage/analytics.service.js'
import { UsageStage } from '../src/core/usage/usage-stage.js'
import {
  InMemoryUsageRepository,
  InMemoryRoomRepository,
  InMemoryRoomMemberRepository
} from './helpers/in-memory.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'

const makeEvent = (overrides: Partial<CommunityEvent> = {}): CommunityEvent => ({
  id: 'e-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  roomId: 'room-1',
  platform: 'clubhouse',
  type: 'message.created',
  timestamp: new Date(),
  payload: {},
  ...overrides
})

describe('UsageService', () => {
  let repo: InMemoryUsageRepository
  let service: UsageService

  beforeEach(() => {
    repo = new InMemoryUsageRepository()
    service = new UsageService({ repo })
  })

  it('records usage events', async () => {
    const event = await service.record({
      tenantId: 'tenant-1',
      botId: 'bot-1',
      roomId: 'room-1',
      type: 'message_received'
    })
    expect(event.id).toBeDefined()
    expect(event.type).toBe('message_received')
  })

  it('counts by bot and type', async () => {
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'ai_request' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-2', roomId: 'room-2', type: 'message_received' })

    expect(await service.countByBotAndType('bot-1', 'message_received')).toBe(2)
    expect(await service.countByBotAndType('bot-1', 'ai_request')).toBe(1)
  })

  it('lists events for a bot, newest first', async () => {
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'ai_response' })
    const events = await service.listByBot('bot-1')
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('ai_response')
  })

  it('summarizes usage counts', async () => {
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'ai_request' })
    await service.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'ai_response' })

    const summary = await service.summarize('bot-1')
    expect(summary.messages).toBe(2)
    expect(summary.aiRequests).toBe(1)
    expect(summary.aiResponses).toBe(1)
  })
})

describe('UsageStage', () => {
  it('maps community events to usage events', async () => {
    const repo = new InMemoryUsageRepository()
    const usage = new UsageService({ repo })
    const stage = new UsageStage({ usage })

    await stage.handle(makeEvent({ type: 'room.joined' }))
    await stage.handle(makeEvent({ type: 'message.created' }))
    await stage.handle(makeEvent({ type: 'speaker.invited' }))
    await stage.handle(makeEvent({ type: 'room.left' }))
    await stage.handle(makeEvent({ type: 'user.joined' }))

    expect(await repo.countByBotAndType('bot-1', 'room_join')).toBe(1)
    expect(await repo.countByBotAndType('bot-1', 'message_received')).toBe(1)
    expect(await repo.countByBotAndType('bot-1', 'speaker_invite')).toBe(1)
    expect(await repo.countByBotAndType('bot-1', 'room_leave')).toBe(1)
    // user.joined has no usage mapping.
    expect((await repo.listByBot('bot-1')).length).toBe(4)
  })

  it('swallows recorder errors so the pipeline continues', async () => {
    const stage = new UsageStage({
      usage: {
        record: async () => { throw new Error('db down') }
      }
    })
    await expect(stage.handle(makeEvent({ type: 'message.created' }))).resolves.toBeUndefined()
  })
})

describe('AnalyticsService', () => {
  it('composes usage counts with room and user totals', async () => {
    const usageRepo = new InMemoryUsageRepository()
    const rooms = new InMemoryRoomRepository()
    const members = new InMemoryRoomMemberRepository()

    const usage = new UsageService({ repo: usageRepo })
    await usage.record({ tenantId: 'tenant-1', botId: 'bot-1', roomId: 'room-1', type: 'message_received' })

    const roomA = await rooms.create({ tenantId: 'tenant-1', botId: 'bot-1', platform: 'clubhouse', externalRoomId: 'ch_a' })
    await rooms.create({ tenantId: 'tenant-1', botId: 'bot-1', platform: 'clubhouse', externalRoomId: 'ch_b' })
    await members.ensureSeen(roomA.id, 'u-1')
    await members.ensureSeen(roomA.id, 'u-2')

    const analytics = new AnalyticsService({ usage: usageRepo, rooms, members })
    const summary = await analytics.summarizeBot('bot-1')

    expect(summary.messages).toBe(1)
    expect(summary.rooms).toBe(2)
    expect(summary.users).toBe(2)
  })
})
