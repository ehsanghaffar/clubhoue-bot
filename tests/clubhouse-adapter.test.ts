/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Clubhouse adapter tests use a mocked HTTP transport (`agent`) so they never
 * touch the live Clubhouse API (spec §25: platform tests must be offline).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClubhouseAdapter } from '../src/platforms/clubhouse/adapter.js'
import { AdapterError } from '../src/platforms/adapter.js'

vi.mock('../src/platforms/clubhouse/agent.js', () => ({
  default: vi.fn()
}))

import agent from '../src/platforms/clubhouse/agent.js'
const agentMock = vi.mocked(agent)

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })

const makeAdapter = (): ClubhouseAdapter =>
  new ClubhouseAdapter({
    token: 'tok-123',
    deviceId: 'device-1',
    externalAccountId: 'ext-1',
    externalAccountName: 'Sara'
  })

describe('ClubhouseAdapter', () => {
  beforeEach(() => {
    agentMock.mockReset()
  })

  it('getRoom maps the channel response to a normalized Room', async () => {
    agentMock.mockResolvedValue(jsonResponse({ channel: 'ch_abc', topic: 'Room Topic', is_active: true }))
    const adapter = makeAdapter()
    const room = await adapter.getRoom('ch_abc')
    expect(room).toEqual({
      id: 'ch_abc',
      platform: 'clubhouse',
      title: 'Room Topic',
      description: undefined,
      status: 'active'
    })
    expect(agentMock).toHaveBeenCalledWith(
      '/get_channel',
      { body: { channel: 'ch_abc' } },
      expect.objectContaining({ token: 'tok-123', userId: 'ext-1' })
    )
  })

  it('joinRoom calls the join_channel endpoint', async () => {
    agentMock.mockResolvedValue(jsonResponse({ success: true }))
    const adapter = makeAdapter()
    await adapter.joinRoom('ch_abc')
    expect(agentMock).toHaveBeenCalledWith(
      '/join_channel',
      { body: expect.objectContaining({ channel: 'ch_abc' }) },
      expect.objectContaining({ token: 'tok-123' })
    )
  })

  it('leaveRoom calls the leave_channel endpoint', async () => {
    agentMock.mockResolvedValue(jsonResponse({ success: true }))
    const adapter = makeAdapter()
    await adapter.leaveRoom('ch_abc')
    expect(agentMock).toHaveBeenCalledWith(
      '/leave_channel',
      { body: { channel: 'ch_abc' } },
      expect.objectContaining({ token: 'tok-123' })
    )
  })

  it('sendMessage calls the send_channel_message endpoint with the message', async () => {
    agentMock.mockResolvedValue(jsonResponse({ message_id: 'm1' }))
    const adapter = makeAdapter()
    await adapter.sendMessage('ch_abc', 'Hello there')
    expect(agentMock).toHaveBeenCalledWith(
      '/send_channel_message',
      { body: { channel: 'ch_abc', message: 'Hello there' } },
      expect.objectContaining({ token: 'tok-123' })
    )
  })

  it('getMessages normalizes raw messages', async () => {
    agentMock.mockResolvedValue(jsonResponse({
      messages: [
        { message_id: 'm1', user_profile: { user_id: 'u1' }, message: 'Hello', time_created: 1700000000 }
      ]
    }))
    const adapter = makeAdapter()
    const messages = await adapter.getMessages('ch_abc')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      id: 'm1',
      roomId: 'ch_abc',
      userId: 'u1',
      content: 'Hello'
    })
    expect(messages[0].timestamp).toEqual(new Date(1700000000 * 1000))
  })

  it('getUser maps the profile response to a User', async () => {
    agentMock.mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'sara', name: 'Sara' }))
    const adapter = makeAdapter()
    const user = await adapter.getUser('u1')
    expect(user).toEqual({ id: 'u1', platform: 'clubhouse', username: 'sara', displayName: 'Sara' })
  })

  it('searchUsers maps each result to a User', async () => {
    agentMock.mockResolvedValue(jsonResponse({
      users: [
        { user_id: 'u1', username: 'sara', name: 'Sara' },
        { user_id: 'u2', username: 'john', name: 'John' }
      ]
    }))
    const adapter = makeAdapter()
    const users = await adapter.searchUsers('sa')
    expect(users).toHaveLength(2)
    expect(users[0]).toEqual({ id: 'u1', platform: 'clubhouse', username: 'sara', displayName: 'Sara' })
    expect(users[1]).toEqual({ id: 'u2', platform: 'clubhouse', username: 'john', displayName: 'John' })
  })

  it('inviteSpeaker calls the invite_speaker endpoint', async () => {
    agentMock.mockResolvedValue(jsonResponse({ success: true }))
    const adapter = makeAdapter()
    await adapter.inviteSpeaker('ch_abc', 'u1')
    expect(agentMock).toHaveBeenCalledWith(
      '/invite_speaker',
      { body: { channel: 'ch_abc', user_id: 'u1' } },
      expect.objectContaining({ token: 'tok-123' })
    )
  })

  it('acceptSpeakerInvite calls the accept_speaker_invite endpoint', async () => {
    agentMock.mockResolvedValue(jsonResponse({ success: true }))
    const adapter = makeAdapter()
    await adapter.acceptSpeakerInvite('ch_abc')
    expect(agentMock).toHaveBeenCalledWith(
      '/accept_speaker_invite',
      { body: { channel: 'ch_abc' } },
      expect.objectContaining({ token: 'tok-123' })
    )
  })

  it('wraps platform failures in AdapterError', async () => {
    agentMock.mockRejectedValue(new Error('network down'))
    const adapter = makeAdapter()
    await expect(adapter.getRoom('ch_abc')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.joinRoom('ch_abc')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.leaveRoom('ch_abc')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.getMessages('ch_abc')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.sendMessage('ch_abc', 'hi')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.getUser('u1')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.searchUsers('sa')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.inviteSpeaker('ch_abc', 'u1')).rejects.toBeInstanceOf(AdapterError)
    await expect(adapter.acceptSpeakerInvite('ch_abc')).rejects.toBeInstanceOf(AdapterError)
  })
})
