/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Message, Platform, Room, User } from '../core/types.js'

/**
 * Platform-agnostic adapter contract. Every community platform (Clubhouse now,
 * Discord later) implements this interface. The core domain (bots, rooms,
 * events, automation, AI) depends only on this interface — never on a
 * platform-specific API.
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
 * Raised when a platform call fails (network error, non-2xx, invalid token).
 * Adapter errors are typed so the automation/worker layers can react
 * (e.g. mark the credential invalid) without knowing platform internals.
 */
export class AdapterError extends Error {
  public readonly cause?: unknown

  constructor (message: string, cause?: unknown) {
    super(message)
    this.name = 'AdapterError'
    this.cause = cause
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
