// Members: the lists by view, the member page, edits, add, archive, restore and permanent delete. Every read and
// write is held to the actor's gym, and a coach's to their own members: anyone else's is not found (FR-PRIV-02,
// FR-STAFF-07). Each write publishes its event after it succeeds (FR-LIVE-01).
import type {
  Actor,
  MemberCreateRequest,
  MemberDetailResponse,
  MemberPageNudge,
  MemberPatchRequest,
  MembersResponse,
  MemberView,
} from '@tenure/contracts'
import { DuplicateError, type Gym, type Member, type NudgeWithSender, type Scope } from '@tenure/db'
import {
  buildSummaries,
  byMemberName,
  cameBack,
  type Country,
  first90Window,
  joinedByToday,
  localeFor,
  memberDays,
  normalizePhone,
  shownNudgeChannel,
  todayIn,
} from '@tenure/domain'
import { scopeOf } from '../../platform/auth/scope.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

/** The gym's country: an ISO code that sign-up and Settings check before it is stored. */
const countryOf = (gym: Gym) => gym.country as Country

const today = (ctx: AppContext, gym: Gym) => todayIn(gym.timezone, ctx.clock())

/** The member if the scope may see them, archived or not; else 404 memberNotFound. */
async function memberIn(ctx: AppContext, scope: Scope, id: number): Promise<Member> {
  const member = await ctx.repos.members.findInScope(scope, id)
  if (!member) throw new ApiError('memberNotFound')
  return member
}

/** A coach choice: none, or the gym's active staff (owners included); else 400 coachChoice. */
async function checkCoach(ctx: AppContext, gym: Gym, coachId: number | null): Promise<void> {
  if (coachId === null) return
  const coach = await ctx.repos.users.findInGym(gym.id, coachId)
  if (!coach?.active) throw new ApiError('coachChoice')
}

/** A typed phone read in the gym's country, as E.164; blank or null is none. Unreadable: 400 phone. */
function readPhone(gym: Gym, typed: string | null): string | null {
  if (typed === null || typed.trim() === '') return null
  const phone = normalizePhone(typed, countryOf(gym))
  if (!phone) throw new ApiError('phone')
  return phone
}

/** A write that may clash on the phone: a clash is 409 duplicate, and nothing was written. */
async function guardPhone<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write()
  } catch (err) {
    if (err instanceof DuplicateError) throw new ApiError('duplicate')
    throw err
  }
}

const memberEvent = (type: 'member.joined' | 'member.updated' | 'member.deleted', member: Member) =>
  ({ type, gymId: member.gymId, memberId: member.id, coachId: member.coachId }) as const

const channelOf = (nudge: NudgeWithSender): MemberPageNudge['channel'] => shownNudgeChannel(nudge.channel)

/** The view's members, by name in the gym's locale (FR-MEM-01, FR-MEM-04). Archived members are only in Archived. */
export async function listMembers(ctx: AppContext, actor: Actor, gym: Gym, view: MemberView): Promise<MembersResponse> {
  const day = today(ctx, gym)
  const inputs = await ctx.repos.members.summaryInputs(scopeOf(actor, gym), {
    archived: view === 'archived',
    ...(view === 'first90' ? { joinedOn: first90Window(day) } : {}),
  })
  const members = buildSummaries({ ...inputs, today: day, timeZone: gym.timezone })
  return { members: members.sort(byMemberName(localeFor(countryOf(gym)))) }
}

/** The member page for a member the scope may see (FR-MEMBER-01). */
async function pageOf(ctx: AppContext, scope: Scope, gym: Gym, member: Member): Promise<MemberDetailResponse> {
  const day = today(ctx, gym)
  const inputs = await ctx.repos.members.summaryInputs(scope, { ids: [member.id] })
  const [summary] = buildSummaries({ ...inputs, today: day, timeZone: gym.timezone })
  if (!summary) throw new ApiError('memberNotFound')
  const checkins = await ctx.repos.checkins.listByMember(scope, member.id)
  const nudges = await ctx.repos.nudges.listByMember(scope, member.id)
  const checkinAts = checkins.map((c) => c.at)
  return {
    member: { ...summary, email: member.email, source: member.source, archivedAt: member.archivedAt },
    days: memberDays({ joinedOn: member.joinedOn, checkinAts, today: day, timeZone: gym.timezone }),
    checkins: checkins.map((c) => ({ at: c.at, source: c.source })),
    nudges: nudges.map((n) => ({
      id: n.id,
      at: n.sentAt,
      by: n.senderName,
      body: n.body,
      channel: channelOf(n),
      cameBack: cameBack(n.sentAt, checkinAts),
    })),
  }
}

