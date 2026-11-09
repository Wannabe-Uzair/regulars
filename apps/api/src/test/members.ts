// Members whose check-ins follow given weekly patterns, written through the repositories, as the old server's
// fixtures added them. With the old kit's four sample members.
import { addDays } from '@tenure/domain'
import { TODAY, type World } from './world.ts'

/** 18:00Z is noon (CST) or 1 pm (CDT) in Chicago: always the same local date. */
export const localNoon = (date: string) => `${date}T18:00:00.000Z`

export type MemberPattern = {
  first: string
  /** Default 'Test'; null stores no last name (a single name, as "Leo"). */
  last?: string | null
  /**
   * Default the next of the helper's own numbers, from +13125550100 upward; null stores no phone. A fixed E.164
   * number is stored as given: keep it below +13125550100, so it can't meet the sequence.
   */
  phone?: string | null
  /** Default the owner. */
  coachId?: number | null
  /** Joined this many days before TODAY. */
  daysSinceJoin: number
  /** The finished weeks' visit counts: visits on the first k days of each week. */
  weeks?: readonly number[]
  /** Visits so far in the current week. */
  current?: number
}

let phoneSeq = 100

/** Add a member (source 'csv') and their check-ins at local noon; the member's id. */
export async function addMember(w: World, m: MemberPattern): Promise<number> {
  const { first, last = 'Test', coachId = w.owner.id, daysSinceJoin, weeks = [], current = 0 } = m
  const joinedOn = addDays(TODAY, -daysSinceJoin)
  const at = w.ctx.clock().toISOString()
  // The sequence moves on only when it is used.
  const phone = m.phone === undefined ? `+1312555${String(phoneSeq++).padStart(4, '0')}` : m.phone
  const { created } = await w.ctx.repos.members.applyImport({
    gymId: w.gym.id,
    at,
    creates: [{ firstName: first, lastName: last, phone, email: null, joinedOn, coachId, externalId: null }],
    updates: [],
    checkins: [],
  })
  const id = created[0]?.id
  if (id === undefined) throw new Error(`fixture: could not add ${first}`)
  const days: number[] = []
  weeks.forEach((k, wk) => {
    for (let i = 0; i < k; i++) days.push(wk * 7 + i)
  })
  for (let i = 0; i < current; i++) days.push(Math.floor(daysSinceJoin / 7) * 7 + i)
  for (const day of days) if (day > daysSinceJoin) throw new Error(`fixture: day ${day} is after today for ${first}`)
  const checkins = days.map((day) => ({ memberId: id, at: localNoon(addDays(joinedOn, day)) }))
  await w.ctx.repos.members.applyImport({ gymId: w.gym.id, at, creates: [], updates: [], checkins })
  return id
}

/** The expo kit's sample members (SPEC §8): finished weeks plus a partial current week. */
export const KIT = {
  maya: { first: 'Maya', last: 'Reyes', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3], daysSinceJoin: 66, current: 2 },
  chris: { first: 'Chris', last: 'Lee', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2], daysSinceJoin: 80, current: 1 },
  hana: { first: 'Hana', last: 'Lin', weeks: [3, 2, 2, 1, 1, 0], daysSinceJoin: 45, current: 1 },
  sam: { first: 'Sam', last: 'Ortiz', weeks: [2, 1, 0], daysSinceJoin: 24, current: 1 },
} satisfies Record<string, MemberPattern>
