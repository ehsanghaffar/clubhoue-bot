/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Platform } from '../types.js'

export type CredentialStatus = 'active' | 'invalid' | 'revoked'

/**
 * A bot-owned platform credential. The platform token is never stored in
 * plaintext — only `encryptedToken` (an aes-256-gcm ciphertext envelope) is
 * persisted, and decrypted credentials are never exposed through the API.
 */
export interface BotCredential {
  id: string
  tenantId: string
  botId: string
  platform: Platform
  encryptedToken: string
  externalAccountId?: string
  externalAccountName?: string
  status: CredentialStatus
  createdAt: Date
  updatedAt: Date
}

export interface BotCredentialCreateInput {
  tenantId: string
  botId: string
  platform: Platform
  /** The platform auth token to encrypt. */
  token: string
  /** Optional device identifier required by the platform client. */
  deviceId?: string
  externalAccountId?: string
  externalAccountName?: string
}

/** The decrypted runtime profile a platform adapter needs. */
export interface DecryptedCredential {
  token: string
  deviceId?: string
  externalAccountId?: string
  externalAccountName?: string
}
