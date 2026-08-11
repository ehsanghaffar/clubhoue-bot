/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import type { AutomationActionResult, AutomationRule, RuleContext } from '../automation.types.js'
import type { CommunityEvent, MessageCreatedPayload } from '../../events/event.types.js'
import { resolveRoomSettings } from '../../rooms/room.types.js'

const SPEAKER_RULE_ID = 'speaker-request'
const SPEAKER_RULE_NAME = 'Speaker request'

/**
 * Legacy invite-request keyword list preserved from the original
 * `ChannelService`: users typing one of these request a stage invite.
 */
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
}

/**
 * Promotes users to the speaker stage when they send an invite-request
 * keyword and are on the allow list, and only when the room's
 * `autoInviteEnabled` setting is on. Keeps an in-session de-dupe set so the
 * same user is not re-invited repeatedly, mirroring the legacy behavior.
 */
export const createSpeakerRule = (deps: SpeakerRuleDeps = {}): AutomationRule => {
  const allowList = deps.allowList ?? parseAllowList(process.env.INVITE_ALLOW_LIST)
  const invitedThisSession = new Set<string>()

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

      const dedupeKey = `${event.roomId}:${payload.userId}`
      if (invitedThisSession.has(dedupeKey)) {
        return { ruleId: SPEAKER_RULE_ID, ruleName: SPEAKER_RULE_NAME, action: 'none', success: false }
      }
      invitedThisSession.add(dedupeKey)

      await context.inviteSpeaker(payload.userId)
      return {
        ruleId: SPEAKER_RULE_ID,
        ruleName: SPEAKER_RULE_NAME,
        action: 'invite_speaker',
        success: true
      }
    }
  }
}
