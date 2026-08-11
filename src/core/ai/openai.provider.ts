/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type OpenAI from 'openai'
import type { AiCompleteRequest, AiProvider } from './ai.types.js'
import { getOpenAIClient } from '../../services/openai.service.js'

/**
 * OpenAI-backed AI provider. The SDK client is created lazily on first call so
 * importing this module never fails at boot (OPENAI_API_KEY is validated by
 * the server bootstrap).
 */
export class OpenAiProvider implements AiProvider {
  private client: OpenAI | null = null

  private getClient (): OpenAI {
    if (this.client == null) {
      this.client = getOpenAIClient()
    }
    return this.client
  }

  async complete (request: AiCompleteRequest): Promise<string> {
    const result = await this.getClient().chat.completions.create({
      model: request.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt }
      ],
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature
    })
    return result.choices[0]?.message?.content ?? ''
  }
}
