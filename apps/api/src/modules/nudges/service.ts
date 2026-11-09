// Nudges (FR-NUDGE-02 to 08): recording the nudge a coach just sent from their own phone or computer, and the nudges
// log. Tenure sends nothing itself (FR-NUDGE-05): it records, and hands back the links that open the coach's apps.
import type { Actor, NudgeLogEntry, RecordNudgeRequest, RecordNudgeResponse } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import { nudgeOutcome, shortName, shownNudgeChannel, smsUrl, whatsappUrl } from '@tenure/domain'
import { scopeOf } from '../../platform/auth/scope.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

const DAY_MS = 86_400_000

/**
 * Record a nudge at the context's clock, to a member the actor sees (404 memberNotFound otherwise) from one of the
 * gym's templates, if any (404 templateNotFound otherwise); then publish nudge.recorded with the member's coach.
 */
export async function recordNudge(ctx: AppContext, actor: Actor, gym: Gym, input: RecordNudgeRequest): Promise<RecordNudgeResponse> {
  const result = await ctx.repos.nudges.recordInScope(scopeOf(actor, gym), {
    memberId: input.memberId,
    userId: actor.id,
    templateId: input.templateId ?? null,
    body: input.body,
    channel: input.channel,
    sentAt: ctx.clock().toISOString(),
  })
  if ('missing' in result) throw new ApiError(result.missing === 'member' ? 'memberNotFound' : 'templateNotFound')
  const { nudge, member } = result
  ctx.bus.publish({ type: 'nudge.recorded', gymId: gym.id, memberId: nudge.memberId, coachId: member.coachId })
  return {
    nudge: {
      id: nudge.id,
      memberId: nudge.memberId,
      templateId: nudge.templateId,
      at: nudge.sentAt,
      body: nudge.body,
      channel: input.channel,
    },
    smsUrl: smsUrl(member.phone, nudge.body),
    whatsappUrl: whatsappUrl(member.phone, nudge.body),
  }
}

/**
 * The nudges of the last `days` days, newest first: the gym's for an owner, and for a coach the ones they sent to
 * members who are still theirs. Each with what came of it at the context's clock.
 */
export async function nudgesLog(ctx: AppContext, actor: Actor, gym: Gym, days: number): Promise<NudgeLogEntry[]> {
  const now = ctx.clock()
  const since = new Date(now.getTime() - days * DAY_MS).toISOString()
  const history = await ctx.repos.nudges.history(scopeOf(actor, gym), since)
  const checkinsOf = new Map<number, string[]>()
  for (const c of history.checkins) {
    const ats = checkinsOf.get(c.memberId)
    if (ats) ats.push(c.at)
    else checkinsOf.set(c.memberId, [c.at])
  }
  return history.nudges.map((n) => ({
    id: n.id,
    at: n.sentAt,
    memberId: n.memberId,
    memberName: shortName(n.memberFirstName, n.memberLastName),
    by: n.senderName,
    body: n.body,
    channel: shownNudgeChannel(n.channel),
    outcome: nudgeOutcome(n.sentAt, checkinsOf.get(n.memberId) ?? [], now),
  }))
}
