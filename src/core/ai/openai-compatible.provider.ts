/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import OpenAI, { APIError } from 'openai'
import type { AiCompleteRequest, AiProvider } from './ai.types.js'
import { isTransientError } from './openai.provider.js'
import logger from '../../utils/logger.js'

const REQUEST_TIMEOUT_MS = 25_000
const MAX_ATTEMPTS = 2
const RETRY_BASE_DELAY_MS = 1_000

const delay = async (ms: number): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, ms)) }

export interface OpenAiCompatibleProviderConfig {
  baseUrl?: string
  apiKey?: string
  defaultModel?: string
}

/**
 * OpenAI-compatible provider using the official SDK with a custom base URL.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly client: OpenAI
  private readonly defaultModel?: string

  constructor (config: OpenAiCompatibleProviderConfig = {}) {
    const apiKey = config.apiKey ?? process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
    this.client = new OpenAI({
      apiKey,
      baseURL: config.baseUrl ?? process.env.AI_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS
    })
    this.defaultModel = config.defaultModel ?? process.env.AI_MODEL
  }

  async complete (request: AiCompleteRequest): Promise<string> {
    let lastError: unknown
    const model = request.model || this.defaultModel || 'gpt-4o-mini'

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt }
          ],
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature
        }, { timeout: REQUEST_TIMEOUT_MS })
        return result.choices[0]?.message?.content ?? ''
      } catch (error) {
        lastError = error
        const transient = isTransientError(error)
        const status = error instanceof APIError ? error.status : undefined
        logger.error('AI compatible provider request failed', {
          attempt,
          maxAttempts: MAX_ATTEMPTS,
          transient,
          status,
          retryable: transient && attempt < MAX_ATTEMPTS
        })
        if (transient && attempt < MAX_ATTEMPTS) {
          await delay(RETRY_BASE_DELAY_MS * attempt)
          continue
        }
        break
      }
    }

    logger.error('AI compatible provider exhausted retries or permanent failure', {
      maxAttempts: MAX_ATTEMPTS,
      permanent: !isTransientError(lastError)
    })
    return ''
  }
}
