/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import logger from '../../utils/logger.js'

/**
 * Server-side credential encryption using AES-256-GCM.
 *
 * The encryption key comes exclusively from `CREDENTIAL_ENCRYPTION_KEY`:
 *  - a 64-char hex string is used directly as the 32-byte key;
 *  - any other value is stretched to 32 bytes via scrypt;
 *  - if unset (development only) a documented insecure key is used and a
 *    warning is logged. Production must set CREDENTIAL_ENCRYPTION_KEY.
 *
 * Ciphertext envelopes are JSON: `{ v, iv, tag, data }` (all base64). GCM's
 * auth tag makes tampering detectable, so corrupted envelopes throw.
 */

const DEV_ONLY_KEY = 'dev-only-clubhouse-credential-key-2026!!'

let cachedKey: Buffer | null = null

const getEncryptionKey = (): Buffer => {
  if (cachedKey != null) {
    return cachedKey
  }

  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  let key: Buffer
  if (raw == null || raw === '') {
    logger.warn(
      'CREDENTIAL_ENCRYPTION_KEY is not set; using a development-only key. ' +
        'Set CREDENTIAL_ENCRYPTION_KEY in production.'
    )
    key = Buffer.from(DEV_ONLY_KEY, 'utf8')
  } else if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = scryptSync(raw, 'clubhouse-credential-salt', 32)
  }

  cachedKey = key
  return key
}

/** Test helper: clear the cached key between test cases. */
export const resetEncryptionKeyCache = (): void => {
  cachedKey = null
}

interface Envelope {
  v: number
  iv: string
  tag: string
  data: string
}

export const encryptSecret = (plaintext: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const envelope: Envelope = {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  }
  return JSON.stringify(envelope)
}

export const decryptSecret = (envelope: string): string => {
  const parsed: Envelope = JSON.parse(envelope) as Envelope
  if (parsed.v !== 1 || parsed.iv == null || parsed.tag == null || parsed.data == null) {
    throw new Error('Unsupported credential envelope')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(parsed.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ])
  return decrypted.toString('utf8')
}
