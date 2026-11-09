// The status rules (SPEC §4) as pure functions: weekly visits, pace, status, member summaries, KPIs, came back.
// Dates are 'YYYY-MM-DD' strings in the gym's time zone; "today" and the time zone are always passed in.
import { daysBetween, localDate } from './dates.ts'

export const WINDOW_DAYS = 90 // days 0..89
export const LAST_WEEK = 12 // week 12 = days 84..89 (6 days)

/** The four status codes. contracts builds its enum from this tuple. */
export const STATUSES = ['on', 'below', 'slipping', 'new'] as const
export type Status = (typeof STATUSES)[number]

/** Is week w finished on day `daysSinceJoin`? (Week 12 is 6 days long, so it finishes at day 90.) */
const isFinished = (w: number, daysSinceJoin: number): boolean => Math.min((w + 1) * 7, WINDOW_DAYS) <= daysSinceJoin

/** Mean of the last (up to) 3 finished weeks, 1 decimal; null with no finished week. */
export function paceOf(finished: readonly number[]): number | null {
  if (finished.length === 0) return null
  const last = finished.slice(-3)
  return Math.round((last.reduce((s, n) => s + n, 0) / last.length) * 10) / 10
}

/** SPEC §4 status, first match wins. `finished` = visit counts of the finished weeks, oldest first. */
export function statusOf(finished: readonly number[]): Status {
  const last = finished.at(-1)
  const prev = finished.at(-2)
  if (last !== undefined && prev !== undefined && last < 2 && prev < 2) return 'slipping'
  if (last === undefined || prev === undefined) return 'new'
  if (last >= 3) return 'on'
  return 'below'
}

export type ProgressInput = {
  joinedOn: string
  /** Check-in instants (ISO strings). */
  checkinAts: readonly string[]
  today: string
  timeZone: string
}

export type Progress = {
  daysSinceJoin: number
  /** The current week, 0..12. */
  week: number
  /** Visit counts for weeks 0..week; the last entry is the current week. */
  weeks: number[]
  /** Visit counts of the finished weeks, oldest first. */
  finished: number[]
  pace: number | null
  status: Status
  lastVisitOn: string | null
  daysSinceLastVisit: number | null
  /** Day indexes (0..89) with a visit, up to today. */
  visitedDays: Set<number>
}

/**
 * A member's progress from their joining date and check-in instants.
 * Several check-ins on one local day count once; check-ins before day 0 or from day 90 on are outside the window.
 */
export function progress({ joinedOn, checkinAts, today, timeZone }: ProgressInput): Progress {
  const daysSinceJoin = daysBetween(joinedOn, today)
  const visitDates = new Set(checkinAts.map((at) => localDate(at, timeZone)))
  const visitedDays = new Set<number>()
  for (const d of visitDates) {
    const day = daysBetween(joinedOn, d)
    if (day >= 0 && day < WINDOW_DAYS && day <= daysSinceJoin) visitedDays.add(day)
  }
  const week = Math.max(0, Math.min(Math.floor(daysSinceJoin / 7), LAST_WEEK))
  const weeks = Array<number>(week + 1).fill(0)
  for (const day of visitedDays) {
    const w = Math.floor(day / 7)
    if (w <= week) weeks[w] = (weeks[w] ?? 0) + 1
  }
  const finished = weeks.filter((_, w) => isFinished(w, daysSinceJoin))
  const lastVisitOn = [...visitDates].sort().at(-1) ?? null
  return {
    daysSinceJoin,
    week,
    weeks,
    finished,
    pace: paceOf(finished),
    status: statusOf(finished),
    lastVisitOn,
    daysSinceLastVisit: lastVisitOn === null ? null : daysBetween(lastVisitOn, today),
    visitedDays,
  }
}

export const inFirst90 = (daysSinceJoin: number): boolean => daysSinceJoin >= 0 && daysSinceJoin < WINDOW_DAYS

