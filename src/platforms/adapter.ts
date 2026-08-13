/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Message, Platform, Room, User } from '../core/types.js'
import { ClubhouseApiError } from './clubhouse/errors.js'

/**
 * Platform-agnostic adapter contract. Every community platform (Clubhouse now,
 * Discord later) implements this interface.
 */
export interface CommunityPlatformAdapter {
  readonly platform: Platform

  getRoom: (roomId: string) => Promise<Room>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: (roomId: string) => Promise<void>
  getMessages: (roomId: string) => Promise<Message[]>
  sendMessage: (roomId: string, message: string) => Promise<void>
  getUser: (userId: string) => Promise<User>
  searchUsers: (query: string) => Promise<User[]>
  inviteSpeaker: (roomId: string, userId: string) => Promise<void>
  acceptSpeakerInvite: (roomId: string) => Promise<void>
  ping?: (roomId: string) => Promise<void>
}

/** Credential material handed to an adapter factory (already decrypted). */
export interface AdapterCredentialData {
  token: string
  deviceId?: string
  externalAccountId?: string
  externalAccountName?: string
}

export type AdapterFactory = (
  credential: AdapterCredentialData
) => CommunityPlatformAdapter

/**
 * Raised when a platform call fails. Carries normalized retry/auth semantics
 * so runtime layers can react without importing platform internals.
 */
export class AdapterError extends Error {
  readonly cause?: unknown
  readonly retryable: boolean
  readonly authenticationFailure: boolean
  readonly rateLimited: boolean
  readonly status?: number

  constructor (message: string, cause?: unknown) {
    super(message)
    this.name = 'AdapterError'
    this.cause = cause
    if (cause instanceof ClubhouseApiError) {
      this.retryable = cause.retryable
      this.authenticationFailure = cause.authenticationFailure
      this.rateLimited = cause.rateLimited
      this.status = cause.status
    } else {
      this.retryable = false
      this.authenticationFailure = false
      this.rateLimited = false
    }
  }
}

const factories = new Map<Platform, AdapterFactory>()

export const registerAdapterFactory = (platform: Platform, factory: AdapterFactory): void => {
  factories.set(platform, factory)
}

export const createPlatformAdapter = (
  platform: Platform,
  credential: AdapterCredentialData
): CommunityPlatformAdapter => {
  const factory = factories.get(platform)
  if (factory == null) {
    throw new AdapterError(`No adapter registered for platform: ${platform}`)
  }
  return factory(credential)
}
