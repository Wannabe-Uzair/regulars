// The Reports read model (the old GET /api/reports): the cohorts, the visits chart and the nudge figures, from every
// member, check-in and nudge of the gym, in the gym's time zone at the context's clock.
import type { ReportsResponse } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import { buildReports, todayIn } from '@tenure/domain'
import type { AppContext } from '../../platform/context.ts'

/**
 * The gym's reports. Archived members are members still, so their history counts (FR-REPORT-01); a deleted member's
 * rows are gone, and so is their share.
 */
export async function reportsView(ctx: AppContext, gym: Gym): Promise<ReportsResponse> {
  const now = ctx.clock()
  const [members, checkins, nudges] = await Promise.all([
    ctx.repos.members.listByGym(gym.id),
    ctx.repos.checkins.listByGym(gym.id),
    ctx.repos.nudges.listByGym(gym.id),
  ])
  return buildReports({
    today: todayIn(gym.timezone, now),
    now: now.toISOString(),
    timeZone: gym.timezone,
    pilotStartedOn: gym.pilotStartedOn,
    members: members.map((m) => ({ id: m.id, joinedOn: m.joinedOn })),
    checkins: checkins.map((c) => ({ memberId: c.memberId, at: c.at })),
    nudges: nudges.map((n) => ({ memberId: n.memberId, sentAt: n.sentAt })),
  })
}
