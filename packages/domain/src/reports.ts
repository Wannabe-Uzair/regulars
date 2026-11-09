// Report maths (SPEC §4, §6): 30/60/90-day cohort retention, visits by week, and nudges that came back.
// Ported from legacy/app/server/reports/reports.mjs. Dates are 'YYYY-MM-DD' in the gym's time zone.
import { addDays, daysBetween, localDate } from './dates.ts'
import type { CheckinInput, MemberInput, NudgeInput } from './metrics.ts'
import { nudgeOutcome } from './nudges.ts'

export type ReportsInput = {
  /** The gym's local date. */
  today: string
  /** The current instant (ISO). Nudges sent after it are left out; without it none are. */
  now?: string | null
  timeZone: string
  /** The gym's pilot start date; the cohort rows begin no later than its month. */
  pilotStartedOn: string
  members: readonly Pick<MemberInput, 'id' | 'joinedOn'>[]
  checkins: readonly CheckinInput[]
  /** Every nudge, not only the latest per member. */
  nudges: readonly NudgeInput[]
}

/** One joining month. dayN: percent of the members N or more days in who visited in days N-7..N-1; null if none is. */
export type CohortRow = {
  /** 'YYYY-MM'. */
  month: string
  joined: number
  day30: number | null
  day60: number | null
  day90: number | null
}

/**
 * Mean visits in week `week` (1..13) of the members whose week is finished, split by a visit in the last 14 days. Week
 * 13 is days 84 to 89, six days, so its mean is scaled by 7/6 to read as a 7-day week like the others.
 */
export type WeekVisitsRow = {
  week: number
  stillComing: number | null
  slipped: number | null
}

/**
 * Nudges sent in the last 90 days, by the nudges log's three outcomes: the member came back within 7 days, the nudge is
 * still inside its 7 days (waiting), or it is not and no visit followed.
 */
export type NudgeReport = {
  sent: number
  cameBack: number
  waiting: number
  /** Percent of the nudges whose 7 days are over that came back: cameBack / (cameBack + no visit). Null if none is over. */
  rate: number | null
}

/** The line on the visits chart: 3 visits a week, the weekly visits that put a member on the line (SPEC §4). */
export const REPORTS_LINE = 3

export type Reports = {
  /**
   * From the gym's first month (its pilot start or its earliest member's join month, if earlier) to the current month,
   * at most the last four, oldest first.
   */
  cohorts: CohortRow[]
  visitsByWeek: WeekVisitsRow[]
  /** REPORTS_LINE, drawn across the visits chart. */
  line: typeof REPORTS_LINE
  nudges: NudgeReport
}

const RETENTION_DAYS = [30, 60, 90] as const

/** 'YYYY-MM', `n` months before the month of `date`. */
function monthsBack(date: string, n: number): string {
  let y = +date.slice(0, 4)
  let m = +date.slice(5, 7) - n
  while (m < 1) {
    m += 12
    y -= 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/** A 'YYYY-MM' as a month count, to take differences. */
const monthIndex = (month: string): number => +month.slice(0, 4) * 12 + +month.slice(5, 7)

const pct = (num: number, den: number): number => Math.round((100 * num) / den)
const avg1 = (sum: number, n: number, scale = 1): number | null =>
  n === 0 ? null : Math.round(((sum * scale) / n) * 10) / 10

/** Week 13 holds days 84 to 89 only; this makes its mean a 7-day week's. */
const LAST_WEEK_SCALE = 7 / 6

export function buildReports({
  today,
  now,
  timeZone,
  pilotStartedOn,
  members,
  checkins,
  nudges,
}: ReportsInput): Reports {
  // Distinct local check-in dates, and check-in instants, per member.
  const datesByMember = new Map<number, Set<string>>()
  const atsByMember = new Map<number, string[]>()
  for (const c of checkins) {
    const date = localDate(c.at, timeZone)
    const dates = datesByMember.get(c.memberId)
    if (dates) dates.add(date)
    else datesByMember.set(c.memberId, new Set([date]))
    const ats = atsByMember.get(c.memberId)
    if (ats) ats.push(c.at)
    else atsByMember.set(c.memberId, [c.at])
  }

  // The first row is the gym's first month, held to the last four months.
  let first = pilotStartedOn.slice(0, 7)
  for (const m of members) if (m.joinedOn.slice(0, 7) < first) first = m.joinedOn.slice(0, 7)
  const rows = Math.min(Math.max(monthIndex(today.slice(0, 7)) - monthIndex(first) + 1, 1), 4)

  const cohorts = Array.from({ length: rows }, (_, i): CohortRow => {
    const month = monthsBack(today, rows - 1 - i)
    const mine = members.filter((m) => m.joinedOn.slice(0, 7) === month)
    const [day30, day60, day90] = RETENTION_DAYS.map((n) => {
      let reached = 0
      let visited = 0
      for (const m of mine) {
        if (daysBetween(m.joinedOn, today) < n) continue
        reached++
        const dates = datesByMember.get(m.id)
        if (!dates) continue
        for (let d = n - 7; d <= n - 1; d++) {
          if (dates.has(addDays(m.joinedOn, d))) {
            visited++
            break
          }
        }
      }
      return reached === 0 ? null : pct(visited, reached)
    })
    return { month, joined: mine.length, day30: day30 ?? null, day60: day60 ?? null, day90: day90 ?? null }
  })

  const visitsByWeek: WeekVisitsRow[] = []
  for (let week = 1; week <= 13; week++) {
    const start = 7 * (week - 1)
    const end = Math.min(start + 6, 89)
    const still = { visits: 0, members: 0 }
    const slipped = { visits: 0, members: 0 }
    for (const m of members) {
      if (daysBetween(m.joinedOn, today) < end + 1) continue // week not finished
      let count = 0
      let last: string | null = null
      for (const date of datesByMember.get(m.id) ?? []) {
        if (last === null || date > last) last = date
        const day = daysBetween(m.joinedOn, date)
        if (day >= start && day <= end) count++
      }
      const group = last !== null && daysBetween(last, today) <= 13 ? still : slipped
      group.visits += count
      group.members++
    }
    const scale = week === 13 ? LAST_WEEK_SCALE : 1
    visitsByWeek.push({
      week,
      stillComing: avg1(still.visits, still.members, scale),
      slipped: avg1(slipped.visits, slipped.members, scale),
    })
  }

  // Without `now`, the instant is the start of the day after the gym's today (UTC), so nothing sent today is over.
  const nowDate = new Date(now ?? `${addDays(today, 1)}T00:00:00Z`)
  const nowMs = now ? nowDate.getTime() : null
  let sent = 0
  let came = 0
  let waiting = 0
  let noVisit = 0
  for (const n of nudges) {
    if (nowMs !== null && Date.parse(n.sentAt) > nowMs) continue
    const age = daysBetween(localDate(n.sentAt, timeZone), today)
    if (age < 0 || age > 89) continue
    sent++
    const outcome = nudgeOutcome(n.sentAt, atsByMember.get(n.memberId) ?? [], nowDate)
    if (outcome === 'cameBack') came++
    else if (outcome === 'waiting') waiting++
    else noVisit++
  }
  const over = came + noVisit
  return {
    cohorts,
    visitsByWeek,
    line: REPORTS_LINE,
    nudges: { sent, cameBack: came, waiting, rate: over === 0 ? null : pct(came, over) },
  }
}
