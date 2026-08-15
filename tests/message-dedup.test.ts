/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dedupKey,
  InMemoryMessageDeduplicator,
  MongoMessageDeduplicator
} from '../src/infrastructure/deduplication/message-dedup.js'

vi.mock('../src/models/processedMessage.js', () => ({
  ProcessedMessageModel: {
    findOne: vi.fn(),
    create: vi.fn()
  }
}))

import { ProcessedMessageModel } from '../src/models/processedMessage.js'

describe('dedupKey', () => {
  it('formats the storage key as processed:bot:room:message', () => {
    expect(dedupKey('bot-1', 'room-1', 'msg-1')).toBe('processed:bot-1:room-1:msg-1')
  })
})

describe('InMemoryMessageDeduplicator', () => {
  let dedup: InMemoryMessageDeduplicator

  beforeEach(() => {
    dedup = new InMemoryMessageDeduplicator()
  })

  it('reports a message unprocessed before marking', async () => {
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(false)
  })

  it('reports a message processed after marking', async () => {
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1')
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(true)
  })

  it('treats messages in different rooms as distinct', async () => {
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1')
    await expect(dedup.isProcessed('bot-1', 'room-2', 'msg-1')).resolves.toBe(false)
  })

  it('treats messages from different bots as distinct', async () => {
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1')
    await expect(dedup.isProcessed('bot-2', 'room-1', 'msg-1')).resolves.toBe(false)
  })

  it('expires a key once its ttl has passed', async () => {
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1', -1)
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(false)
  })

  it('clear() resets all state', async () => {
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1')
    dedup.clear()
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(false)
  })
})

describe('MongoMessageDeduplicator', () => {
  const findOneMock = vi.mocked(ProcessedMessageModel.findOne)
  const createMock = vi.mocked(ProcessedMessageModel.create)

  beforeEach(() => {
    findOneMock.mockReset()
    createMock.mockReset()
  })

  it('reports unprocessed when no document exists', async () => {
    findOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never)
    const dedup = new MongoMessageDeduplicator()
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(false)
    expect(findOneMock).toHaveBeenCalledWith({ key: 'processed:bot-1:room-1:msg-1' })
  })

  it('reports processed when a document exists', async () => {
    findOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ key: 'processed:bot-1:room-1:msg-1' })
    } as never)
    const dedup = new MongoMessageDeduplicator()
    await expect(dedup.isProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBe(true)
  })

  it('marks processed with a future expiry', async () => {
    createMock.mockResolvedValue({} as never)
    const dedup = new MongoMessageDeduplicator()
    await dedup.markProcessed('bot-1', 'room-1', 'msg-1', 60)
    expect(createMock).toHaveBeenCalledTimes(1)
    const doc = createMock.mock.calls[0][0] as { key: string; expiresAt: Date }
    expect(doc.key).toBe('processed:bot-1:room-1:msg-1')
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('swallows duplicate-key errors from concurrent marking', async () => {
    createMock.mockRejectedValue({ code: 11000 })
    const dedup = new MongoMessageDeduplicator()
    await expect(dedup.markProcessed('bot-1', 'room-1', 'msg-1')).resolves.toBeUndefined()
  })

  it('rethrows non-duplicate errors', async () => {
    createMock.mockRejectedValue(new Error('db down'))
    const dedup = new MongoMessageDeduplicator()
    await expect(dedup.markProcessed('bot-1', 'room-1', 'msg-1')).rejects.toThrow('db down')
  })
})
