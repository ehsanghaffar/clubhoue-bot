/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Legacy `ClubApiService` compatibility-boundary tests (F-06).
 *
 * The legacy `/api` surface uses a process-global `clubService` singleton that
 * is configured exactly once at bootstrap. The acceptance criterion is:
 *
 *   "One request must not mutate runtime state that another request can observe."
 *
 * These tests prove the safe properties that make that hold: per-instance
 * isolation (each instance owns its profile/agent) and no shared mutation under
 * concurrent calls. The modern `/v1` path is separately covered by the v1 API
 * tests and does not depend on this singleton.
 */
import { describe, expect, it } from 'vitest'
import { ClubApiService } from '../src/platforms/clubhouse/api.service.js'
import type { AgentFunction } from '../src/platforms/clubhouse/types.js'
import type { Profile } from '../src/types/config.js'

const makeProfile = (token: string, userId: string): Profile => ({
  token,
  deviceId: 'dev-1',
  userId,
  user: { name: `user-${userId}` }
})

interface Capture {
  url: string
  options: unknown
  customs: Record<string, unknown>
}

const makeAgent = (captured: Capture[]): AgentFunction => {
  return async (url, options, customs) => {
    captured.push({ url, options, customs: customs ?? {} })
    return { json: async () => ({ channels: [] }) } as unknown as Response
  }
}

describe('ClubApiService legacy isolation', () => {
  it('keeps per-instance profile state isolated', async () => {
    const capturedA: Capture[] = []
    const capturedB: Capture[] = []
    const svcA = new ClubApiService(makeProfile('token-A', '1'), makeAgent(capturedA))
    const svcB = new ClubApiService(makeProfile('token-B', '2'), makeAgent(capturedB))

    await svcA.getChannels()
    await svcB.getChannels()

    expect(capturedA[0].customs.token).toBe('token-A')
    expect(capturedB[0].customs.token).toBe('token-B')
    // No cross-talk: B never observed A's profile.
    expect(capturedA[0].customs.userId).not.toBe('2')
    expect(capturedB[0].customs.userId).not.toBe('1')
  })

  it('does not leak a setProfile mutation across instances', async () => {
    const capturedA: Capture[] = []
    const capturedB: Capture[] = []
    const svcA = new ClubApiService(makeProfile('token-A', '1'), makeAgent(capturedA))
    const svcB = new ClubApiService(makeProfile('token-B', '2'), makeAgent(capturedB))

    svcA.setProfile(makeProfile('token-A2', '1'))

    await svcA.getChannels()
    await svcB.getChannels()

    expect(capturedA[0].customs.token).toBe('token-A2')
    expect(capturedB[0].customs.token).toBe('token-B')
  })

  it('does not share state across concurrent requests', async () => {
    const capturedA: Capture[] = []
    const capturedB: Capture[] = []
    const svcA = new ClubApiService(makeProfile('token-A', '1'), makeAgent(capturedA))
    const svcB = new ClubApiService(makeProfile('token-B', '2'), makeAgent(capturedB))

    await Promise.all([svcA.getChannels(), svcB.getChannels()])

    expect(capturedA[0].customs.token).toBe('token-A')
    expect(capturedB[0].customs.token).toBe('token-B')
  })

  it('fails loudly when a service is used without a configured profile/agent', async () => {
    const svc = new ClubApiService()
    await expect(svc.getChannels()).rejects.toThrow(/not configured/i)
  })
})
