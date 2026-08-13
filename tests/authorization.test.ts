/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { requireBot, requireCredential, requireRoom } from '../src/api/middleware/authorization.js'
import { AppError, ErrorTypes } from '../src/utils/errors.js'
import type { Bot } from '../src/core/bots/bot.types.js'
import type { BotRoom } from '../src/core/rooms/room.types.js'
import type { BotCredential } from '../src/core/credentials/credential.types.js'

/** Invokes an async Express middleware directly with a fake req/res. */
const invoke = async (handler: RequestHandler, req: Partial<Request>, next: NextFunction): Promise<void> => {
  await (handler as unknown as (r: Request, s: Response, n: NextFunction) => Promise<void>)(
    req as Request,
    {} as Response,
    next
  )
}

const makeBot = (): Bot => ({
  id: 'bot-1',
  tenantId: 'tenant-1',
  name: 'Helper',
  platform: 'clubhouse',
  status: 'active',
  aiConfig: { enabled: true, model: 'gpt-4o-mini', temperature: 0.4, maxOutputTokens: 150, maxResponseLength: 280, triggerMode: 'question', triggerPrefix: '#', cooldownSeconds: 30 },
  createdAt: new Date(),
  updatedAt: new Date()
})

const makeRoom = (): BotRoom => ({
  id: 'room-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  platform: 'clubhouse',
  externalRoomId: 'ch_abc',
  status: 'active',
  settings: { welcomeEnabled: true, aiEnabled: true, autoInviteEnabled: false, moderationEnabled: false },
  createdAt: new Date(),
  updatedAt: new Date()
})

const makeCredential = (): BotCredential => ({
  id: 'cred-1',
  tenantId: 'tenant-1',
  botId: 'bot-1',
  platform: 'clubhouse',
  encryptedToken: 'encrypted',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
})

const expectError = (next: ReturnType<typeof vi.fn>, statusCode: number, type: string, message: string): void => {
  expect(next).toHaveBeenCalledTimes(1)
  const err = next.mock.calls[0][0] as AppError
  expect(err).toBeInstanceOf(AppError)
  expect(err.statusCode).toBe(statusCode)
  expect(err.type).toBe(type)
  expect(err.message).toBe(message)
}

describe('requireBot', () => {
  it('loads the bot onto the request when it belongs to the tenant', async () => {
    const loader = vi.fn(async (id: string, tenantId: string) =>
      id === 'bot-1' && tenantId === 'tenant-1' ? makeBot() : null
    )
    const next = vi.fn()
    const req: Partial<Request> = { params: { botId: 'bot-1' }, tenant: { id: 'tenant-1' } }
    await invoke(requireBot(loader), req, next)
    expect(loader).toHaveBeenCalledWith('bot-1', 'tenant-1')
    expect(req.bot?.id).toBe('bot-1')
    expect(next).toHaveBeenCalledWith()
  })

  it('returns 404 when the bot is missing', async () => {
    const loader = vi.fn(async () => null)
    const next = vi.fn()
    await invoke(requireBot(loader), { params: { botId: 'bot-1' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 404, ErrorTypes.NOT_FOUND, 'Bot not found')
  })

  it('returns 404 when there is no tenant context', async () => {
    const loader = vi.fn()
    const next = vi.fn()
    await invoke(requireBot(loader), { params: { botId: 'bot-1' } }, next)
    expectError(next, 404, ErrorTypes.NOT_FOUND, 'Bot not found')
    expect(loader).not.toHaveBeenCalled()
  })

  it('returns 404 when the bot id param is missing', async () => {
    const loader = vi.fn()
    const next = vi.fn()
    await invoke(requireBot(loader), { params: {}, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 404, ErrorTypes.NOT_FOUND, 'Bot not found')
  })

  it('returns 500 when the loader throws', async () => {
    const loader = vi.fn(async () => { throw new Error('boom') })
    const next = vi.fn()
    await invoke(requireBot(loader), { params: { botId: 'bot-1' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 500, ErrorTypes.INTERNAL, 'Authorization check failed')
  })
})

describe('requireRoom', () => {
  it('loads the room and passes the bot id to the loader', async () => {
    const loader = vi.fn(async (_roomId: string, _tenantId: string, botId?: string) =>
      botId === 'bot-1' ? makeRoom() : null
    )
    const next = vi.fn()
    const req: Partial<Request> = { params: { externalRoomId: 'M84V9RyJ', botId: 'bot-1' }, tenant: { id: 'tenant-1' } }
    await invoke(requireRoom(loader), req, next)
    expect(loader).toHaveBeenCalledWith('M84V9RyJ', 'tenant-1', 'bot-1')
    expect(req.room?.id).toBe('room-1')
    expect(next).toHaveBeenCalledWith()
  })

  it('returns 404 when the room is missing', async () => {
    const loader = vi.fn(async () => null)
    const next = vi.fn()
    await invoke(requireRoom(loader), { params: { externalRoomId: 'M84V9RyJ' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 404, ErrorTypes.NOT_FOUND, 'Room not found')
  })

  it('returns 500 when the loader throws', async () => {
    const loader = vi.fn(async () => { throw new Error('boom') })
    const next = vi.fn()
    await invoke(requireRoom(loader), { params: { externalRoomId: 'M84V9RyJ' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 500, ErrorTypes.INTERNAL, 'Authorization check failed')
  })
})

describe('requireCredential', () => {
  it('loads the credential onto the request', async () => {
    const loader = vi.fn(async (id: string, tenantId: string) =>
      id === 'cred-1' && tenantId === 'tenant-1' ? makeCredential() : null
    )
    const next = vi.fn()
    const req: Partial<Request> = { params: { credentialId: 'cred-1' }, tenant: { id: 'tenant-1' } }
    await invoke(requireCredential(loader), req, next)
    expect(loader).toHaveBeenCalledWith('cred-1', 'tenant-1')
    expect(req.credential?.id).toBe('cred-1')
    expect(next).toHaveBeenCalledWith()
  })

  it('returns 404 when the credential is missing', async () => {
    const loader = vi.fn(async () => null)
    const next = vi.fn()
    await invoke(requireCredential(loader), { params: { credentialId: 'cred-1' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 404, ErrorTypes.NOT_FOUND, 'Credential not found')
  })

  it('returns 500 when the loader throws', async () => {
    const loader = vi.fn(async () => { throw new Error('boom') })
    const next = vi.fn()
    await invoke(requireCredential(loader), { params: { credentialId: 'cred-1' }, tenant: { id: 'tenant-1' } }, next)
    expectError(next, 500, ErrorTypes.INTERNAL, 'Authorization check failed')
  })
})
