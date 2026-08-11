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

export const getMissingEnvVars = (env: NodeJS.ProcessEnv = process.env): string[] =>
  REQUIRED_ENV_VARS.filter((name) => !env[name])