/** "Sam O." A missing or blank last name gives the first name alone. */
export function shortName(first: string, last: string | null | undefined): string {
  const initial = last?.trim()[0]
  return initial ? `${first} ${initial.toUpperCase()}.` : first
}

export type MemberInput = {
  id: number
  firstName: string
  lastName: string | null
  phone: string | null
  coachId: number | null
  /** 'YYYY-MM-DD' in the gym's time zone. */
  joinedOn: string
}

export type CheckinInput = {
  memberId: number
  /** ISO instant. */
  at: string
}

export type UserInput = {
  id: number
  name: string
}

/** The latest nudge per member. */
export type NudgeInput = {
  memberId: number
  /** ISO instant. */
  sentAt: string
}

export type SummariesInput = {
  members: readonly MemberInput[]
  checkins: readonly CheckinInput[]
  users: readonly UserInput[]
  lastNudges?: readonly NudgeInput[]
  today: string
  timeZone: string
}

/** SPEC §6 MemberSummary. */
export type MemberSummary = {
  id: number
  firstName: string
  lastName: string
  name: string
  phone: string | null
  coachId: number | null
  coachName: string | null
  joinedOn: string
  daysSinceJoin: number
  week: number
  weeks: number[]
  pace: number | null
  status: Status
  lastVisitOn: string | null
  daysSinceLastVisit: number | null
  lastNudgeAt: string | null
}

/** MemberSummary objects for `members`, from their check-ins, the gym's users and each member's latest nudge. */
export function buildSummaries({ members, checkins, users, lastNudges = [], today, timeZone }: SummariesInput): MemberSummary[] {
  const byMember = new Map<number, string[]>()
  for (const c of checkins) {
    const list = byMember.get(c.memberId)
    if (list) list.push(c.at)
    else byMember.set(c.memberId, [c.at])
  }
  const coachNames = new Map(users.map((u) => [u.id, u.name]))
  const nudgeAt = new Map(lastNudges.map((n) => [n.memberId, n.sentAt]))
  return members.map((m) => {
    const p = progress({ joinedOn: m.joinedOn, checkinAts: byMember.get(m.id) ?? [], today, timeZone })
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName ?? '',
      name: shortName(m.firstName, m.lastName),
      phone: m.phone ?? null,
      coachId: m.coachId ?? null,
      coachName: m.coachId === null ? null : (coachNames.get(m.coachId) ?? null),
      joinedOn: m.joinedOn,
      daysSinceJoin: p.daysSinceJoin,
      week: p.week,
      weeks: p.weeks,
      pace: p.pace,
      status: p.status,
      lastVisitOn: p.lastVisitOn,
      daysSinceLastVisit: p.daysSinceLastVisit,
      lastNudgeAt: nudgeAt.get(m.id) ?? null,
    }
  })
}

export type Kpis = {
  newMembers: number
  /** Percent of members with a finished week who are on the line; null when none has one. */
  onTheLinePct: number | null
  slipping: number
  nudgedThisWeek: number
}

/** Today KPIs from the viewer's first-90-day summaries and their nudge count of the last 7 days. */
export function kpis(summaries: readonly Pick<MemberSummary, 'status' | 'daysSinceJoin'>[], nudgedThisWeek: number): Kpis {
  const rated = summaries.filter((s) => s.daysSinceJoin >= 7) // ≥ 1 finished week
  const on = rated.filter((s) => s.status === 'on').length
  return {
    newMembers: summaries.length,
    onTheLinePct: rated.length ? Math.round((100 * on) / rated.length) : null,
    slipping: summaries.filter((s) => s.status === 'slipping').length,
    nudgedThisWeek,
  }
}

const WEEK_MS = 7 * 86_400_000

/** A nudge "came back" if the member checked in after it was sent and at most 7 days later. */
export function cameBack(sentAt: string, checkinAts: readonly string[]): boolean {
  const t0 = Date.parse(sentAt)
  return checkinAts.some((at) => {
    const t = Date.parse(at)
    return t > t0 && t <= t0 + WEEK_MS
  })
}
