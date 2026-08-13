/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AutomationActionResult, AutomationRule, RuleContext } from '../automation.types.js'
import type { CommunityEvent, MessageCreatedPayload } from '../../events/event.types.js'
import type { ActionIdempotencyStore } from '../../events/action-idempotency.js'
import { buildActionKey } from '../../events/action-idempotency.js'
import { resolveRoomSettings } from '../../rooms/room.types.js'

const SPEAKER_RULE_ID = 'speaker-request'
const SPEAKER_RULE_NAME = 'Speaker request'

export const INVITE_REQUEST_KEYWORDS = /invite( me)?|stage|speaker|استیج|اجازه|بالا ببر|برو بالا/i

export const parseAllowList = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )

export interface SpeakerRuleDeps {
  allowList?: ReadonlySet<string>
  actions: ActionIdempotencyStore
}

export const createSpeakerRule = (deps: SpeakerRuleDeps): AutomationRule => {
  const allowList = deps.allowList ?? parseAllowList(process.env.INVITE_ALLOW_LIST)

  return {
    id: SPEAKER_RULE_ID,
    name: SPEAKER_RULE_NAME,
    match: (event: CommunityEvent): boolean => event.type === 'message.created',
    run: async (event: CommunityEvent, context: RuleContext): Promise<AutomationActionResult> => {
      const settings = resolveRoomSettings(context.room.settings)
      if (!settings.autoInviteEnabled) {
        return { ruleId: SPEAKER_RULE_ID, ruleName: SPEAKER_RULE_NAME, action: 'none', success: false }
      }

      const payload = event.payload as MessageCreatedPayload
      if (allowList.size === 0 || !allowList.has(payload.userId)) {
        return { ruleId: SPEAKER_RULE_ID, ruleName: SPEAKER_RULE_NAME, action: 'none', success: false }
      }
      if (!INVITE_REQUEST_KEYWORDS.test(payload.content)) {
        return { ruleId: SPEAKER_RULE_ID, ruleName: SPEAKER_RULE_NAME, action: 'none', success: false }
      }

      const key = buildActionKey(event.id, SPEAKER_RULE_ID, 'speaker_invite')
      const claimed = await deps.actions.claim(event.tenantId, key)
      if (!claimed) {
        return { ruleId: SPEAKER_RULE_ID, ruleName: SPEAKER_RULE_NAME, action: 'none', success: true }
      }

      try {
        await context.inviteSpeaker(payload.userId)
        await deps.actions.markExecuted(event.tenantId, key)
        return {
          ruleId: SPEAKER_RULE_ID,
          ruleName: SPEAKER_RULE_NAME,
          action: 'invite_speaker',
          success: true
        }
      } catch (error) {
        await deps.actions.release(event.tenantId, key)
        throw error
      }
    }
  }
}
