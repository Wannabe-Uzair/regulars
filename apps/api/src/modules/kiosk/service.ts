// The kiosk's use cases (FR-KIOSK-01 to 06). Each starts from the gym its token names; the routes pass the device,
// not Hono's context, as the auth service does.
import type {
  KioskCheckinRequest,
  KioskGymResponse,
  KioskJoinRequest,
  KioskSearchResponse,
  KioskWelcome,
} from '@tenure/contracts'
import { DuplicateError, type Gym, type Member } from '@tenure/db'
import {
  type Country,
  isOpenMarket,
  kioskSearch,
  kioskWelcome,
  nextKioskCoach,
  normalizePhone,
  shortName,
  todayIn,
} from '@tenure/domain'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

const HOUR_MS = 60 * 60 * 1000

/**
 * The gym whose kiosk token this is. Every kiosk request counts toward the device's limit first, a bad token's too
 * (NFR-SEC-03); then an unknown token is `linkInvalid`, a 404 (FR-KIOSK-01).
 */
export async function kioskGym(ctx: AppContext, device: string, token: string): Promise<Gym> {
  if (!(await ctx.rateLimits.kiosk.attempt(device))) throw new ApiError('kioskTooMany')
  const gym = await ctx.repos.gyms.findByKioskToken(token)
  if (!gym) throw new ApiError('linkInvalid')
  return gym
}

/** The gym's country for phones. A gym only ever holds one of the open markets; anything else reads as the US. */
const countryOf = (gym: Gym): Country => (isOpenMarket(gym.country) ? gym.country : 'US')

export const gymCall = (gym: Gym): KioskGymResponse => ({
  gymName: gym.name,
  isDemo: gym.isDemo,
  country: countryOf(gym),
})

/** A typed phone as E.164, read in the gym's country (FR-GLOBAL-02); a number the rule refuses is `phone`. */
function phoneOf(gym: Gym, raw: string): string {
  const phone = normalizePhone(raw, countryOf(gym))
  if (!phone) throw new ApiError('phone')
  return phone
}

/** Archived members are sent to the front desk, and nothing is recorded (FR-KIOSK-06). */
function present(member: Member | undefined, missing: 'memberNotFound' | 'kioskNotFound'): Member {
  if (!member) throw new ApiError(missing)
  if (member.archivedAt !== null) throw new ApiError('memberArchived')
  return member
}

function publishCheckin(ctx: AppContext, member: Member, at: string) {
  ctx.bus.publish({
    type: 'checkin.recorded',
    gymId: member.gymId,
    memberId: member.id,
    coachId: member.coachId,
    name: shortName(member.firstName, member.lastName),
    at,
  })
}

async function welcomeOf(ctx: AppContext, gym: Gym, member: Member, now: Date, joined: boolean): Promise<KioskWelcome> {
  const checkins = await ctx.repos.checkins.listByMember({ gymId: gym.id }, member.id)
  return kioskWelcome({
    firstName: member.firstName,
    joinedOn: member.joinedOn,
    checkinAts: checkins.map((c) => c.at),
    today: todayIn(gym.timezone, now),
    timeZone: gym.timezone,
    joined,
  })
}

/**
 * A check-in by member id (the name search's pick) or by a typed phone (FR-KIOSK-02). A second one within the hour
 * is welcomed but not stored, and publishes nothing (FR-KIOSK-03).
 */
export async function checkIn(ctx: AppContext, gym: Gym, input: KioskCheckinRequest): Promise<KioskWelcome> {
  const scope = { gymId: gym.id }
  const member =
    'memberId' in input
      ? present(await ctx.repos.members.findInScope(scope, input.memberId), 'memberNotFound')
      : present(await ctx.repos.members.findByPhone(gym.id, phoneOf(gym, input.phone)), 'kioskNotFound')
  const now = ctx.clock()
  const checkin = await ctx.repos.checkins.recordAtKiosk({
    gymId: gym.id,
    memberId: member.id,
    at: now.toISOString(),
    unlessSince: new Date(now.getTime() - HOUR_MS).toISOString(),
  })
  if (checkin) publishCheckin(ctx, member, checkin.at)
  // Nothing stored: within the hour, unless the member was archived or deleted since the lookup.
  else present(await ctx.repos.members.findInScope(scope, member.id), 'memberNotFound')
  return welcomeOf(ctx, gym, member, now, false)
}

/** The name search: at most 6 of the gym's members who aren't archived, as "First L." (FR-KIOSK-02). */
export async function search(ctx: AppContext, gym: Gym, q: string): Promise<KioskSearchResponse> {
  return kioskSearch(await ctx.repos.members.listByName(gym.id), q)
}

/** The coach the next walk-in gets: the active coaches in turn, an owner only when no coach is active. */
async function nextCoach(ctx: AppContext, gym: Gym): Promise<number | null> {
  const staff = await ctx.repos.users.listByGym(gym.id)
  const members = await ctx.repos.members.listByGym(gym.id)
  return nextKioskCoach(staff, members.map((m) => m.coachId).reverse())
}

/**
 * A walk-in joins (FR-KIOSK-04): joined today in the gym's zone, checked in, with the next coach in turn. A taken
 * phone is `duplicate`; an archived member's is `memberArchived`, and nothing is written (FR-KIOSK-06). The demo gym
 * stores no phone, so a visitor's number never lands in the sample data (answers.md, 7 Nov).
 */
export async function join(ctx: AppContext, gym: Gym, input: KioskJoinRequest): Promise<KioskWelcome> {
  const phone = input.phone === null || gym.isDemo ? null : phoneOf(gym, input.phone)
  const now = ctx.clock()
  const coachId = await nextCoach(ctx, gym)
  let joined
  try {
    joined = await ctx.repos.members.joinAtKiosk({
      gymId: gym.id,
      firstName: input.firstName,
      lastName: input.lastName,
      phone,
      joinedOn: todayIn(gym.timezone, now),
      at: now.toISOString(),
    })
  } catch (err) {
    if (!(err instanceof DuplicateError && err.field === 'phone' && phone)) throw err
    const holder = await ctx.repos.members.findByPhone(gym.id, phone)
    throw new ApiError(holder?.archivedAt ? 'memberArchived' : 'duplicate')
  }
  const { checkin } = joined
  // The repository's own turn includes owners; set the coach the turn picked before anything is published.
  const member =
    joined.member.coachId === coachId
      ? joined.member
      : ((await ctx.repos.members.update({ gymId: gym.id }, joined.member.id, { coachId })) ?? joined.member)
  ctx.bus.publish({ type: 'member.joined', gymId: gym.id, memberId: member.id, coachId: member.coachId })
  publishCheckin(ctx, member, checkin.at)
  return welcomeOf(ctx, gym, member, now, true)
}