export async function memberPage(ctx: AppContext, actor: Actor, gym: Gym, id: number): Promise<MemberDetailResponse> {
  const scope = scopeOf(actor, gym)
  return pageOf(ctx, scope, gym, await memberIn(ctx, scope, id))
}

/**
 * An owner's edit (FR-MEMBER-02): the name, the coach and the phone, only the fields sent. Every field is checked
 * before any is written, and the write is one statement, so a refused change saves nothing. A coach change reaches
 * the old coach and the new one (FR-LIVE-02).
 */
export async function patchMember(
  ctx: AppContext,
  actor: Actor,
  gym: Gym,
  id: number,
  input: MemberPatchRequest,
): Promise<MemberDetailResponse> {
  const scope = scopeOf(actor, gym)
  const before = await memberIn(ctx, scope, id)
  if (input.coachId !== undefined) await checkCoach(ctx, gym, input.coachId)
  const phone = input.phone === undefined ? undefined : readPhone(gym, input.phone)
  const patch = { firstName: input.firstName, lastName: input.lastName, coachId: input.coachId, phone }
  if (Object.values(patch).every((v) => v === undefined)) return pageOf(ctx, scope, gym, before)
  const after = await guardPhone(() => ctx.repos.members.update(scope, id, patch))
  if (!after) throw new ApiError('memberNotFound')
  if (after.coachId !== before.coachId) ctx.bus.publish(memberEvent('member.updated', before))
  ctx.bus.publish(memberEvent('member.updated', after))
  return pageOf(ctx, scope, gym, after)
}

/**
 * A member added by hand (FR-MEM-05), by an owner or a coach. A coach's new member is theirs, whatever coachId says;
 * an owner's has the coach given (the gym's active staff) or none. The join date is today or earlier in the gym.
 */
export async function addMember(ctx: AppContext, actor: Actor, gym: Gym, input: MemberCreateRequest): Promise<MemberDetailResponse> {
  if (!joinedByToday(input.joinedOn, today(ctx, gym))) throw new ApiError('joinedOn')
  const coachId = actor.role === 'coach' ? actor.id : (input.coachId ?? null)
  if (actor.role === 'owner') await checkCoach(ctx, gym, coachId)
  const phone = readPhone(gym, input.phone ?? null)
  const member = await guardPhone(() =>
    ctx.repos.members.create({
      gymId: gym.id,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      phone,
      joinedOn: input.joinedOn,
      coachId,
      createdAt: ctx.clock().toISOString(),
    }),
  )
  ctx.bus.publish(memberEvent('member.joined', member))
  return pageOf(ctx, scopeOf(actor, gym), gym, member)
}

/**
 * Archive (FR-MEMBER-05) or restore (FR-MEMBER-06): owners any member, coaches their own. A repeat (a double tap, a
 * stale page) answers the member as they are and publishes nothing; archived_at keeps the first time.
 */
export async function setArchived(ctx: AppContext, actor: Actor, gym: Gym, id: number, archived: boolean): Promise<MemberDetailResponse> {
  const scope = scopeOf(actor, gym)
  const result = await ctx.repos.members.setArchived(scope, id, archived ? ctx.clock().toISOString() : null)
  if (!result) throw new ApiError('memberNotFound')
  if (result.changed) ctx.bus.publish(memberEvent('member.updated', result.member))
  return pageOf(ctx, scope, gym, result.member)
}

/**
 * An owner deletes an archived member for good, with their check-ins and nudges (FR-MEMBER-07, FR-PRIV-03). A member
 * who isn't archived is 409 memberNotArchived. The event carries the coach the member had.
 */
export async function deleteMember(ctx: AppContext, actor: Actor, gym: Gym, id: number): Promise<void> {
  const scope = scopeOf(actor, gym)
  const member = await memberIn(ctx, scope, id)
  if (member.archivedAt === null) throw new ApiError('memberNotArchived')
  // Undefined if they were restored since the read: still not archived.
  const deleted = await ctx.repos.members.deleteArchived(scope, id)
  if (!deleted) throw new ApiError('memberNotArchived')
  ctx.bus.publish(memberEvent('member.deleted', deleted))
}
