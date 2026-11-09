// The Today read model (the old GET /api/today): the KPIs, who is slipping, today's check-ins and the board, from
// repository data plus domain rules.
import type { Actor, TodayResponse } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import { boardOrder, buildSummaries, first90Window, kpis, localDate, shortName, slippingOrder, todayIn } from '@tenure/domain'
import { scopeOf } from '../../platform/auth/scope.ts'
import type { AppContext } from '../../platform/context.ts'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

/** Today for `actor` at the context's clock, in the gym's time zone. */
export async function todayView(ctx: AppContext, actor: Actor, gym: Gym): Promise<TodayResponse> {
  const now = ctx.clock()
  const today = todayIn(gym.timezone, now)
  const scope = scopeOf(actor, gym)
  // Archived members leave the board, Slipping now and the KPIs (FR-MEMBER-05).
  const inputs = await ctx.repos.members.summaryInputs(scope, { joinedOn: first90Window(today), archived: false })
  const list = buildSummaries({ ...inputs, today, timeZone: gym.timezone })
  const nudged = await ctx.repos.nudges.countSentSince(scope, new Date(now.getTime() - 7 * DAY_MS).toISOString())
  // Check-ins of the last 36 hours, kept if their gym-local date is today. The repository returns them newest first.
  const recent = await ctx.repos.checkins.listSince(scope, new Date(now.getTime() - 36 * HOUR_MS).toISOString())
  const notMine = (coachId: number | null) => Number(coachId !== actor.id)
  // The gym's members, for what the scoped reads above don't filter: archived members' check-ins leave Today too
  // (FR-MEMBER-05), and a scope whose members are all archived has none. No repository method counts a scope.
  const gymMembers = await ctx.repos.members.listByGym(gym.id)
  const archived = new Set(gymMembers.filter((m) => m.archivedAt !== null).map((m) => m.id))
  const hasMembers =
    list.length > 0 ||
    gymMembers.some((m) => m.archivedAt === null && (scope.coachId === undefined || m.coachId === scope.coachId))
  return {
    kpis: kpis(list, nudged),
    // The viewer's own members first (an owner who also coaches sees theirs at the top), then the slipping order.
    slipping: list
      .filter((s) => s.status === 'slipping')
      .sort((a, b) => notMine(a.coachId) - notMine(b.coachId) || slippingOrder(a, b)),
    checkinsToday: recent
      .filter((c) => !archived.has(c.memberId) && localDate(c.at, gym.timezone) === today)
      .map((c) => ({ memberId: c.memberId, name: shortName(c.firstName, c.lastName), at: c.at })),
    board: [...list].sort(boardOrder),
    hasMembers,
  }
}
