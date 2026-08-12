/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * End-to-end automation pipeline test: a published community event flows
 * through the event bus -> event processor -> automation stage -> rule engine
 * -> platform action and usage telemetry (spec §25: automation pipeline).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/core/events/event-bus.js'
import { EventProcessor } from '../src/core/events/event-processor.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { AutomationStage } from '../src/core/automation/automation-stage.js'
import { AutomationEngine } from '../src/core/automation/rule-engine.js'
import { createWelcomeRule, DEFAULT_WELCOME_MESSAGE } from '../src/core/automation/rules/welcome.rule.js'
import { createRuleContext } from '../src/core/automation/action-dispatcher.js'
import { InMemoryUsageRepository } from './helpers/in-memory.js'
import { UsageService } from '../src/core/usage/usage.service.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'

const makeBot = (overrides: Partial<Bot> = {}): Bot => ({
  id: 'bot-1',
  tenantId: 'tenant-1',
  name: 'Helper',
  platform: 'clubhouse',
  status: 'active',
  aiConfig: { enabled: true, model: 'gpt-4o-mini', temperature: 0.4, maxOutputTokens: 150, maxResponseLength: 280, triggerMode: 'question', triggerPrefix: '#', cooldownSeconds: 30 },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const makeRoom = (overrides: Partial<BotRoom> = {}): BotRoom => ({
  id: 'room-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  platform: 'clubhouse',
  externalRoomId: 'ch_abc',
  status: 'active',
  settings: { welcomeEnabled: true, aiEnabled: true, autoInviteEnabled: false, moderationEnabled: false },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const makeEvent = (type: CommunityEvent['type'], payload: unknown): CommunityEvent => ({
  id: `evt-${type}`,
  tenantId: 'tenant-1',
  botId: 'bot-1',
  roomId: 'room-1',
  platform: 'clubhouse',
  type,
  timestamp: new Date(),
  payload
})

const makeFakeAdapter = (): CommunityPlatformAdapter & { sent: string[] } => {
  const sent: string[] = []
  return {
    platform: 'clubhouse',
    sent,
    getRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(async (_room: string, message: string) => { sent.push(message) }),
    getUser: vi.fn(),
    searchUsers: vi.fn(),
    inviteSpeaker: vi.fn(),
    acceptSpeakerInvite: vi.fn()
  }
}

const flush = async (): Promise<void> => {
  await new Promise((resolve) => { setTimeout(resolve, 0) })
}

describe('automation pipeline', () => {
  let bus: EventBus
  let processor: EventProcessor
  let adapter: ReturnType<typeof makeFakeAdapter>
  let usageService: UsageService
  let bot: Bot
  let room: BotRoom
  let eventStore: InMemoryEventStore

  beforeEach(() => {
    bus = new EventBus()
    eventStore = new InMemoryEventStore()
    processor = new EventProcessor({ bus, eventStore })
    adapter = makeFakeAdapter()
    usageService = new UsageService({ repo: new InMemoryUsageRepository() })
    bot = makeBot()
    room = makeRoom()
  })

  afterEach(() => {
    processor.stop()
  })

  it('runs the welcome rule end-to-end and records automation usage', async () => {
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const stage = new AutomationStage({
      engine,
      resolveContext: async () => createRuleContext({ bot, room, adapter }),
      usage: usageService
    })
    processor.addStage(stage)
    processor.start()

    bot.welcomeMessage = 'Hi {username}!'
    bus.publish(makeEvent('user.joined', { userId: 'u-9', username: 'Sara' }))

    await vi.waitFor(() => {
      expect(adapter.sent).toEqual(['Hi Sara!'])
    })
    const summary = await usageService.summarize(bot.id)
    expect(summary.automationActions).toBe(1)
  })

  it('uses the default welcome template when the bot has no custom message', async () => {
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const stage = new AutomationStage({
      engine,
      resolveContext: async () => createRuleContext({ bot, room, adapter }),
      usage: usageService
    })
    processor.addStage(stage)
    processor.start()

    bus.publish(makeEvent('user.joined', { userId: 'u-9', username: 'Alex' }))

    await vi.waitFor(() => {
      expect(adapter.sent).toEqual([DEFAULT_WELCOME_MESSAGE.replaceAll('{username}', 'Alex')])
    })
  })

  it('skips event types outside the automation set without resolving context', async () => {
    const resolveContext = vi.fn(async () => createRuleContext({ bot, room, adapter }))
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const stage = new AutomationStage({ engine, resolveContext, usage: usageService })
    processor.addStage(stage)
    processor.start()

    bus.publish(makeEvent('user.left', { userId: 'u-9' }))
    await flush()

    expect(resolveContext).not.toHaveBeenCalled()
    expect(adapter.sent).toEqual([])
    expect((await usageService.summarize(bot.id)).automationActions).toBe(0)
  })

  it('does not record usage when context resolution fails', async () => {
    const resolveContext = vi.fn(async () => null)
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const stage = new AutomationStage({ engine, resolveContext, usage: usageService })
    processor.addStage(stage)
    processor.start()

    bus.publish(makeEvent('user.joined', { userId: 'u-9', username: 'Sara' }))
    await vi.waitFor(() => {
      expect(resolveContext).toHaveBeenCalled()
    })
    expect(adapter.sent).toEqual([])
    expect((await usageService.summarize(bot.id)).automationActions).toBe(0)
  })

  it('continues to later stages when an earlier stage throws', async () => {
    const failing = {
      name: 'failing',
      handle: vi.fn(async () => { throw new Error('boom') })
    }
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const stage = new AutomationStage({
      engine,
      resolveContext: async () => createRuleContext({ bot, room, adapter }),
      usage: usageService
    })
    processor.addStage(failing)
    processor.addStage(stage)
    processor.start()

    bus.publish(makeEvent('user.joined', { userId: 'u-9', username: 'Sara' }))

    await vi.waitFor(() => {
      expect(adapter.sent).toEqual([DEFAULT_WELCOME_MESSAGE.replaceAll('{username}', 'Sara')])
    })
    expect(failing.handle).toHaveBeenCalledTimes(1)
  })
})
