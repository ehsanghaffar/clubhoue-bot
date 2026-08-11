/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  decryptSecret,
  encryptSecret,
  resetEncryptionKeyCache
} from '../src/core/credentials/credential-encryption.js'

describe('credential-encryption (aes-256-gcm)', () => {
  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64) // 32-byte hex key
    resetEncryptionKeyCache()
  })

  afterEach(() => {
    delete process.env.CREDENTIAL_ENCRYPTION_KEY
    resetEncryptionKeyCache()
  })

  it('round-trips a secret', () => {
    const secret = 'T0P-SECRET-TOKEN-1234567890'
    const envelope = encryptSecret(secret)
    expect(envelope).not.toContain(secret)
    expect(decryptSecret(envelope)).toBe(secret)
  })

  it('produces unique ciphertext per call (randomized iv)', () => {
    const a = encryptSecret('same-value')
    const b = encryptSecret('same-value')
    expect(a).not.toBe(b)
  })

  it('does not leak the plaintext in the envelope', () => {
    const secret = 'leak-check-super-secret-value'
    const envelope = encryptSecret(secret)
    expect(envelope).not.toContain('leak-check')
  })

  it('throws when the envelope is tampered with', () => {
    const envelope = encryptSecret('tamper-me')
    const parsed = JSON.parse(envelope) as { data: string }
    parsed.data = Buffer.from('tampered-bytes').toString('base64')
    expect(() => decryptSecret(JSON.stringify(parsed))).toThrow()
  })

  it('throws on malformed envelopes', () => {
    expect(() => decryptSecret('not-json')).toThrow()
  })

  it('fails to decrypt with a different key', () => {
    const envelope = encryptSecret('cross-key-check')
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'b'.repeat(64)
    resetEncryptionKeyCache()
    expect(() => decryptSecret(envelope)).toThrow()
  })
})
