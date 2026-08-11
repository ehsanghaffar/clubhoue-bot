/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryQueue } from '../src/infrastructure/queue/in-memory-queue.js'
import { Worker } from '../src/workers/worker.js'
import { createHandlers, type WorkerDeps } from '../src/workers/handlers.js'
import { JOB_ACTIVE_PING, JOB_ROOM_SYNC, JOB_SPEAKER_INVITE } from '../src/workers/jobs.js'
import type { BotManager } from '../src/core/bots/bot-manager.js'
import type { AiService } from '../src/core/ai/ai.service.js'

const waitFor = async (predicate: () => boolean, timeoutMs = 500): Promise<void> => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('InMemoryQueue', () => {
  let queue: InMemoryQueue

  beforeEach(() => {
    queue = new InMemoryQueue()
  })

  it('delivers jobs to the registered handler', async () => {
    const handled: string[] = []
    queue.process(async (job) => {
      handled.push(job.name)
    })
    queue.start()

    await queue.enqueue('alpha', {})
    await waitFor(() => handled.length === 1)
    expect(handled).toEqual(['alpha'])
    expect(queue.pendingCount).toBe(0)
  })

  it('retries a failing job up to maxAttempts', async () => {
    let calls = 0
    queue.process(async () => {
      calls += 1
      throw new Error('boom')
    })
    queue.start()

    await queue.enqueue('flaky', {}, { maxAttempts: 3 })
    await waitFor(() => calls >= 3)
    expect(calls).toBe(3)
  })

  it('stops processing after stop()', async () => {
    const handled: string[] = []
    queue.process(async (job) => {
      handled.push(job.name)
    })
    queue.start()
    queue.stop()

    await queue.enqueue('alpha', {})
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(handled).toEqual([])
  })
})

describe('Worker', () => {
  let queue: InMemoryQueue
  let botManager: BotManager
  let deps: WorkerDeps

  beforeEach(() => {
    queue = new InMemoryQueue()
    botManager = {
      syncRoomByBot: vi.fn(async () => 0),
      pingRoom: vi.fn(async () => {}),
      inviteSpeaker: vi.fn(async () => {}),
      resolveContext: vi.fn(async () => null)
    } as unknown as BotManager
    deps = {
      botManager,
      ai: {
        canRespond: vi.fn(() => ({ respond: false, reason: 'disabled' }))
      } as unknown as AiService
    }
  })

  it('dispatches room-sync jobs to the bot manager', async () => {
    const worker = new Worker(queue, createHandlers(deps))
    worker.start()

    await queue.enqueue(JOB_ROOM_SYNC, { botId: 'bot-1', roomId: 'room-1' })
    await waitFor(() => (botManager.syncRoomByBot as ReturnType<typeof vi.fn>).mock.calls.length === 1)
    expect(botManager.syncRoomByBot).toHaveBeenCalledWith('bot-1', 'room-1')
    worker.stop()
  })

  it('dispatches speaker-invite and ping jobs', async () => {
    const worker = new Worker(queue, createHandlers(deps))
    worker.start()

    await queue.enqueue(JOB_SPEAKER_INVITE, { botId: 'bot-1', roomId: 'room-1', userId: 'u-1' })
    await queue.enqueue(JOB_ACTIVE_PING, { botId: 'bot-1', roomId: 'room-1' })
    await waitFor(() => (botManager.inviteSpeaker as ReturnType<typeof vi.fn>).mock.calls.length === 1)
    expect(botManager.inviteSpeaker).toHaveBeenCalledWith('bot-1', 'room-1', 'u-1')
    expect(botManager.pingRoom).toHaveBeenCalledWith('bot-1', 'room-1')
    worker.stop()
  })

  it('logs and skips unknown jobs', async () => {
    const worker = new Worker(queue, createHandlers(deps))
    worker.start()

    await queue.enqueue('no-such-job', {})
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(botManager.syncRoomByBot).not.toHaveBeenCalled()
    worker.stop()
  })
})
