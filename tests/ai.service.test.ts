/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiService } from '../src/core/ai/ai.service.js'
import { AgentService } from '../src/core/ai/agent.service.js'
import { InMemoryAiCooldownStore } from '../src/core/ai/in-memory-cooldown.js'
import { buildAiPrompt } from '../src/core/ai/prompt.service.js'
import type { AiProvider } from '../src/core/ai/ai.types.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
import type { CommunityPlatformAdapter } from '../src/platforms/adapter.js'
import { createRuleContext } from '../src/core/automation/action-dispatcher.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'

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

const makeFakeProvider = (answer = '42 Jan'): AiProvider => ({
  complete: vi.fn(async () => answer)
})

const makeService = (answer?: string): { ai: AiService, cooldown: InMemoryAiCooldownStore, provider: AiProvider } => {
  const cooldown = new InMemoryAiCooldownStore()
  const provider = makeFakeProvider(answer)
  return { ai: new AiService({ provider, cooldown }), cooldown, provider }
}

describe('AiService.decide (trigger modes)', () => {
  it('responds to questions in default question mode', () => {
    const { ai } = makeService()
    const bot = makeBot()
    expect(ai.decide(bot, 'what is the capital of France?').respond).toBe(true)
    expect(ai.decide(bot, 'چرا آسمون آبیه؟').respond).toBe(true)
  })

  it('does not respond to non-questions in question mode', () => {
    const { ai } = makeService()
    expect(ai.decide(makeBot(), 'hello everyone').respond).toBe(false)
  })

  it('responds only with the prefix in prefix mode', () => {
    const { ai } = makeService()
    const bot = makeBot({ aiConfig: { ...makeBot().aiConfig, triggerMode: 'prefix' } })
    expect(ai.decide(bot, '#what is love').respond).toBe(true)
    expect(ai.decide(bot, 'what is love').respond).toBe(false)
  })

  it('responds to mentions in mention mode', () => {
    const { ai } = makeService()
    const bot = makeBot({ aiConfig: { ...makeBot().aiConfig, triggerMode: 'mention' } })
    expect(ai.decide(bot, '@Helper tell me a joke').respond).toBe(true)
    expect(ai.decide(bot, 'tell me a joke').respond).toBe(false)
  })

  it('matches real-world Clubhouse mention formatting case-insensitively, including spaced display names', () => {
    const { ai } = makeService()
    const bot = makeBot({ name: 'My Bot', aiConfig: { ...makeBot().aiConfig, triggerMode: 'mention' } })
    expect(ai.decide(bot, '@my bot tell me a joke').respond).toBe(true)
    expect(ai.decide(bot, 'hello @MY BOT please help').respond).toBe(true)
    expect(ai.decide(bot, 'tell me a joke').respond).toBe(false)
  })

  it('never auto-responds in manual mode', () => {
    const { ai } = makeService()
    const bot = makeBot({ aiConfig: { ...makeBot().aiConfig, triggerMode: 'manual' } })
    expect(ai.decide(bot, 'what is 2+2?').respond).toBe(false)
  })

  it('returns disabled when aiConfig.enabled is false', () => {
    const { ai } = makeService()
    const bot = makeBot({ aiConfig: { ...makeBot().aiConfig, enabled: false } })
    expect(ai.decide(bot, 'what is 2+2?').reason).toBe('disabled')
  })
})

describe('AiService cooldown + generation', () => {
  it('enforces cooldown after a response', () => {
    const { ai, cooldown } = makeService()
    const bot = makeBot({ aiConfig: { ...makeBot().aiConfig, cooldownSeconds: 60 } })
    expect(ai.canRespond(bot, 'room-1', 'what is 2+2?').respond).toBe(true)
    ai.markResponded(bot, 'room-1')
    expect(ai.canRespond(bot, 'room-1', 'what is 2+2?').reason).toBe('cooldown')
    cooldown.clear()
    expect(ai.canRespond(bot, 'room-1', 'what is 2+2?').respond).toBe(true)
  })

  it('truncates long responses to maxResponseLength', async () => {
    const long = 'x'.repeat(500)
    const { ai } = makeService(long)
    const response = await ai.generateResponse(makeBot(), 'Ali', 'hello?')
    expect(response.content).toHaveLength(280)
    expect(response.truncated).toBe(true)
  })

  it('returns untruncated short responses', async () => {
    const { ai } = makeService('short answer')
    const response = await ai.generateResponse(makeBot(), 'Ali', 'hello?')
    expect(response.content).toBe('short answer')
    expect(response.truncated).toBe(false)
  })
})

describe('buildAiPrompt', () => {
  it('includes username Jan prefix rule and persona', () => {
    const bot = makeBot({ personality: 'Speaks Persian and English.' })
    const prompt = buildAiPrompt({ bot, username: 'Sara', question: 'hi' })
    expect(prompt.system).toContain('Sara Jan')
    expect(prompt.system).toContain('Speaks Persian and English.')
    expect(prompt.user).toBe('hi')
  })

  it('includes the Ehsan confidentiality rule', () => {
    const prompt = buildAiPrompt({ bot: makeBot(), username: 'Sara', question: 'hi' })
    expect(prompt.system).toContain('confidential')
  })
})

describe('AgentService runner', () => {
  const makeEvent = (userId: string, content: string): CommunityEvent => ({
    id: 'evt-1',
    tenantId: 'tenant-1',
    botId: 'bot-1',
    roomId: 'room-1',
    platform: 'clubhouse',
    type: 'message.created',
    timestamp: new Date(),
    payload: { messageId: 'm-1', userId, username: 'User', content, timestamp: new Date() }
  })

  it('ignores the bot’s own messages', async () => {
    const { ai } = makeService('answer')
    const agent = new AgentService({ ai })
    const runner = agent.createRunner()
    const adapter: CommunityPlatformAdapter = {
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
    }
    const context = createRuleContext({ bot: makeBot(), room: makeRoom(), adapter, botUserId: 'bot-own-id' })
    const result = await runner(makeEvent('bot-own-id', 'what is 2+2?'), context)
    expect(result).toBeNull()
  })

  it('returns null when not triggered', async () => {
    const { ai } = makeService('answer')
    const agent = new AgentService({ ai })
    const runner = agent.createRunner()
    const adapter: CommunityPlatformAdapter = {
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
    }
    const context = createRuleContext({ bot: makeBot(), room: makeRoom(), adapter })
    const result = await runner(makeEvent('u-1', 'just chatting'), context)
    expect(result).toBeNull()
  })

  it('answers a question and arms cooldown', async () => {
    const { ai, cooldown } = makeService('The answer is 42.')
    const agent = new AgentService({ ai })
    const runner = agent.createRunner()
    const adapter: CommunityPlatformAdapter = {
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
    }
    const context = createRuleContext({ bot: makeBot(), room: makeRoom(), adapter })
    const result = await runner(makeEvent('u-1', 'what is 42?'), context)
    expect(result).toBe('The answer is 42.')
    expect(cooldown.isOnCooldown('bot-1', 'room-1', 30)).toBe(true)
  })
})
