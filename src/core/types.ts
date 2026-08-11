/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/**
 * Normalized, platform-agnostic domain types. Platform-specific response
 * shapes (e.g. Clubhouse) are mapped into these types inside platform adapters
 * so the core domain never depends on a single provider's API.
 */

/** Supported community platforms. Discord will be added later. */
export type Platform = 'clubhouse'

/** Normalized room/channel representation across platforms. */
export interface Room {
  id: string
  platform: Platform
  title?: string
  description?: string
  status?: string
}

/** Normalized user representation across platforms. */
export interface User {
  id: string
  platform: Platform
  username?: string
  displayName?: string
}

/** Normalized chat message representation across platforms. */
export interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  timestamp: Date
}
