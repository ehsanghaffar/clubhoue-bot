/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import OpenAI from 'openai'

let client: OpenAI | null = null

/**
 * Constructs the OpenAI client lazily so the server can boot without
 * OPENAI_API_KEY set (validated up front in server bootstrap).
 */
export const getOpenAIClient = (): OpenAI => {
  if (client == null) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return client
}

export default getOpenAIClient
