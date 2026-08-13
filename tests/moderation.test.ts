/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Moderation pipeline tests (spec §23 / Phase M remediation). These exercise
 * observable behavior through the real event pipeline:
 *
 *   EventBus → EventProcessor → ModerationStage → AutomationStage(AI) → UsageStage
 *
 * A blocked message returns 'block' from the moderation stage, so it must not
 * reach the AI rules and must not produce usage events, while the existing AI
 * cooldown and self-message protection keep working.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/core/events/event-bus.js'
import { EventProcessor } from '../src/core/events/event-processor.js'
import { InMemoryEventStore } from '../src/core/events/event-store.memory.js'
import { ModerationStage } from '../src/core/moderation/moderation-stage.js'
import { InMemoryMessageRateLimiter } from '../src/core/moderation/message-rate-limit.js'
import { AutomationStage } from '../src/core/automation/automation-stage.js'
import { AutomationEngine } from '../src/core/automation/rule-engine.js'
import { createAiRule } from '../src/core/automation/rules/ai.rule.js'
import { createRuleContext } from '../src/core/automation/action-dispatcher.js'
import { UsageStage } from '../src/core/usage/usage-stage.js'
import { UsageService } from '../src/core/usage/usage.service.js'
import { AiService } from '../src/core/ai/ai.service.js'
import { AgentService } from '../src/core/ai/agent.service.js'
import { InMemoryAiCooldownStore } from '../src/core/ai/in-memory-cooldown.js'
import { InMemoryUsageRepository } from './helpers/in-memory.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
import type { AiProvider } from '../src/core/ai/ai.types.js'
import { InMemoryActionIdempotencyStore } from '../src/core/events/action-idempotency.js'

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

const makeMessageEvent = (userId: string, content: string, messageId = `m-${Math.random()}`): CommunityEvent => ({
  id: `evt-${messageId}`,
  tenantId: 'tenant-1',
  botId: 'bot-1',
  roomId: 'room-1',
  platform: 'clubhouse',
  type: 'message.created',
  timestamp: new Date(),
  payload: { messageId, userId, content }
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

interface Harness {
  bus: EventBus
  processor: EventProcessor
  adapter: ReturnType<typeof makeFakeAdapter>
  usage: UsageService
  cooldown: InMemoryAiCooldownStore
  provider: AiProvider & { complete: ReturnType<typeof vi.fn> }
  room: BotRoom
}

/** Builds a pipeline: moderation -> automation(AI) -> usage. */
const buildHarness = (roomOverrides: Partial<BotRoom> = {}): Harness => {
  const bus = new EventBus()
  const eventStore = new InMemoryEventStore()
  const processor = new EventProcessor({ bus, eventStore })
  const adapter = makeFakeAdapter()
  const usage = new UsageService({ repo: new InMemoryUsageRepository() })
  const cooldown = new InMemoryAiCooldownStore()
  const provider = { complete: vi.fn(async () => '42 Jan') }
  const ai = new AiService({ provider, cooldown })
  const agent = new AgentService({ ai, usage })
  const bot = makeBot()
  const room = makeRoom(roomOverrides)

  processor.addStage(new ModerationStage({
    getRoom: async () => room,
    limiter: new InMemoryMessageRateLimiter()
  }))
  processor.addStage(new AutomationStage({
    engine: new AutomationEngine({ rules: [createAiRule({ runner: agent.createRunner(), actions: new InMemoryActionIdempotencyStore() })] }),
    resolveContext: async () => createRuleContext({ bot, room, adapter, botUserId: 'bot-self-id' }),
    usage
  }))
  processor.addStage(new UsageStage({ usage }))
  processor.start()

  return { bus, processor, adapter, usage, cooldown, provider, room }
}

describe('moderation pipeline', () => {
  let harness: Harness

  beforeEach(() => {
    harness = buildHarness()
  })

  afterEach(() => {
    harness.processor.stop()
  })

  it('does not moderate when moderation is disabled', async () => {
    const { bus, provider, adapter } = harness
    bus.publish(makeMessageEvent('u-1', 'what is 2+2?'))
    await vi.waitFor(() => {
      expect(provider.complete).toHaveBeenCalledTimes(1)
    })
    expect(adapter.sent).toEqual(['42 Jan'])
  })

  it('blocks a blocked user before AI', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true, blockedUsers: ['u-bad'] }
    })
    const { bus, provider, adapter } = harness
    bus.publish(makeMessageEvent('u-bad', 'what is 2+2?'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(provider.complete).not.toHaveBeenCalled()
    expect(adapter.sent).toEqual([])
  })

  it('allows an allowed user when moderation is enabled', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true, blockedUsers: ['u-bad'] }
    })
    const { bus, provider } = harness
    bus.publish(makeMessageEvent('u-good', 'what is 2+2?'))
    await vi.waitFor(() => {
      expect(provider.complete).toHaveBeenCalledTimes(1)
    })
  })

  it('blocks messages containing a blocked keyword, case-insensitively', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true, blockedKeywords: ['spam'] }
    })
    const { bus, provider } = harness
    bus.publish(makeMessageEvent('u-1', 'SPAM please answer'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(provider.complete).not.toHaveBeenCalled()

    bus.publish(makeMessageEvent('u-1', 'what is a normal question?'))
    await vi.waitFor(() => {
      expect(provider.complete).toHaveBeenCalledTimes(1)
    })
  })

  it('rate limits a single user per bot+room and lets others through', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true, messageRateLimit: { max: 1, windowSeconds: 60 } }
    })
    const { bus, provider } = harness
    bus.publish(makeMessageEvent('u-1', 'first question?'))
    await vi.waitFor(() => {
      expect(provider.complete).toHaveBeenCalledTimes(1)
    })
    // Second message from the same user is gated by the rate limit.
    bus.publish(makeMessageEvent('u-1', 'second question?'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('keeps the AI cooldown working alongside moderation', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true }
    })
    const { bus, provider, cooldown } = harness
    bus.publish(makeMessageEvent('u-1', 'first question?'))
    await vi.waitFor(() => {
      expect(provider.complete).toHaveBeenCalledTimes(1)
    })
    // Mark responded so the cooldown window is active (short window).
    cooldown.markResponded('tenant-1', 'bot-1', 'room-1', 'u-1')
    bus.publish(makeMessageEvent('u-1', 'second question?'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    // Moderation allowed both, but AI cooldown suppressed the second response.
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('does not create usage events for a blocked message', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true, blockedUsers: ['u-bad'] }
    })
    const { bus, usage } = harness
    bus.publish(makeMessageEvent('u-bad', 'what is 2+2?'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    const summary = await usage.summarize('bot-1')
    expect(summary.messages).toBe(0)
    expect(summary.aiRequests).toBe(0)
    expect(summary.aiResponses).toBe(0)
    expect(summary.automationActions).toBe(0)
  })

  it('preserves self-message protection when moderation is enabled', async () => {
    harness.processor.stop()
    harness = buildHarness({
      settings: { ...harness.room.settings, moderationEnabled: true }
    })
    const { bus, provider, adapter } = harness
    // The bot's own external id is 'bot-self-id'; its messages must not loop back into AI.
    bus.publish(makeMessageEvent('bot-self-id', 'what is 1+1?'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(provider.complete).not.toHaveBeenCalled()
    expect(adapter.sent).toEqual([])
  })
})
