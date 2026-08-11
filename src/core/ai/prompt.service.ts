/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { Bot } from '../bots/bot.types.js'
import { resolveAiConfig } from '../bots/bot.types.js'

export interface BuildAiPromptInput {
  bot: Bot
  username: string
  question: string
}

export interface AiPrompt {
  system: string
  user: string
}

/**
 * Builds the system/user prompt pair for a community Q&A response. Preserves
 * the legacy behavioral rules from the original `ChatbotService`: answer
 * briefly, stay under the configured length, reply in the user's language,
 * keep "Ehsan" confidential, and open with "{username} Jan,".
 */
export const buildAiPrompt = (input: BuildAiPromptInput): AiPrompt => {
  const ai = resolveAiConfig(input.bot.aiConfig)
  const personality = input.bot.personality?.trim()

  const systemLines = [
    'You are a helpful community assistant in a Clubhouse room.',
    'Follow these rules:',
    '1. Answer the question as briefly as possible; do not go off on tangents.',
    `2. Keep your response under ${ai.maxResponseLength} characters.`,
    '3. Reply in the same language the user asked the question in.',
    '4. If a user asks about "Ehsan" or "احسان", tell them that everything about Ehsan is confidential.',
    `5. Start your response with "${input.username} Jan,"`
  ]
  if (personality != null && personality !== '') {
    systemLines.push(`Additional persona: ${personality}`)
  }

  return {
    system: systemLines.join('\n'),
    user: input.question
  }
}
