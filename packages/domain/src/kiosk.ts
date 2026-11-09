// The kiosk's rules (FR-KIOSK-02, FR-KIOSK-05): the welcome after a check-in or a join, and the name search. The
// words stay in copy: the welcome names which line to show, and the web picks the copy ids.
import { addDays, localDate } from './dates.ts'
import { progress, shortName, type Status, WINDOW_DAYS } from './metrics.ts'
import { fold } from './text.ts'

/** The most names the kiosk's search shows. */
export const KIOSK_HITS = 6

/**
 * The welcome's headline: `first` is "Welcome, {first}. Day 1 of 90." (`kiosk.welcome.first`), `back` is "Welcome back,
 * {first}. Week {n}." (`kiosk.welcome.back`) and `plain` is "Welcome back, {first}." from day 90
 * (`kiosk.welcome.plain`).
 */
export const KIOSK_GREETINGS = ['first', 'back', 'plain'] as const
export type KioskGreeting = (typeof KIOSK_GREETINGS)[number]

/**
 * The line under the headline: `line` is "On the line this week." (3 visits or more), `visit` "1 visit this week." and
 * `visits` "{n} visits this week." (0 or 2).
 */
export const KIOSK_VISITS_LINES = ['line', 'visit', 'visits'] as const
export type KioskVisitsLine = (typeof KIOSK_VISITS_LINES)[number]

/** Visits in a week that put a member on the line. */
const ON_THE_LINE = 3

export type KioskWelcomeInput = {
  firstName: string
  /** `YYYY-MM-DD`, in the gym's time zone. */
  joinedOn: string
  /** Every check-in of the member, as ISO instants, in any order. */
  checkinAts: readonly string[]
  /** The gym's local date. */
  today: string
  timeZone: string
  /** True for the answer to a join at the kiosk: always the first visit. */
  joined: boolean
}

export type KioskWelcome = {
  firstName: string
  greeting: KioskGreeting
  /** The current week, 0 to 12, as the board counts it. */
  week: number
  /** The n of "Week {n}": the week counted from 1, so 1 to 13. */
  weekNumber: number
  /** Days since joining: 0 on the join day, negative for a join date after today. */
  day: number
  /** The distinct gym-local days with a visit in the member's current 7-day block, today included. */
  visitsThisWeek: number
  visitsLine: KioskVisitsLine
  status: Status
}

/**
 * What the kiosk's welcome says, from the member's join date and check-ins (the old kiosk's maths). The first visit
 * is a join's answer, or a check-in on the join day that is the member's only one, so a member added by staff or
 * imported is welcomed as new too (edge case KS12, COPY.md's "First visit (day 0)"); the old kiosk said "back" there.
 * From day 90 the week is dropped; otherwise it is the member's week.
 */
export function kioskWelcome(input: KioskWelcomeInput): KioskWelcome {
  const { firstName, joinedOn, checkinAts, today, timeZone, joined } = input
  const p = progress({ joinedOn, checkinAts, today, timeZone })
  const day = p.daysSinceJoin
  const firstVisit = joined || (day === 0 && checkinAts.length === 1)
  const weekStart = addDays(joinedOn, Math.floor(day / 7) * 7)
  const visitsThisWeek = new Set(
    checkinAts.map((at) => localDate(at, timeZone)).filter((d) => d >= weekStart && d <= today),
  ).size
  return {
    firstName,
    greeting: firstVisit ? 'first' : day >= WINDOW_DAYS ? 'plain' : 'back',
    week: p.week,
    weekNumber: p.week + 1,
    day,
    visitsThisWeek,
    visitsLine: visitsThisWeek >= ON_THE_LINE ? 'line' : visitsThisWeek === 1 ? 'visit' : 'visits',
    status: p.status,
  }
}

/** A member as the search needs them; a db Member fits. */
export type KioskSearchMember = { id: number; firstName: string; lastName: string | null }

/** A search hit: only the first name and the last initial leave the server. */
export type KioskSearchHit = { memberId: number; name: string }

/** Folded, trimmed, with each run of spaces as one. */
const searchKey = (text: string) => fold(text).trim().replace(/\s+/g, ' ')

/**
 * The kiosk's name search: the members whose first name, or whose "First L.", starts with `q`, folding case, accents
 * and spacing ("jose" finds José, "maya r" finds Maya R.). A last name alone finds nobody. The members' order is kept,
 * cut to KIOSK_HITS. An empty query finds nobody.
 */
export function kioskSearch(members: readonly KioskSearchMember[], q: string): KioskSearchHit[] {
  const query = searchKey(q)
  if (!query) return []
  const hits: KioskSearchHit[] = []
  for (const m of members) {
    const name = shortName(m.firstName, m.lastName)
    if (searchKey(name).startsWith(query) || searchKey(m.firstName).startsWith(query)) {
      hits.push({ memberId: m.id, name })
      if (hits.length === KIOSK_HITS) break
    }
  }
  return hits
}

/** A member of staff as the kiosk's coach turn needs them; a db User fits. */
export type KioskStaff = { id: number; role: 'owner' | 'coach'; active: boolean }

/**
 * Who coaches the next walk-in (FR-KIOSK-04, answers.md 7 Nov "Coach turn: coaches only"): the active coaches take
 * turns by id, wrapping round, so the next is the first after the coach of the newest member a coach was given. A
 * member given to an owner by hand doesn't move the turn, and a coach who has gone since keeps their place in it.
 * Only a gym with no active coach gives walk-ins to its active owners, in the same way. Null when no one is active.
 *
 * `staff` is every member of staff, inactive ones included; `coachIdsNewestFirst` is each member's coach, newest
 * member first.
 */
export function nextKioskCoach(
  staff: readonly KioskStaff[],
  coachIdsNewestFirst: Iterable<number | null>,
): number | null {
  const role = staff.some((s) => s.active && s.role === 'coach') ? 'coach' : 'owner'
  const turn = staff
    .filter((s) => s.active && s.role === role)
    .map((s) => s.id)
    .sort((a, b) => a - b)
  const inRole = new Set(staff.filter((s) => s.role === role).map((s) => s.id))
  let last: number | undefined
  for (const id of coachIdsNewestFirst) {
    if (id !== null && inRole.has(id)) {
      last = id
      break
    }
  }
  return turn.find((id) => last !== undefined && id > last) ?? turn[0] ?? null
}
