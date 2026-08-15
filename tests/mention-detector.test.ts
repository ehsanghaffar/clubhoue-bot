/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, expect, it } from 'vitest'
import { MentionDetector } from '../src/core/ai/mention-detector.js'

describe('MentionDetector', () => {
  const detector = new MentionDetector()
  const identity = { externalAccountId: 'ext-99', externalAccountName: 'helper' }

  it('triggers on @exact_username', () => {
    expect(detector.isMentioned({ content: '@helper can you help?' }, identity)).toBe(true)
  })

  it('triggers case-insensitively on @username', () => {
    expect(detector.isMentioned({ content: 'hey @HELPER please' }, identity)).toBe(true)
  })

  it('does not trigger on display name without @', () => {
    expect(detector.isMentioned({ content: 'My Bot is great today' }, identity)).toBe(false)
  })

  it('does not trigger on username without @ in mention-only textual fallback', () => {
    expect(detector.isMentioned({ content: 'helper please respond' }, identity)).toBe(false)
  })

  it('does not trigger @username123 when bot username is username', () => {
    expect(detector.isMentioned({ content: '@helper123 ping' }, identity)).toBe(false)
  })

  it('triggers on structured mention user id match', () => {
    expect(detector.isMentioned({
      content: 'ping',
      mentionedUserIds: ['ext-99']
    }, identity)).toBe(true)
  })

  it('does not trigger structured mention of another user', () => {
    expect(detector.isMentioned({
      content: 'ping',
      mentionedUserIds: ['other-user']
    }, identity)).toBe(false)
  })

  it('triggers with Persian surrounding text + @username', () => {
    expect(detector.isMentioned({ content: 'سلام @helper لطفاً کمک کن' }, identity)).toBe(true)
  })
})
