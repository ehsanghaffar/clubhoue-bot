/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

/** Background job names (see spec §18 worker architecture). */
export const JOB_PROCESS_MESSAGE = 'process-message'
export const JOB_AI_RESPONSE = 'ai-response'
export const JOB_ACTIVE_PING = 'active-ping'
export const JOB_ROOM_SYNC = 'room-sync'
export const JOB_SPEAKER_INVITE = 'speaker-invite'

export type JobName =
  | typeof JOB_PROCESS_MESSAGE
  | typeof JOB_AI_RESPONSE
  | typeof JOB_ACTIVE_PING
  | typeof JOB_ROOM_SYNC
  | typeof JOB_SPEAKER_INVITE

export interface ProcessMessageJob {
  botId: string
  roomId: string
  messageId: string
}

export interface AiResponseJob {
  botId: string
  roomId: string
  messageId: string
  userId: string
  content: string
}

export interface ActivePingJob {
  botId: string
  roomId: string
}

export interface RoomSyncJob {
  botId: string
  roomId: string
}

export interface SpeakerInviteJob {
  botId: string
  roomId: string
  userId: string
}

export interface JobPayloadMap {
  [JOB_PROCESS_MESSAGE]: ProcessMessageJob
  [JOB_AI_RESPONSE]: AiResponseJob
  [JOB_ACTIVE_PING]: ActivePingJob
  [JOB_ROOM_SYNC]: RoomSyncJob
  [JOB_SPEAKER_INVITE]: SpeakerInviteJob
}
