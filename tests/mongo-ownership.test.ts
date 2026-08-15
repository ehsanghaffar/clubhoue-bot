/**
 * @license
 * @copyright Ehsanghaffarii.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { spawnSync } from 'node:child_process'
import net from 'node:net'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import {
  MongoActionIdempotencyStore,
  buildActionKey,
  MAX_ACTION_ATTEMPTS,
  type ActionClaim,
  type ActionClaimMetadata
} from '../src/core/events/action-idempotency.js'
import { ActionRecordModel } from '../src/models/actionRecord.js'
import { MongoEventStore } from '../src/core/events/event-store.impl.js'
import { CommunityEventModel } from '../src/models/communityEvent.js'
import { MAX_EVENT_ATTEMPTS } from '../src/core/events/event-store.js'
import type { CommunityEvent } from '../src/core/events/event.types.js'

/**
 * These ownership regression tests run against a REAL MongoDB. The in-memory
 * stores cannot prove server-side atomicity, so they are deliberately not used
 * here. The database is provided by (in order):
 *   1. `MONGODB_TEST_URL` if set,
 *   2. a local mongod already listening on 127.0.0.1:27017,
 *   3. a disposable `mongo:6` Docker container started for the test run.
 * All tests are scoped to the dedicated `clubhouse_ownership_test` database so
 * they can never touch development data.
 */
