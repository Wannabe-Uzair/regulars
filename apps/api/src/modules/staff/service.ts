// Staff: the owner's list with each person's counts, and deactivating or reactivating someone.
import type { CoachesResponse, CoachPatchResponse, StaffMember } from '@tenure/contracts'
import type { Gym, User } from '@tenure/db'
import { addDays, buildSummaries, todayIn, WINDOW_DAYS } from '@tenure/domain'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

const person = (u: User): CoachPatchResponse => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active })

/**
 * Everyone on the gym's staff, active or not (owners first, then by name, then by id), each with their members in
 * the first 90 days, as the board counts them, and how many of those are slipping.
 */
export async function staffList(ctx: AppContext, gym: Gym): Promise<CoachesResponse> {
  const today = todayIn(gym.timezone, ctx.clock())
  const inputs = await ctx.repos.members.summaryInputs(
    { gymId: gym.id },
    { joinedOn: { from: addDays(today, -(WINDOW_DAYS - 1)), to: today } },
  )
  // An archived member leaves every list (answers.md, round 3), the staff counts included.
  const members = inputs.members.filter((m) => m.archivedAt === null)
  const summaries = buildSummaries({ ...inputs, members, today, timeZone: gym.timezone })
  const staff = (await ctx.repos.users.listByGym(gym.id)).map((u): StaffMember => {
    const mine = summaries.filter((s) => s.coachId === u.id)
    return { ...person(u), members: mine.length, slipping: mine.filter((s) => s.status === 'slipping').length }
  })
  return { staff }
}

/**
 * Deactivate (`active: false`) or reactivate someone on the gym's staff. Deactivating ends all their sessions, and
 * with them their live stream: the realtime module re-checks the session on the staff.updated this publishes. Their
 * members, check-ins and nudges stay. The gym's last active owner can't be deactivated.
 */
export async function setStaffActive(
  ctx: AppContext,
  gym: Gym,
  userId: number,
  active: boolean,
): Promise<CoachPatchResponse> {
  const user = await ctx.repos.users.setActiveKeepingAnOwner(gym.id, userId, active)
  if (user === undefined) throw new ApiError('coachNotFound')
  if (user === 'lastOwner') throw new ApiError('ownerActive')
  ctx.bus.publish({ type: 'staff.updated', gymId: gym.id })
  return person(user)
}
