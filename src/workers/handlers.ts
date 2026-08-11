/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { QueueJob } from '../infrastructure/queue/queue.js'
import type { BotManager } from '../core/bots/bot-manager.js'
import type { AiService } from '../core/ai/ai.service.js'
import type { CommunityEvent } from '../core/events/event.types.js'
import {
  JOB_ACTIVE_PING,
  JOB_AI_RESPONSE,
  JOB_PROCESS_MESSAGE,
  JOB_ROOM_SYNC,
  JOB_SPEAKER_INVITE,
  type AiResponseJob,
  type ActivePingJob,
  type JobName,
  type ProcessMessageJob,
  type RoomSyncJob,
  type SpeakerInviteJob
} from './jobs.js'
import logger from '../utils/logger.js'

export interface WorkerDeps {
  botManager: BotManager
  ai: AiService
}

export type JobHandler = (job: QueueJob) => Promise<void>

/** Maps job names to their handlers. */
export type JobHandlerMap = Record<JobName, JobHandler>

const asPayload = <T>(job: QueueJob): T => job.data as T

/**
 * Every job must carry an explicit tenant scope. A handler must never invent
 * tenant identity (e.g. `tenantId: ''`): if the context is missing or empty we
 * fail the job so the error surfaces instead of processing under a fabricated
 * tenant.
 */
const requireTenantId = (tenantId: string | undefined): string => {
  if (tenantId == null || tenantId === '') {
    throw new Error('Job is missing required tenantId; refusing to fabricate tenant context')
  }
  return tenantId
}

/** Builds a synthetic event for AI decisions that arrive via the queue. */
const buildEvent = (data: { tenantId: string, botId: string, roomId: string }): CommunityEvent => ({
  id: `job-${Date.now()}`,
  tenantId: requireTenantId(data.tenantId),
  botId: data.botId,
  roomId: data.roomId,
  platform: 'clubhouse',
  type: 'message.created',
  timestamp: new Date(),
  payload: {}
})

/**
 * Wire the worker jobs to the domain services. Each handler resolves the live
 * bot runtime (via BotManager) so jobs operate on real, per-bot adapters.
 */
export const createHandlers = (deps: WorkerDeps): JobHandlerMap => ({
  [JOB_PROCESS_MESSAGE]: async (job) => {
    const data = asPayload<ProcessMessageJob>(job)
    requireTenantId(data.tenantId)
    logger.info('Processing message job', { tenantId: data.tenantId, botId: data.botId, roomId: data.roomId, messageId: data.messageId })
    // Message ingestion is handled by the room sync pipeline; re-syncing the
    // room pulls in and deduplicates the latest messages.
    await deps.botManager.syncRoomByBot(data.botId, data.roomId)
  },

  [JOB_AI_RESPONSE]: async (job) => {
    const data = asPayload<AiResponseJob>(job)
    const event = buildEvent(data) as CommunityEvent<{ userId: string, content: string }>
    event.payload = { userId: data.userId, content: data.content }
    const context = await deps.botManager.resolveContext(event)
    if (context == null) {
      logger.warn('AI response job skipped: no runtime context', { botId: data.botId })
      return
    }
    const decision = deps.ai.canRespond(context.bot, context.room.id, data.content)
    if (!decision.respond) {
      return
    }
    const response = await deps.ai.generateResponse(context.bot, data.userId, data.content)
    await context.sendMessage(response.content)
    deps.ai.markResponded(context.bot, context.room.id)
  },

  [JOB_ACTIVE_PING]: async (job) => {
    const data = asPayload<ActivePingJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.pingRoom(data.botId, data.roomId)
  },

  [JOB_ROOM_SYNC]: async (job) => {
    const data = asPayload<RoomSyncJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.syncRoomByBot(data.botId, data.roomId)
  },

  [JOB_SPEAKER_INVITE]: async (job) => {
    const data = asPayload<SpeakerInviteJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.inviteSpeaker(data.botId, data.roomId, data.userId)
  }
})
