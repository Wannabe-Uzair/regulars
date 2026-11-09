// The rules of SPEC §4 as pure functions. Dates are 'YYYY-MM-DD' strings in the gym's timezone;
// "today" is always passed in, so tests can pin it.

export const WINDOW_DAYS = 90 // days 0..89
export const LAST_WEEK = 12 // week 12 = days 84..89 (6 days)

const formatters = new Map()
/** Local calendar date of an instant (ISO string or Date) in `timeZone`, as 'YYYY-MM-DD'. */
export function localDate(at, timeZone) {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, f)
  }
  return f.format(at instanceof Date ? at : new Date(at))
}

/** Today's date in the gym's timezone. `now` is a Date. */
export const todayIn = (timeZone, now) => localDate(now, timeZone)

const utcDay = (date) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86400000
/** b − a in whole days (both 'YYYY-MM-DD'). */
export const daysBetween = (a, b) => utcDay(b) - utcDay(a)
export const addDays = (date, n) => new Date((utcDay(date) + n) * 86400000).toISOString().slice(0, 10)

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

/** Is week w finished on day `daysSinceJoin`? (Week 12 is 6 days long, so it finishes at day 90.) */
const isFinished = (w, daysSinceJoin) => Math.min((w + 1) * 7, WINDOW_DAYS) <= daysSinceJoin

/** Mean of the last (up to) 3 finished weeks, 1 decimal; null with no finished week. */
export function paceOf(finished) {
  if (finished.length === 0) return null
  const last = finished.slice(-3)
  return Math.round((last.reduce((s, n) => s + n, 0) / last.length) * 10) / 10
}

/** SPEC §4 status, first match wins. `finished` = visit counts of the finished weeks, oldest first. */
export function statusOf(finished) {
  const n = finished.length
  if (n >= 2 && finished[n - 1] < 2 && finished[n - 2] < 2) return 'slipping'
  if (n < 2) return 'new'
  if (finished[n - 1] >= 3) return 'on'
  return 'below'
}

/**
 * A member's progress from their joining date and check-in instants.
 * Several check-ins on one local day count once; check-ins before day 0 or from day 90 on are outside the window.
 */
export function progress({ joinedOn, checkinAts, today, timeZone }) {
  const daysSinceJoin = daysBetween(joinedOn, today)
  const visitDates = new Set(checkinAts.map((at) => localDate(at, timeZone)))
  const visitedDays = new Set()
  for (const d of visitDates) {
    const day = daysBetween(joinedOn, d)
    if (day >= 0 && day < WINDOW_DAYS && day <= daysSinceJoin) visitedDays.add(day)
  }
  const week = Math.max(0, Math.min(Math.floor(daysSinceJoin / 7), LAST_WEEK))
  const weeks = Array(week + 1).fill(0)
  for (const day of visitedDays) {
    const w = Math.floor(day / 7)
    if (w <= week) weeks[w]++
  }
  const finished = weeks.filter((_, w) => isFinished(w, daysSinceJoin))
  const lastVisitOn = visitDates.size ? [...visitDates].sort().at(-1) : null
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

export const inFirst90 = (daysSinceJoin) => daysSinceJoin >= 0 && daysSinceJoin < WINDOW_DAYS

/** "Sam O." */
export const shortName = (first, last) => (last ? `${first} ${String(last).trim()[0].toUpperCase()}.` : first)

/**
 * MemberSummary objects (SPEC §6) from DB rows.
 * members: rows of `members`; checkins: rows with {member_id, at}; users: rows with {id, name};
 * lastNudges: rows with {member_id, sent_at} (the latest per member).
 */
export function buildSummaries({ members, checkins, users, lastNudges = [], today, timeZone }) {
  const byMember = new Map()
  for (const c of checkins) {
    if (!byMember.has(c.member_id)) byMember.set(c.member_id, [])
    byMember.get(c.member_id).push(c.at)
  }
  const coachNames = new Map(users.map((u) => [u.id, u.name]))
  const nudgeAt = new Map(lastNudges.map((n) => [n.member_id, n.sent_at]))
  return members.map((m) => {
    const p = progress({ joinedOn: m.joined_on, checkinAts: byMember.get(m.id) ?? [], today, timeZone })
    return {
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name ?? '',
      name: shortName(m.first_name, m.last_name),
      phone: m.phone ?? null,
      coachId: m.coach_id ?? null,
      coachName: coachNames.get(m.coach_id) ?? null,
      joinedOn: m.joined_on,
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

/** Today KPIs from the viewer's first-90-day summaries and their nudge count of the last 7 days. */
export function kpis(summaries, nudgedThisWeek) {
  const rated = summaries.filter((s) => s.daysSinceJoin >= 7) // ≥ 1 finished week
  const on = rated.filter((s) => s.status === 'on').length
  return {
    newMembers: summaries.length,
    onTheLinePct: rated.length ? Math.round((100 * on) / rated.length) : null,
    slipping: summaries.filter((s) => s.status === 'slipping').length,
    nudgedThisWeek,
  }
}

const WEEK_MS = 7 * 86400000
/** A nudge "came back" if the member checked in within 7 days after it was sent. */
export function cameBack(sentAt, checkinAts) {
  const t0 = Date.parse(sentAt)
  return checkinAts.some((at) => {
    const t = Date.parse(at)
    return t > t0 && t <= t0 + WEEK_MS
  })
}

/** SPEC §6 order for the board: slipping first, then newest joiners first. */
export function boardOrder(a, b) {
  const sa = a.status === 'slipping' ? 0 : 1
  const sb = b.status === 'slipping' ? 0 : 1
  return sa - sb || (a.joinedOn < b.joinedOn ? 1 : a.joinedOn > b.joinedOn ? -1 : a.id - b.id)
}

/** Slipping list order: most days since last visit first (never visited counts as the most). */
export function slippingOrder(a, b) {
  const da = a.daysSinceLastVisit ?? a.daysSinceJoin + 1
  const db = b.daysSinceLastVisit ?? b.daysSinceJoin + 1
  return db - da || a.id - b.id
}

/** Fill {first} {coach} {gym} {days}. Unknown braces are left as they are. */
export function renderTemplate(body, vars) {
  return body.replace(/\{(first|coach|gym|days)\}/g, (_, k) => String(vars[k] ?? ''))
}
