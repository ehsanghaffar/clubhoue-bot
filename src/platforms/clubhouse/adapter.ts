/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Message, Room, User } from '../../core/types.js'
import type { Profile } from '../../types/config.js'
import type {
  AdapterCredentialData,
  CommunityPlatformAdapter
} from '../adapter.js'
import { AdapterError } from '../adapter.js'
import agent from './agent.js'
import { ClubApiService } from './api.service.js'
import { mapMessages, mapRoom, mapUser } from './mappers.js'
import type { ClubhouseMessage } from './types.js'
import logger from '../../utils/logger.js'

/**
 * Clubhouse implementation of the platform-agnostic adapter contract. Each
 * instance is bound to a single (decrypted) credential, so one bot can use
 * one Clubhouse identity and every request is scoped to that identity.
 */
export class ClubhouseAdapter implements CommunityPlatformAdapter {
  readonly platform = 'clubhouse' as const
  private readonly api: ClubApiService

  constructor (credential: AdapterCredentialData) {
    const profile: Profile = {
      token: credential.token,
      deviceId: credential.deviceId,
      userId: credential.externalAccountId,
      user: credential.externalAccountName != null
        ? { name: credential.externalAccountName }
        : undefined
    }
    const agentFn = async (url: string, options?: Parameters<typeof agent>[1], customs?: Parameters<typeof agent>[2]): Promise<Response> =>
      await agent(url, options, { ...profile, ...customs })
    this.api = new ClubApiService(profile, agentFn)
  }

  async getRoom (roomId: string): Promise<Room> {
    try {
      const raw = await this.api.getChannel({ channel: roomId })
      return mapRoom(raw)
    } catch (error) {
      throw this.toAdapterError('getRoom', error)
    }
  }

  async joinRoom (roomId: string): Promise<void> {
    try {
      await this.api.joinChannel({ channel: roomId })
    } catch (error) {
      throw this.toAdapterError('joinRoom', error)
    }
  }

  async leaveRoom (roomId: string): Promise<void> {
    try {
      await this.api.leaveChannel({ channel: roomId })
    } catch (error) {
      throw this.toAdapterError('leaveRoom', error)
    }
  }

  async getMessages (roomId: string): Promise<Message[]> {
    try {
      const result = await this.api.getChannelMessages({ channel: roomId })
      const messages = Array.isArray(result.messages) ? result.messages as ClubhouseMessage[] : []
      return mapMessages(messages, roomId)
    } catch (error) {
      throw this.toAdapterError('getMessages', error)
    }
  }

  async sendMessage (roomId: string, message: string): Promise<void> {
    try {
      await this.api.sendChannelMessage({ channel: roomId, message })
    } catch (error) {
      throw this.toAdapterError('sendMessage', error)
    }
  }

  async getUser (userId: string): Promise<User> {
    try {
      const raw = await this.api.getUser({ id: userId })
      return mapUser(raw)
    } catch (error) {
      throw this.toAdapterError('getUser', error)
    }
  }

  async searchUsers (query: string): Promise<User[]> {
    try {
      const result = await this.api.searchUsers(query)
      const users = Array.isArray(result.users) ? result.users as UserResponseLike[] : []
      return users.map(mapUser)
    } catch (error) {
      throw this.toAdapterError('searchUsers', error)
    }
  }

  async inviteSpeaker (roomId: string, userId: string): Promise<void> {
    try {
      await this.api.inviteToSpeakers({ channel: roomId, user_id: userId })
    } catch (error) {
      throw this.toAdapterError('inviteSpeaker', error)
    }
  }

  async acceptSpeakerInvite (roomId: string): Promise<void> {
    try {
      await this.api.acceptSpeakerInvite({ channel: roomId })
    } catch (error) {
      throw this.toAdapterError('acceptSpeakerInvite', error)
    }
  }

  private toAdapterError (op: string, cause: unknown): AdapterError {
    const message = cause instanceof Error ? cause.message : String(cause)
    logger.error(`Clubhouse adapter ${op} failed`, { error: message })
    return new AdapterError(`Clubhouse ${op} failed: ${message}`, cause)
  }
}

// Minimal structural type to avoid importing UserResponse into the adapter's
// public API (keeps platform types isolated).
interface UserResponseLike {
  user_id?: number | string
  name?: string
  username?: string
  photo_url?: string
  bio?: string
  [key: string]: unknown
}
