/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AutomationEngine } from '../src/core/automation/rule-engine.js'
import { createRuleContext } from '../src/core/automation/action-dispatcher.js'
import { createWelcomeRule, DEFAULT_WELCOME_MESSAGE } from '../src/core/automation/rules/welcome.rule.js'
import { createSpeakerRule } from '../src/core/automation/rules/speaker.rule.js'
import { createAiRule } from '../src/core/automation/rules/ai.rule.js'
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

const makeFakeAdapter = (): CommunityPlatformAdapter & { sent: string[], invited: string[] } => {
  const sent: string[] = []
  const invited: string[] = []
  return {
    platform: 'clubhouse',
    sent,
    invited,
    getRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(async (_room, message: string) => { sent.push(message) }),
    getUser: vi.fn(),
    searchUsers: vi.fn(),
    inviteSpeaker: vi.fn(async (_room, userId: string) => { invited.push(userId) }),
    acceptSpeakerInvite: vi.fn()
  }
}

describe('AutomationEngine', () => {
  let adapter: ReturnType<typeof makeFakeAdapter>
  let bot: Bot
  let room: BotRoom

  beforeEach(() => {
    adapter = makeFakeAdapter()
    bot = makeBot()
    room = makeRoom()
  })

  it('sends a welcome message on user.joined with {username} substituted', async () => {
    bot.welcomeMessage = 'Hello {username}!'
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const event = makeEvent('user.joined', { userId: 'u-9', username: 'Sara' })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual(['Hello Sara!'])
    expect(results[0].action).toBe('send_message')
  })

  it('uses the default welcome message when no template is set', async () => {
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const event = makeEvent('user.joined', { userId: 'u-9', username: 'Sara' })
    await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual([DEFAULT_WELCOME_MESSAGE.replace('{username}', 'Sara')])
  })

  it('skips welcome when welcomeEnabled is false', async () => {
    room = makeRoom({ settings: { ...room.settings, welcomeEnabled: false } })
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    const event = makeEvent('user.joined', { userId: 'u-9', username: 'Sara' })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual([])
    expect(results).toEqual([])
  })

  it('does not welcome on other event types', async () => {
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    await engine.evaluate(makeEvent('message.created', {}), createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual([])
  })

  it('invites allow-listed users who request the stage', async () => {
    room = makeRoom({ settings: { ...room.settings, autoInviteEnabled: true } })
    const allowList = new Set(['u-1', 'u-2'])
    const engine = new AutomationEngine({ rules: [createSpeakerRule({ allowList })] })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'اجازه میدم بالا ببرم؟', timestamp: new Date() })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.invited).toEqual(['u-1'])
    expect(results[0].action).toBe('invite_speaker')
  })

  it('skips users not on the allow list', async () => {
    room = makeRoom({ settings: { ...room.settings, autoInviteEnabled: true } })
    const allowList = new Set(['u-2'])
    const engine = new AutomationEngine({ rules: [createSpeakerRule({ allowList })] })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'invite me please', timestamp: new Date() })
    await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.invited).toEqual([])
  })

  it('dedupes invites per session', async () => {
    room = makeRoom({ settings: { ...room.settings, autoInviteEnabled: true } })
    const engine = new AutomationEngine({ rules: [createSpeakerRule({ allowList: new Set(['u-1']) })] })
    const context = createRuleContext({ bot, room, adapter })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'stage please', timestamp: new Date() })
    await engine.evaluate(event, context)
    await engine.evaluate(event, context)
    expect(adapter.invited).toEqual(['u-1'])
  })

  it('does not invite when autoInviteEnabled is false', async () => {
    const engine = new AutomationEngine({ rules: [createSpeakerRule({ allowList: new Set(['u-1']) })] })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'invite me', timestamp: new Date() })
    await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.invited).toEqual([])
  })

  it('sends the AI answer when the runner produces one', async () => {
    const engine = new AutomationEngine({
      rules: [createAiRule({ runner: async () => 'The answer is 42.' })]
    })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'What is 6x7?', timestamp: new Date() })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual(['The answer is 42.'])
    expect(results[0].action).toBe('ai_response')
  })

  it('sends nothing when the AI runner returns null', async () => {
    const engine = new AutomationEngine({
      rules: [createAiRule({ runner: async () => null })]
    })
    const event = makeEvent('message.created', { messageId: 'm-1', userId: 'u-1', content: 'not a question', timestamp: new Date() })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toEqual([])
    expect(results).toEqual([])
  })

  it('isolates a throwing rule from others', async () => {
    const engine = new AutomationEngine({ rules: [createWelcomeRule()] })
    // inject a throwing rule
    engine.addRule({
      id: 'boom',
      name: 'Boom',
      match: () => true,
      run: async () => {
        throw new Error('kaboom')
      }
    })
    const event = makeEvent('user.joined', { userId: 'u-9', username: 'Sara' })
    const results = await engine.evaluate(event, createRuleContext({ bot, room, adapter }))
    expect(adapter.sent).toHaveLength(1) // welcome still ran
    expect(results.some((r) => r.ruleId === 'boom' && !r.success)).toBe(true)
  })
})
