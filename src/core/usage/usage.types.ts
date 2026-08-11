/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

export type UsageType =
  | 'message_received'
  | 'message_sent'
  | 'ai_request'
  | 'ai_response'
  | 'speaker_invite'
  | 'room_join'
  | 'room_leave'
  | 'automation_triggered'

/**
 * A single usage/telemetry event, stored to enable future billing and basic
 * analytics. Billing is intentionally not implemented yet.
 */
export interface UsageEvent {
  id: string
  tenantId: string
  botId: string
  roomId?: string
  type: UsageType
  timestamp: Date
  meta?: Record<string, unknown>
}

export interface UsageEventCreateInput {
  tenantId: string
  botId: string
  roomId?: string
  type: UsageType
  meta?: Record<string, unknown>
}

export interface UsageCounts {
  messages: number
  aiResponses: number
  aiRequests: number
  users: number
  rooms: number
  speakerInvites: number
  automationActions: number
  errors: number
}

export interface UsageSummary {
  messages: number
  aiResponses: number
  aiRequests: number
  users: number
  rooms: number
  speakerInvites: number
  automationActions: number
  errors: number
}
