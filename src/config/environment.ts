/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
export const REQUIRED_ENV_VARS = [
  'API_KEY',
  'OPENAI_API_KEY',
  'MONGODB_URL',
  'AGORA_KEY',
  'PUBNUB_PUB_KEY',
  'PUBNUB_SUB_KEY'
]

/**
 * Variables required ONLY in production. `CREDENTIAL_ENCRYPTION_KEY` must be
 * set in production so credentials are never encrypted with the known
 * development-only fallback key; losing it makes encrypted credentials
 * unrecoverable, so a missing key must fail startup rather than fall back.
 */
export const PROD_REQUIRED_ENV_VARS = ['CREDENTIAL_ENCRYPTION_KEY']

export const getMissingEnvVars = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name])
  if (env.NODE_ENV === 'production') {
    missing.push(...PROD_REQUIRED_ENV_VARS.filter((name) => !env[name]))
  }
  return missing
}
