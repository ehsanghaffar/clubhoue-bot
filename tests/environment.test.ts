/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { describe, it, expect } from 'vitest'
import { REQUIRED_ENV_VARS, getMissingEnvVars } from '../src/config/environment.js'

describe('getMissingEnvVars', () => {
  const fullEnv = Object.fromEntries(REQUIRED_ENV_VARS.map((name) => [name, 'set']))

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