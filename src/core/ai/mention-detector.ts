/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

export interface MentionIdentity {
  externalAccountId: string
  externalAccountName?: string
}

export interface MentionInput {
  content: string
  /** Structured mention user ids from the platform, when available. */
  mentionedUserIds?: string[]
}

const normalizeText = (value: string): string => value
  .normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .trim()
  .replace(/\s+/g, ' ')

const normalizeUsername = (value: string): string =>
  normalizeText(value).toLowerCase()

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Detects whether a message mentions the bot using platform identity — never
 * the internal product label (`bot.name`).
 *
 * Priority:
 * 1. Structured mention user id match (authoritative)
 * 2. Token-bound @username match (case-insensitive)
 */
export class MentionDetector {
  isMentioned (input: MentionInput, identity: MentionIdentity): boolean {
    if (identity.externalAccountId === '') {
      return false
    }

    const mentionedIds = input.mentionedUserIds ?? []
    if (mentionedIds.some((id) => String(id) === identity.externalAccountId)) {
      return true
    }

    const username = identity.externalAccountName?.trim()
    if (username == null || username === '') {
      return false
    }

    return this.textContainsUsernameMention(input.content, username)
  }

  private textContainsUsernameMention (content: string, username: string): boolean {
    const normalizedContent = normalizeText(content)
    const normalizedUsername = normalizeUsername(username)
    if (normalizedUsername === '') {
      return false
    }

    // @username must be a token with word boundaries — @helper must not match @helper123.
    const pattern = new RegExp(`@${escapeRegex(normalizedUsername)}(?![\\w])`, 'iu')
    return pattern.test(normalizedContent)
  }
}

export const mentionDetector = new MentionDetector()
