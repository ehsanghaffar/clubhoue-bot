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
export type JobHandlerMap = Record<JobName, JobHandler>

const asPayload = <T>(job: QueueJob): T => job.data as T

const requireTenantId = (tenantId: string | undefined): string => {
  if (tenantId == null || tenantId === '') {
    throw new Error('Job is missing required tenantId; refusing to fabricate tenant context')
  }
  return tenantId
}

const buildEvent = (data: { tenantId: string, botId: string, roomId: string, messageId?: string }): CommunityEvent => ({
  id: data.messageId != null ? `job:${data.messageId}` : `job:${data.botId}:${data.roomId}`,
  tenantId: requireTenantId(data.tenantId),
  botId: data.botId,
  roomId: data.roomId,
  platform: 'clubhouse',
  type: 'message.created',
  timestamp: new Date(),
  payload: {}
})

export const createHandlers = (deps: WorkerDeps): JobHandlerMap => ({
  [JOB_PROCESS_MESSAGE]: async (job) => {
    const data = asPayload<ProcessMessageJob>(job)
    requireTenantId(data.tenantId)
    logger.info('Processing message job', { tenantId: data.tenantId, botId: data.botId, roomId: data.roomId, messageId: data.messageId })
    await deps.botManager.syncRoom({
      tenantId: data.tenantId,
      botId: data.botId,
      roomId: data.roomId
    })
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
    const decision = deps.ai.canRespond(context.bot, {
      tenantId: data.tenantId,
      roomId: context.room.id,
      userId: data.userId,
      mentionIdentity: {
        externalAccountId: context.botUserId ?? '',
        externalAccountName: context.externalAccountName
      },
      mentionInput: { content: data.content }
    })
    if (!decision.respond) {
      return
    }
    const response = await deps.ai.generateResponse(context.bot, data.userId, data.content)
    await context.sendMessage(response.content)
    deps.ai.markResponded(data.tenantId, context.bot.id, context.room.id, data.userId)
  },

  [JOB_ACTIVE_PING]: async (job) => {
    const data = asPayload<ActivePingJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.pingRoom({
      tenantId: data.tenantId,
      botId: data.botId,
      roomId: data.roomId
    })
  },

  [JOB_ROOM_SYNC]: async (job) => {
    const data = asPayload<RoomSyncJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.syncRoom({
      tenantId: data.tenantId,
      botId: data.botId,
      roomId: data.roomId
    })
  },

  [JOB_SPEAKER_INVITE]: async (job) => {
    const data = asPayload<SpeakerInviteJob>(job)
    requireTenantId(data.tenantId)
    await deps.botManager.inviteSpeaker({
      tenantId: data.tenantId,
      botId: data.botId,
      roomId: data.roomId,
      userId: data.userId
    })
  }
})