describe('Mongo-backed claim ownership', () => {
  let spawnedContainer: string | null = null
  let connected = false

  const TEST_DB = 'clubhouse_ownership_test'

  const waitForTcp = async (port: number, timeoutMs: number): Promise<void> => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const opened = await new Promise<boolean>((resolve) => {
        const socket = net.connect({ port, host: '127.0.0.1' })
        socket.once('connect', () => {
          socket.end()
          resolve(true)
        })
        socket.once('error', () => {
          socket.destroy()
          resolve(false)
        })
      })
      if (opened) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`MongoDB did not open port ${port} within ${timeoutMs}ms`)
  }

  const freePort = async (): Promise<number> => {
    const server = net.createServer()
    const port = await new Promise<number>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (address == null || typeof address === 'string') {
          server.close()
          reject(new Error('failed to allocate a free port'))
          return
        }
        resolve(address.port)
      })
      server.on('error', reject)
    })
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err == null ? resolve() : reject(err)))
    })
    return port
  }

  const tryConnect = async (uri: string): Promise<boolean> => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 })
      return mongoose.connection.readyState === 1
    } catch {
      await mongoose.disconnect().catch(() => {})
      return false
    }
  }

  const connectWithRetry = async (uri: string, timeoutMs: number): Promise<void> => {
    const deadline = Date.now() + timeoutMs
    let lastError: unknown
    while (Date.now() < deadline) {
      if (await tryConnect(uri)) {
        return
      }
      lastError = new Error(`unreachable: ${uri}`)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw lastError
  }

  beforeAll(async () => {
    const explicit = process.env.MONGODB_TEST_URL
    if (explicit != null && explicit !== '') {
      if (await tryConnect(explicit)) {
        connected = true
        return
      }
      throw new Error(`MONGODB_TEST_URL is not reachable: ${explicit}`)
    }

    const local = `mongodb://127.0.0.1:27017/${TEST_DB}`
    if (await tryConnect(local)) {
      connected = true
      return
    }

    const port = await freePort()
    const container = `cl-api-mongo-test-${process.pid}`
    spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
    const run = spawnSync(
      'docker',
      ['run', '-d', '--rm', '--name', container, '-p', `${port}:27017`, 'mongo:6'],
      { encoding: 'utf8' }
    )
    if (run.status !== 0) {
      throw new Error(
        `failed to start test MongoDB container (set MONGODB_TEST_URL to use an existing instance): ${run.stderr ?? run.stdout}`
      )
    }
    spawnedContainer = container
    await waitForTcp(port, 60_000)
    await connectWithRetry(`mongodb://127.0.0.1:${port}/${TEST_DB}`, 45_000)
    connected = true
  }, 180_000)

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {})
    if (spawnedContainer != null) {
      spawnSync('docker', ['rm', '-f', spawnedContainer], { stdio: 'ignore' })
      spawnedContainer = null
    }
    connected = false
  }, 60_000)

  beforeEach(async () => {
    if (!connected) {
      throw new Error('mongo setup did not complete')
    }
    await ActionRecordModel.deleteMany({})
    await CommunityEventModel.deleteMany({})
  })

  const claimIdOf = (claim: ActionClaim): string => {
    if (!claim.acquired) {
      throw new Error('expected an acquired claim')
    }
    return claim.claimId
  }

  const eventClaimIdOf = (claim: { claimed: boolean, claimId?: string }): string => {
    if (!claim.claimed || claim.claimId == null) {
      throw new Error('expected an acquired event claim')
    }
    return claim.claimId
  }

  const makeEvent = (id: string, tenantId = 'tenant-1'): CommunityEvent<unknown> => ({
    id,
    tenantId,
    botId: 'bot-1',
    roomId: 'room-1',
    platform: 'clubhouse',
    type: 'message.created',
    timestamp: new Date(),
    payload: {}
  })

  describe('action idempotency store', () => {
    let store: MongoActionIdempotencyStore
    const metadata: ActionClaimMetadata = {
      actionType: 'welcome',
      ruleId: 'rule-1',
      eventId: 'evt-1',
      botId: 'bot-1',
      roomId: 'room-1'
    }

    beforeEach(() => {
      store = new MongoActionIdempotencyStore()
    })

    const key = buildActionKey('tenant-1', 'evt-1', 'rule-1', 'welcome')

    const expireLease = async (): Promise<void> => {
      await ActionRecordModel.updateOne(
        { _id: key },
        { $set: { leaseUntil: new Date(Date.now() - 1000) } }
      )
    }

    it('exactly one of 50 concurrent claims acquires the action', async () => {
      const results = await Promise.all(
        Array.from({ length: 50 }, () => store.claim('tenant-1', key, metadata))
      )
      const winners = results.filter((r): r is { acquired: true, claimId: string } => r.acquired)
      expect(winners).toHaveLength(1)
      expect(winners[0].claimId).toBeTypeOf('string')
      expect(results.filter((r) => !r.acquired)).toHaveLength(49)
    })

    it('reclaims an expired lease and prevents the stale owner from marking executed', async () => {
      const claimA = claimIdOf(await store.claim('tenant-1', key, metadata))
      await expireLease()

      const claimB = await store.claim('tenant-1', key, metadata)
      expect(claimB.acquired).toBe(true)
      const claimBId = claimIdOf(claimB)
      expect(claimBId).not.toBe(claimA)

      await store.markExecuted('tenant-1', key, claimA)
      const doc = await ActionRecordModel.findById(key).lean()
      expect(doc?.status).toBe('processing')
      expect(doc?.claimId).toBe(claimBId)

      await store.markExecuted('tenant-1', key, claimBId)
      const done = await ActionRecordModel.findById(key).lean()
      expect(done?.status).toBe('executed')
    })

    it('stale owner cannot return a reclaimed action to failed or pending', async () => {
      const claimA = claimIdOf(await store.claim('tenant-1', key, metadata))
      await expireLease()

      const claimBId = claimIdOf(await store.claim('tenant-1', key, metadata))

      await store.markFailed('tenant-1', key, claimA, 'stale failure')
      const doc = await ActionRecordModel.findById(key).lean()
      expect(doc?.status).toBe('processing')
      expect(doc?.claimId).toBe(claimBId)

      await store.markFailed('tenant-1', key, claimBId, 'real failure')
      const after = await ActionRecordModel.findById(key).lean()
      expect(after?.status).toBe('pending')
      expect(after?.error).toBe('real failure')
    })

    it('stale owner cannot release a reclaimed action', async () => {
      const claimA = claimIdOf(await store.claim('tenant-1', key, metadata))
      await expireLease()

      const claimBId = claimIdOf(await store.claim('tenant-1', key, metadata))

      await store.release('tenant-1', key, claimA)
      const doc = await ActionRecordModel.findById(key).lean()
      expect(doc?.status).toBe('processing')
      expect(doc?.claimId).toBe(claimBId)

      await store.release('tenant-1', key, claimBId)
      const released = await ActionRecordModel.findById(key).lean()
      expect(released?.status).toBe('pending')
    })

    it('preserves existing behavior: executed actions cannot be reclaimed', async () => {
      const claimA = claimIdOf(await store.claim('tenant-1', key, metadata))
      await store.markExecuted('tenant-1', key, claimA)

      const reclaim = await store.claim('tenant-1', key, metadata)
      expect(reclaim.acquired).toBe(false)
      if (!reclaim.acquired) {
        expect(reclaim.reason).toBe('executed')
      }
    })

    it('preserves the retry budget: failed actions retry until the budget is spent, then are terminal', async () => {
      for (let i = 1; i <= MAX_ACTION_ATTEMPTS; i++) {
        const claim = await store.claim('tenant-1', key, metadata)
        expect(claim.acquired).toBe(true)
        await store.markFailed('tenant-1', key, claimIdOf(claim), `fail-${i}`)
      }

      const doc = await ActionRecordModel.findById(key).lean()
      expect(doc?.status).toBe('failed')
      expect(doc?.attempts).toBe(MAX_ACTION_ATTEMPTS)

      const reclaim = await store.claim('tenant-1', key, metadata)
      expect(reclaim.acquired).toBe(false)
    })

    it('different action keys are independent', async () => {
      const otherKey = buildActionKey('tenant-1', 'evt-2', 'rule-1', 'welcome')
      const claim1 = claimIdOf(await store.claim('tenant-1', key, metadata))
      await store.markExecuted('tenant-1', key, claim1)

      const claim2 = await store.claim('tenant-1', otherKey, metadata)
      expect(claim2.acquired).toBe(true)
      await store.markExecuted('tenant-1', otherKey, claimIdOf(claim2))

      const done = await ActionRecordModel.findById(otherKey).lean()
      expect(done?.status).toBe('executed')
    })
  })

  describe('event store', () => {
    let store: MongoEventStore

    beforeEach(() => {
      store = new MongoEventStore()
    })

    const staleProcessing = async (): Promise<void> => {
      // timestamps:false prevents mongoose from overwriting our manual value.
      await CommunityEventModel.updateOne(
        { _id: 'evt-1' },
        { $set: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) } },
        { timestamps: false }
      )
    }

    it('exactly one of 50 concurrent claims acquires the event', async () => {
      await store.persist(makeEvent('evt-1'))
      const results = await Promise.all(
        Array.from({ length: 50 }, () => store.claim('evt-1', 'tenant-1'))
      )
      expect(results.filter((r) => r.claimed)).toHaveLength(1)
      expect(results.filter((r) => !r.claimed)).toHaveLength(49)
    })

    it('reclaims a stale processing event and blocks the stale owner from marking processed', async () => {
      await store.persist(makeEvent('evt-1'))
      const claimA = eventClaimIdOf(await store.claim('evt-1', 'tenant-1'))
      await staleProcessing()

      const claimB = eventClaimIdOf(await store.claim('evt-1', 'tenant-1'))
      expect(claimB).not.toBe(claimA)

      await store.markProcessed('evt-1', 'tenant-1', claimA)
      const doc = await CommunityEventModel.findById('evt-1').lean()
      expect(doc?.status).toBe('processing')
      expect(doc?.claimId).toBe(claimB)

      await store.markProcessed('evt-1', 'tenant-1', claimB)
      const done = await CommunityEventModel.findById('evt-1').lean()
      expect(done?.status).toBe('processed')
    })

    it('stale owner cannot move a reclaimed event back to pending or failed', async () => {
      await store.persist(makeEvent('evt-1'))
      const claimA = eventClaimIdOf(await store.claim('evt-1', 'tenant-1'))
      await staleProcessing()

      const claimB = eventClaimIdOf(await store.claim('evt-1', 'tenant-1'))

      await store.markFailed('evt-1', 'tenant-1', claimA, 'stale failure')
      const doc = await CommunityEventModel.findById('evt-1').lean()
      expect(doc?.status).toBe('processing')
      expect(doc?.claimId).toBe(claimB)

      await store.markFailed('evt-1', 'tenant-1', claimB, 'real failure')
      const after = await CommunityEventModel.findById('evt-1').lean()
      expect(after?.status).toBe('pending')
      expect(after?.attempts).toBe(2)
    })

    it('attempts increment exactly once per claim, never on markFailed', async () => {
      await store.persist(makeEvent('evt-1'))
      const claim1 = eventClaimIdOf(await store.claim('evt-1', 'tenant-1'))
      await store.markFailed('evt-1', 'tenant-1', claim1, 'boom')
      expect((await CommunityEventModel.findById('evt-1').lean())?.attempts).toBe(1)
    })

    it('preserves the bounded retry budget unchanged', async () => {
      await store.persist(makeEvent('evt-1'))
      for (let i = 1; i <= MAX_EVENT_ATTEMPTS; i++) {
        const claim = await store.claim('evt-1', 'tenant-1')
        expect(claim.claimed).toBe(true)
        await store.markFailed('evt-1', 'tenant-1', eventClaimIdOf(claim), `fail-${i}`)
      }

      const doc = await CommunityEventModel.findById('evt-1').lean()
      expect(doc?.status).toBe('failed')
      expect(doc?.attempts).toBe(MAX_EVENT_ATTEMPTS)

      const reclaim = await store.claim('evt-1', 'tenant-1')
      expect(reclaim.claimed).toBe(false)
    })
  })
})
