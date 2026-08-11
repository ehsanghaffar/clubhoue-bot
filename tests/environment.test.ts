/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect } from 'vitest'
import { REQUIRED_ENV_VARS, PROD_REQUIRED_ENV_VARS, getMissingEnvVars } from '../src/config/environment.js'

const fullEnv = Object.fromEntries(REQUIRED_ENV_VARS.map((name) => [name, 'set']))

describe('getMissingEnvVars', () => {
  it('reports nothing when every required variable is set', () => {
    expect(getMissingEnvVars({ ...fullEnv })).toEqual([])
  })

  it('reports all missing variables', () => {
    const missing = getMissingEnvVars({})
    expect(missing).toEqual(REQUIRED_ENV_VARS)
  })

  it('reports only the variables that are missing', () => {
    expect(getMissingEnvVars({ API_KEY: 'set', MONGODB_URL: 'set' })).toEqual(
      REQUIRED_ENV_VARS.filter((name) => name !== 'API_KEY' && name !== 'MONGODB_URL')
    )
  })

  it('treats empty-string values as missing', () => {
    expect(getMissingEnvVars({ API_KEY: '' })).toContain('API_KEY')
  })
})

describe('production credential encryption key requirement (F-05)', () => {
  const prodBase = { NODE_ENV: 'production', ...fullEnv }

  it('does not require CREDENTIAL_ENCRYPTION_KEY outside production', () => {
    expect(getMissingEnvVars({ NODE_ENV: 'development', ...fullEnv })).not.toContain('CREDENTIAL_ENCRYPTION_KEY')
    expect(getMissingEnvVars({ ...fullEnv })).not.toContain('CREDENTIAL_ENCRYPTION_KEY')
  })

  it('fails production startup when CREDENTIAL_ENCRYPTION_KEY is missing', () => {
    expect(getMissingEnvVars({ ...prodBase })).toContain('CREDENTIAL_ENCRYPTION_KEY')
  })

  it('fails production startup when CREDENTIAL_ENCRYPTION_KEY is empty', () => {
    expect(getMissingEnvVars({ ...prodBase, CREDENTIAL_ENCRYPTION_KEY: '' })).toContain('CREDENTIAL_ENCRYPTION_KEY')
  })

  it('passes production when CREDENTIAL_ENCRYPTION_KEY is set', () => {
    expect(getMissingEnvVars({ ...prodBase, CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(64) })).not.toContain('CREDENTIAL_ENCRYPTION_KEY')
  })

  it('keeps the production-only list explicit', () => {
    expect(PROD_REQUIRED_ENV_VARS).toEqual(['CREDENTIAL_ENCRYPTION_KEY'])
  })
})