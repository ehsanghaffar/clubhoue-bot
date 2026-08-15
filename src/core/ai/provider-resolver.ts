/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AiProvider } from './ai.types.js'
import { OpenAiProvider } from './openai.provider.js'
import { OpenAiCompatibleProvider } from './openai-compatible.provider.js'

export type AiProviderKind = 'openai' | 'openai-compatible'

export interface AiProviderResolver {
  resolve: () => AiProvider
}

/**
 * Infrastructure-level provider selection. Core AI services depend only on
 * `AiProvider`; they never import concrete provider classes directly.
 */
export class EnvAiProviderResolver implements AiProviderResolver {
  resolve (): AiProvider {
    const kind = (process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase() as AiProviderKind
    switch (kind) {
      case 'openai-compatible':
        return new OpenAiCompatibleProvider({
          baseUrl: process.env.AI_BASE_URL,
          apiKey: process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY,
          defaultModel: process.env.AI_MODEL
        })
      case 'openai':
      default:
        return new OpenAiProvider()
    }
  }
}

export const aiProviderResolver: AiProviderResolver = new EnvAiProviderResolver()
